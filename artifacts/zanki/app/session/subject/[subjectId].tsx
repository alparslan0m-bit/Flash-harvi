import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CardLoadingScreen } from "@/components/CardLoadingScreen";
import { CardResultsView } from "@/components/CardResultsView";
import { CardReviewScreen } from "@/components/CardReviewScreen";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useSubjectFlashcards } from "@/hooks/useCards";
import { supabase } from "@/lib/supabase";
import { enqueueCardSession } from "@/lib/offlineQueue";
import type { CardRating, Flashcard, RatedCard, UserCard } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { useUserCards } from "@/hooks/useUserCards";
import { calculateSM2, getNextReviewDate } from "@/lib/srs";
import { useHierarchy } from "@/hooks/useHierarchy";

export default function SubjectSessionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { subjectId, subjectName } = useLocalSearchParams<{ subjectId: string; subjectName?: string }>();
  
  const { data: years } = useHierarchy();
  
  const subject = useMemo(() => {
    if (!years) return null;
    return years
      .flatMap((y) => y.modules)
      .flatMap((m) => m.subjects)
      .find((s) => s.id === subjectId);
  }, [years, subjectId]);

  const lectureIds = useMemo(() => subject?.lectures.map(l => l.id) ?? [], [subject]);

  const { data: allCards, isLoading: loadingCards, error } = useSubjectFlashcards(lectureIds);
  const { data: userCards, isLoading: loadingUserCards } = useUserCards(user?.id);
  const queryClient = useQueryClient();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  // ── State ───────────────────────────────────────────────────────────────
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [ratings, setRatings] = useState<RatedCard[]>([]);
  const [finished, setFinished] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);
  const flipProgress = useSharedValue(0);

  // Filter ONLY due cards for global subject review
  const cards = useMemo(() => {
    if (!allCards) return undefined;
    const now = new Date();
    return allCards.filter(card => {
      const state = userCards?.find(uc => uc.card_id === card.id);
      if (!state) return true; // New card
      return new Date(state.next_review) <= now; // Due card
    });
  }, [allCards, userCards]);

  const totalCards = cards?.length ?? 0;
  const currentCard: Flashcard | undefined = cards?.[currentIndex];
  const isLoading = loadingCards || loadingUserCards || !subject;

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

    const rated: RatedCard = { card: currentCard, rating };
    const newRatings = [...ratings, rated];
    setRatings(newRatings);

    if (currentIndex + 1 >= totalCards) {
      setFinished(true);
      await finishSession(newRatings);
    } else {
      setCurrentIndex((i) => i + 1);
      setIsFlipped(false);
      flipProgress.value = 0;
    }
  }, [currentCard, currentIndex, totalCards, ratings, flipProgress]);

  // ── Finish session ──────────────────────────────────────────────────────
  const finishSession = useCallback(async (allRatings: RatedCard[]) => {
    if (!user?.id || !subjectId) return;
    setSubmitting(true);

    // Group ratings by lecture to record multiple card_sessions
    const ratingsByLecture: Record<string, RatedCard[]> = {};
    for (const r of allRatings) {
      if (!ratingsByLecture[r.card.lecture_id]) ratingsByLecture[r.card.lecture_id] = [];
      ratingsByLecture[r.card.lecture_id].push(r);
    }

    // Prepare card_sessions payloads
    const sessionPayloads = Object.entries(ratingsByLecture).map(([lecId, lecrats]) => {
      const againCount = lecrats.filter((r) => r.rating === "again").length;
      const hardCount = lecrats.filter((r) => r.rating === "hard").length;
      const goodCount = lecrats.filter((r) => r.rating === "good").length;
      const total = lecrats.length;
      const masteryRate = total > 0 ? Math.round((goodCount / total) * 100) : 0;
      
      const lecInfo = subject?.lectures.find(l => l.id === lecId);

      return {
        user_id: user.id,
        lecture_id: lecId,
        lecture_name: lecInfo?.name ?? subjectName ?? "Subject Review",
        total_cards: total,
        again_count: againCount,
        hard_count: hardCount,
        good_count: goodCount,
        mastery_rate: masteryRate,
        created_at: new Date().toISOString(),
      };
    });

    // Calculate SRS states for all rated cards
    const updatedUserCards: Partial<UserCard>[] = allRatings.map((r) => {
      const currentState = userCards?.find(uc => uc.card_id === r.card.id);
      const sm2State = calculateSM2(r.rating, currentState ? {
        interval: currentState.interval,
        repetition: currentState.repetition,
        easeFactor: currentState.ease_factor
      } : undefined);
      
      const nextReviewDate = getNextReviewDate(sm2State.interval);

      return {
        card_id: r.card.id,
        interval: sm2State.interval,
        repetition: sm2State.repetition,
        ease_factor: sm2State.easeFactor,
        next_review: nextReviewDate.toISOString(),
      };
    });

    try {
      // 1. Insert sessions
      if (sessionPayloads.length > 0) {
        const { error: insertErr } = await supabase.from("card_sessions").insert(sessionPayloads);
        if (insertErr) throw insertErr;
      }

      // 2. Upsert user cards
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
      
      queryClient.invalidateQueries({ queryKey: ["stats", user.id] });
      queryClient.invalidateQueries({ queryKey: ["progress", user.id] });
      queryClient.invalidateQueries({ queryKey: ["user_cards", user.id] });
    } catch {
      // If network fails, enqueue each session individually so it gets synced offline
      for (const payload of sessionPayloads) {
        // Find which userCards belong to this lecture
        const lecCards = updatedUserCards.filter(uc => {
          const original = allRatings.find(r => r.card.id === uc.card_id);
          return original?.card.lecture_id === payload.lecture_id;
        });

        await enqueueCardSession({
          lectureId: payload.lecture_id,
          lectureName: payload.lecture_name,
          userId: payload.user_id,
          totalCards: payload.total_cards,
          againCount: payload.again_count,
          hardCount: payload.hard_count,
          goodCount: payload.good_count,
          masteryRate: payload.mastery_rate,
          createdAt: payload.created_at,
          userCards: lecCards,
        });
      }
      setSavedOffline(true);
    }

    setSubmitting(false);
  }, [user, subjectId, subject, subjectName, userCards]);

  // ── Computed results ────────────────────────────────────────────────────
  const results = useMemo(() => {
    const againCount = ratings.filter((r) => r.rating === "again").length;
    const hardCount = ratings.filter((r) => r.rating === "hard").length;
    const goodCount = ratings.filter((r) => r.rating === "good").length;
    const total = ratings.length;
    const masteryRate = total > 0 ? Math.round((goodCount / total) * 100) : 0;
    return { againCount, hardCount, goodCount, total, masteryRate };
  }, [ratings]);

  const handleRetry = useCallback(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setRatings([]);
    setFinished(false);
    setReviewing(false);
    setSavedOffline(false);
    flipProgress.value = 0;
  }, [flipProgress]);

  const handleHome = useCallback(() => {
    router.back();
  }, []);

  // ── Loading ─────────────────────────────────────────────────────────────
  if (isLoading) return <CardLoadingScreen lectureName={subjectName} />;

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
  if (!cards || cards.length === 0) {
    return (
      <View style={[st.center, { backgroundColor: colors.background }]}>
        <Feather name="check-circle" size={48} color={colors.success} />
        <Text style={[st.errTitle, { color: colors.foreground }]}>You're all caught up!</Text>
        <Text style={[st.errMsg, { color: colors.mutedForeground }]}>There are no due cards in this subject right now. Great job!</Text>
        <TouchableOpacity style={[st.retryBtn, { backgroundColor: colors.primary }]} onPress={handleHome}>
          <Text style={st.retryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Review ──────────────────────────────────────────────────────────────
  if (reviewing) {
    return <CardReviewScreen history={ratings} totalCount={totalCards} topPad={topPad} onBack={() => setReviewing(false)} />;
  }

  // ── Results ─────────────────────────────────────────────────────────────
  if (finished) {
    return (
      <CardResultsView
        masteryRate={results.masteryRate}
        againCount={results.againCount}
        hardCount={results.hardCount}
        goodCount={results.goodCount}
        totalCount={results.total}
        submitting={submitting}
        savedOffline={savedOffline}
        onReview={() => setReviewing(true)}
        onRetry={handleRetry}
        onHome={handleHome}
      />
    );
  }

  // ── Active card ─────────────────────────────────────────────────────────
  if (!currentCard) return null;

  return (
    <View style={[st.root, { paddingTop: topPad, backgroundColor: colors.background }]}>
      {/* Progress */}
      <View style={st.progressContainer}>
        <TouchableOpacity style={[st.closeBtn, { backgroundColor: colors.card }]} onPress={handleHome}>
          <Feather name="x" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={st.progressTrack}>
          <View
            style={[
              st.progressFill,
              { backgroundColor: colors.primary, width: `${(currentIndex / totalCards) * 100}%` },
            ]}
          />
        </View>
        <Text style={[st.progressText, { color: colors.mutedForeground }]}>
          {currentIndex + 1} / {totalCards}
        </Text>
      </View>

      {/* Card area */}
      <View style={st.cardArea}>
        <View style={st.cardWrapper}>
          <Animated.View
            style={[st.cardFace, st.cardFront, { backgroundColor: colors.card, borderColor: colors.border }, frontStyle]}
          >
            <Text style={[st.cardText, { color: colors.foreground }]}>{currentCard.front}</Text>
          </Animated.View>

          <Animated.View
            style={[st.cardFace, st.cardBack, { backgroundColor: colors.card, borderColor: colors.border }, backStyle]}
            pointerEvents={isFlipped ? "auto" : "none"}
          >
            <Text style={[st.cardText, { color: colors.foreground }]}>{currentCard.back}</Text>
          </Animated.View>
        </View>
      </View>

      {/* Controls */}
      <View style={[st.controls, { paddingBottom: insets.bottom + 20 }]}>
        {!isFlipped ? (
          <TouchableOpacity style={[st.revealBtn, { backgroundColor: colors.primary }]} onPress={handleFlip}>
            <Text style={st.revealText}>Show Answer</Text>
          </TouchableOpacity>
        ) : (
          <View style={st.ratingRow}>
            <RatingButton type="again" onPress={() => handleRate("again")} />
            <RatingButton type="hard" onPress={() => handleRate("hard")} />
            <RatingButton type="good" onPress={() => handleRate("good")} />
          </View>
        )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  errTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  errMsg: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  retryBtn: { marginTop: 24, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 16 },
  retryText: { color: "#FFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  progressContainer: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, marginBottom: 20, gap: 16 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  progressTrack: { flex: 1, height: 8, backgroundColor: "rgba(150,150,150,0.15)", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  progressText: { fontSize: 14, fontFamily: "Inter_600SemiBold", width: 44, textAlign: "right" },
  cardArea: { flex: 1, paddingHorizontal: 20 },
  cardWrapper: { flex: 1, position: "relative" },
  cardFace: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  cardFront: {},
  cardBack: {},
  cardText: { fontSize: 26, fontFamily: "Inter_600SemiBold", textAlign: "center", lineHeight: 36 },
  controls: { paddingHorizontal: 20, paddingTop: 24 },
  revealBtn: { paddingVertical: 18, borderRadius: 20, alignItems: "center" },
  revealText: { color: "#FFF", fontSize: 18, fontFamily: "Inter_700Bold" },
  ratingRow: { flexDirection: "row", justifyContent: "center", gap: 16 },
});
