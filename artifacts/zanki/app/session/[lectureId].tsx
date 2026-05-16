import { prepareSessionCards } from "@/lib/sessionLogic";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, FadeInDown, interpolate, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CardLoadingScreen } from "@/components/CardLoadingScreen";
import { CardResultsView } from "@/components/CardResultsView";
import { RatingButton } from "@/components/RatingButton";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useFlashcards } from "@/hooks/useCards";
import { supabase } from "@/lib/supabase";
import { enqueueCardSession } from "@/lib/offlineQueue";
import type { CardRating, Flashcard, RatedCard, UserCard } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { useUserCards } from "@/hooks/useUserCards";
import { calculateSM2, formatInterval, getNextReviewDate } from "@/lib/srs";

export default function SessionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { lectureId, lectureName } = useLocalSearchParams<{ lectureId: string; lectureName?: string }>();
  const { data: allCards, isLoading, error } = useFlashcards(lectureId);
  const { data: userCards } = useUserCards(user?.id);
  const queryClient = useQueryClient();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  // ── State ───────────────────────────────────────────────────────────────
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [sessionRatings, setSessionRatings] = useState<Record<string, CardRating>>({});
  const [isFlipped, setIsFlipped] = useState(false);
  const [finished, setFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);
  const flipProgress = useSharedValue(0);

  const initialCards = useMemo(() => {
    if (!allCards) return undefined;
    return prepareSessionCards(allCards, userCards ?? [], { 
      mode: "study", 
      shuffle: false 
    });
  }, [allCards, userCards]);

  // Initialize queue
  React.useEffect(() => {
    if (initialCards && queue.length === 0 && !finished && Object.keys(sessionRatings).length === 0) {
      setQueue(initialCards);
    }
  }, [initialCards]);

  const totalCards = initialCards?.length ?? 0;
  const currentCard: Flashcard | undefined = queue[0];
  const completedCount = Object.keys(sessionRatings).length;

  // ── Flip animation ──────────────────────────────────────────────────────
  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${interpolate(flipProgress.value, [0, 1], [0, 180])}deg` }],
    backfaceVisibility: "hidden" as const,
    opacity: flipProgress.value > 0.5 ? 0 : 1,
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${interpolate(flipProgress.value, [0, 1], [180, 360])}deg` }],
    backfaceVisibility: "hidden" as const,
    opacity: flipProgress.value > 0.5 ? 1 : 0,
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: withSpring(`${(completedCount / totalCards) * 100}%`, { damping: 20 })
  }));

  const previews = useMemo(() => {
    if (!currentCard) return null;
    const state = userCards?.find(uc => uc.card_id === currentCard.id);
    const baseState = state ? { 
      interval: state.interval, 
      repetition: state.repetition, 
      easeFactor: state.ease_factor 
    } : undefined;

    return {
      again: formatInterval(calculateSM2("again", baseState).interval),
      hard: formatInterval(calculateSM2("hard", baseState).interval),
      good: formatInterval(calculateSM2("good", baseState).interval),
    };
  }, [currentCard, userCards]);

  const handleFlip = useCallback(() => {
    if (isFlipped) return;
    setIsFlipped(true);
    flipProgress.value = withSpring(1, { damping: 18, stiffness: 140 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [isFlipped, flipProgress]);

  // ── Rate & advance ──────────────────────────────────────────────────────
  const handleRate = useCallback(async (rating: CardRating) => {
    if (!currentCard) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Track first rating for statistics
    const newSessionRatings = { ...sessionRatings };
    if (!newSessionRatings[currentCard.id]) {
      newSessionRatings[currentCard.id] = rating;
      setSessionRatings(newSessionRatings);
    }

    const nextQueue = [...queue.slice(1)];
    
    if (rating === "again") {
      // Re-insert card later in the queue (e.g. 3 positions away or at end)
      const insertAt = Math.min(nextQueue.length, 3);
      nextQueue.splice(insertAt, 0, currentCard);
      setQueue(nextQueue);
    } else {
      setQueue(nextQueue);
    }

    if (nextQueue.length === 0) {
      setFinished(true);
      await finishSession(newSessionRatings);
    } else {
      setIsFlipped(false);
      flipProgress.value = 0;
    }
  }, [currentCard, queue, sessionRatings, flipProgress, initialCards]);

  // ── Finish session ──────────────────────────────────────────────────────
  const finishSession = useCallback(async (finalRatings: Record<string, CardRating>) => {
    if (!user?.id || !lectureId) return;
    setSubmitting(true);

    const ratingEntries = Object.entries(finalRatings);
    const againCount = ratingEntries.filter(([, r]) => r === "again").length;
    const hardCount = ratingEntries.filter(([, r]) => r === "hard").length;
    const goodCount = ratingEntries.filter(([, r]) => r === "good").length;
    const total = ratingEntries.length;
    const masteryRate = total > 0 ? Math.round((goodCount / total) * 100) : 0;

    const payload = {
      user_id: user.id,
      lecture_id: lectureId,
      lecture_name: lectureName ?? "",
      total_cards: total,
      again_count: againCount,
      hard_count: hardCount,
      good_count: goodCount,
      mastery_rate: masteryRate,
      created_at: new Date().toISOString(),
    };

    // Calculate SRS states for all rated cards
    const updatedUserCards: Partial<UserCard>[] = ratingEntries.map(([cardId, rating]) => {
      const currentState = userCards?.find(uc => uc.card_id === cardId);
      const sm2State = calculateSM2(rating, currentState ? {
        interval: currentState.interval,
        repetition: currentState.repetition,
        easeFactor: currentState.ease_factor
      } : undefined);
      
      const nextReviewDate = getNextReviewDate(sm2State.interval);

      return {
        card_id: cardId,
        interval: sm2State.interval,
        repetition: sm2State.repetition,
        ease_factor: sm2State.easeFactor,
        next_review: nextReviewDate.toISOString(),
      };
    });

    try {
      const { error: insertErr } = await supabase.from("card_sessions").insert(payload);
      if (insertErr) throw insertErr;

      if (updatedUserCards.length > 0) {
        const { error: cardsErr } = await supabase.from("user_cards").upsert(
          updatedUserCards.map(c => ({
            ...c,
            user_id: user.id,
            updated_at: new Date().toISOString()
          })),
          { onConflict: 'user_id,card_id' }
        );
        if (cardsErr) console.error("Failed to sync user_cards", cardsErr);
      }
      
      // Invalidate caches so UI updates immediately
      queryClient.invalidateQueries({ queryKey: ["stats", user.id] });
      queryClient.invalidateQueries({ queryKey: ["progress", user.id] });
      queryClient.invalidateQueries({ queryKey: ["user_cards", user.id] });
    } catch {
      await enqueueCardSession({
        lectureId,
        lectureName: lectureName ?? "",
        userId: user.id,
        totalCards: total,
        againCount,
        hardCount,
        goodCount,
        masteryRate,
        createdAt: payload.created_at,
        userCards: updatedUserCards,
      });
      setSavedOffline(true);
    }

    setSubmitting(false);
  }, [user, lectureId, lectureName]);


  const handleRetry = useCallback(() => {
    if (initialCards) {
      setQueue(initialCards);
    }
    setIsFlipped(false);
    setSessionRatings({});
    setFinished(false);
    setSavedOffline(false);
    flipProgress.value = 0;
  }, [initialCards, flipProgress]);

  const handleHome = useCallback(() => {
    router.back();
  }, []);

  // ── Loading ─────────────────────────────────────────────────────────────
  if (isLoading) return <CardLoadingScreen lectureName={lectureName} />;

  // ── Error ───────────────────────────────────────────────────────────────
  if (error) {
    return (
      <View style={[st.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={48} color={colors.destructive} />
        <Text style={[st.errTitle, { color: colors.foreground }]}>Failed to load cards</Text>
        <Text style={[st.errMsg, { color: colors.mutedForeground }]}>{(error as Error).message}</Text>
        <TouchableOpacity style={[st.retryBtn, { backgroundColor: colors.primary }]} onPress={handleHome}>
          <Text style={st.retryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Empty ───────────────────────────────────────────────────────────────
  if (!initialCards || initialCards.length === 0) {
    return (
      <View style={[st.center, { backgroundColor: colors.background }]}>
        <Feather name="check-circle" size={48} color={colors.success} />
        <Text style={[st.errTitle, { color: colors.foreground }]}>You're all caught up!</Text>
        <Text style={[st.errMsg, { color: colors.mutedForeground }]}>There are no due cards in this lecture right now. Great job!</Text>
        <TouchableOpacity style={[st.retryBtn, { backgroundColor: colors.primary }]} onPress={handleHome}>
          <Text style={st.retryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }


  // ── Results ─────────────────────────────────────────────────────────────
  if (finished) {
    const ratingEntries = Object.values(sessionRatings);
    const goodCount = ratingEntries.filter((r) => r === "good").length;
    const hardCount = ratingEntries.filter((r) => r === "hard").length;
    const totalCount = Object.keys(sessionRatings).length;
    const masteryRate = totalCount > 0 ? Math.round((goodCount / totalCount) * 100) : 0;

    return (
      <CardResultsView
        masteryRate={masteryRate}
        againCount={ratingEntries.filter((r) => r === "again").length}
        hardCount={hardCount}
        goodCount={goodCount}
        totalCount={totalCount}
        lectureName={lectureName}
        xpGained={hardCount * 5 + goodCount * 10}
        graduatedCount={goodCount + hardCount}
        onRetry={handleRetry}
        onHome={handleHome}
      />
    );
  }

  // ── Active session ──────────────────────────────────────────────────────
  return (
    <View style={[st.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[st.header, { paddingTop: topPad + 10 }]}>
        <TouchableOpacity onPress={handleHome} style={[st.backBtn, { backgroundColor: colors.muted }]} activeOpacity={0.75}>
          <Feather name="x" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <View style={st.headerCenter}>
          <Text style={[st.progressText, { color: colors.foreground }]}>{completedCount} / {totalCards}</Text>
          {lectureName && <Text style={[st.lecName, { color: colors.mutedForeground }]} numberOfLines={1}>{lectureName}</Text>}
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* Progress bar */}
      <View style={st.progressTrack}>
        <Animated.View 
          style={[
            st.progressFill, 
            { backgroundColor: colors.primary }, 
            progressStyle
          ]} 
        />
      </View>

      {/* Card */}
      <View style={st.cardArea}>
        <TouchableOpacity onPress={handleFlip} activeOpacity={0.95} style={st.flipTouch} disabled={isFlipped}>
          {/* Front face */}
          <Animated.View style={[st.face, { backgroundColor: colors.card, borderColor: colors.border }, frontStyle]}>
            <View style={st.cardHeader}>
              <View style={[st.faceBadge, { backgroundColor: colors.primary + "12" }]}>
                <Text style={[st.faceBadgeText, { color: colors.primary }]}>FRONT</Text>
              </View>
              {currentCard?.hint && (
                <View style={st.hintBadge}>
                  <Feather name="help-circle" size={12} color={colors.mutedForeground} />
                  <Text style={[st.hintText, { color: colors.mutedForeground }]}>{currentCard.hint}</Text>
                </View>
              )}
            </View>
            
            <View style={st.cardContent}>
              <Text style={[st.faceText, { color: colors.foreground }]}>{currentCard?.front}</Text>
            </View>

            {!isFlipped && (
              <Animated.View entering={FadeIn.delay(400)} style={[st.tapHint, { backgroundColor: colors.muted + "40" }]}>
                <Feather name="zap" size={13} color={colors.primary} />
                <Text style={[st.tapHintText, { color: colors.foreground }]}>TAP TO REVEAL</Text>
              </Animated.View>
            )}
          </Animated.View>

          {/* Back face */}
          <Animated.View style={[st.face, st.faceBack, { backgroundColor: colors.card, borderColor: colors.primary + "20" }, backStyle]}>
            <View style={st.cardHeader}>
              <View style={[st.faceBadge, { backgroundColor: colors.success + "12" }]}>
                <Text style={[st.faceBadgeText, { color: colors.success }]}>ANSWER</Text>
              </View>
            </View>
            
            <View style={st.cardContent}>
              <Text style={[st.faceText, { color: colors.foreground }]}>{currentCard?.back}</Text>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Rating buttons — only visible after flip */}
      {isFlipped && (
        <Animated.View entering={FadeInDown.duration(350).springify()} style={st.ratingRow}>
          <RatingButton 
            rating="again" 
            onPress={() => handleRate("again")} 
            interval={previews?.again}
          />
          <RatingButton 
            rating="hard" 
            onPress={() => handleRate("hard")} 
            interval={previews?.hard}
          />
          <RatingButton 
            rating="good" 
            onPress={() => handleRate("good")} 
            interval={previews?.good}
          />
        </Animated.View>
      )}

      {!isFlipped && <View style={st.ratingPlaceholder} />}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 32 },
  errTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  errMsg: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  retryText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8, gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  progressText: { fontSize: 18, fontFamily: "Nunito_800ExtraBold", letterSpacing: -0.5 },
  lecName: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1, maxWidth: 200 },

  progressBar: { height: 4, marginHorizontal: 20, borderRadius: 2, overflow: "hidden" },
  progressTrack: { height: 6, marginHorizontal: 24, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.05)", overflow: "hidden", marginBottom: 8 },
  progressFill: { height: "100%", borderRadius: 3 },

  cardArea: { flex: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 16 },
  flipTouch: { flex: 1, maxHeight: 440 },

  face: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 32, borderWidth: 1, padding: 24, backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 4 },
  faceBack: { position: "absolute" },

  cardHeader: { width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center", position: "absolute", top: 24, left: 24, right: 24 },
  cardContent: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 12 },

  faceBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  faceBadgeText: { fontSize: 11, fontFamily: "Inter_800ExtraBold", letterSpacing: 1 },

  hintBadge: { flexDirection: "row", alignItems: "center", gap: 6, opacity: 0.8 },
  faceText: { fontSize: 22, fontFamily: "Nunito_800ExtraBold", textAlign: "center", lineHeight: 32, letterSpacing: -0.5 },
  hintText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  tapHint: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, position: "absolute", bottom: 24 },
  tapHintText: { fontSize: 11, fontFamily: "Inter_800ExtraBold", letterSpacing: 0.5 },

  ratingRow: { flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingBottom: 32 },
  ratingPlaceholder: { height: 120, paddingBottom: 32 },
});
