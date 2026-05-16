import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, FadeInDown, interpolate, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CardLoadingScreen } from "@/components/CardLoadingScreen";
import { CardResultsView } from "@/components/CardResultsView";
import { CardReviewScreen } from "@/components/CardReviewScreen";
import { RatingButton } from "@/components/RatingButton";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useFlashcards } from "@/hooks/useCards";
import { supabase } from "@/lib/supabase";
import { enqueueCardSession } from "@/lib/offlineQueue";
import type { CardRating, Flashcard, RatedCard } from "@/types";
import { useQueryClient } from "@tanstack/react-query";

export default function SessionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { lectureId, lectureName } = useLocalSearchParams<{ lectureId: string; lectureName?: string }>();
  const { data: cards, isLoading, error } = useFlashcards(lectureId);
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

  const totalCards = cards?.length ?? 0;
  const currentCard: Flashcard | undefined = cards?.[currentIndex];

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
      // Session complete
      setFinished(true);
      await finishSession(newRatings);
    } else {
      // Next card
      setCurrentIndex((i) => i + 1);
      setIsFlipped(false);
      flipProgress.value = 0;
    }
  }, [currentCard, currentIndex, totalCards, ratings, flipProgress]);

  // ── Finish session ──────────────────────────────────────────────────────
  const finishSession = useCallback(async (allRatings: RatedCard[]) => {
    if (!user?.id || !lectureId) return;
    setSubmitting(true);

    const againCount = allRatings.filter((r) => r.rating === "again").length;
    const hardCount = allRatings.filter((r) => r.rating === "hard").length;
    const goodCount = allRatings.filter((r) => r.rating === "good").length;
    const total = allRatings.length;
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

    try {
      const { error: insertErr } = await supabase.from("card_sessions").insert(payload);
      if (insertErr) throw insertErr;
      
      // Invalidate caches so UI updates immediately
      queryClient.invalidateQueries({ queryKey: ["stats", user.id] });
      queryClient.invalidateQueries({ queryKey: ["progress", user.id] });
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
      });
      setSavedOffline(true);
    }

    setSubmitting(false);
  }, [user, lectureId, lectureName]);

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
  if (!cards || cards.length === 0) {
    return (
      <View style={[st.center, { backgroundColor: colors.background }]}>
        <Feather name="inbox" size={48} color={colors.mutedForeground} />
        <Text style={[st.errTitle, { color: colors.foreground }]}>No cards yet</Text>
        <Text style={[st.errMsg, { color: colors.mutedForeground }]}>This lecture doesn't have any flashcards.</Text>
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
        lectureName={lectureName}
        onRetry={handleRetry}
        onReview={() => setReviewing(true)}
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
          <Text style={[st.progressText, { color: colors.foreground }]}>{currentIndex + 1} / {totalCards}</Text>
          {lectureName && <Text style={[st.lecName, { color: colors.mutedForeground }]} numberOfLines={1}>{lectureName}</Text>}
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* Progress bar */}
      <View style={[st.progressBar, { backgroundColor: colors.muted }]}>
        <View style={[st.progressFill, { backgroundColor: colors.primary, width: `${((currentIndex + 1) / totalCards) * 100}%` }]} />
      </View>

      {/* Card */}
      <View style={st.cardArea}>
        <TouchableOpacity onPress={handleFlip} activeOpacity={0.95} style={st.flipTouch} disabled={isFlipped}>
          {/* Front face */}
          <Animated.View style={[st.face, { backgroundColor: colors.card, borderColor: colors.border }, frontStyle]}>
            <View style={[st.faceBadge, { backgroundColor: colors.primary + "14" }]}>
              <Text style={[st.faceBadgeText, { color: colors.primary }]}>FRONT</Text>
            </View>
            <Text style={[st.faceText, { color: colors.foreground }]}>{currentCard?.front}</Text>
            {currentCard?.hint && (
              <Text style={[st.hintText, { color: colors.mutedForeground }]}>{currentCard.hint}</Text>
            )}
            {!isFlipped && (
              <Animated.View entering={FadeIn.delay(300)} style={[st.tapHint, { backgroundColor: colors.muted }]}>
                <Feather name="rotate-cw" size={13} color={colors.mutedForeground} />
                <Text style={[st.tapHintText, { color: colors.mutedForeground }]}>Tap to reveal answer</Text>
              </Animated.View>
            )}
          </Animated.View>

          {/* Back face */}
          <Animated.View style={[st.face, st.faceBack, { backgroundColor: colors.card, borderColor: colors.primary + "4D" }, backStyle]}>
            <View style={[st.faceBadge, { backgroundColor: colors.success + "14" }]}>
              <Text style={[st.faceBadgeText, { color: colors.success }]}>BACK</Text>
            </View>
            <Text style={[st.faceText, { color: colors.foreground }]}>{currentCard?.back}</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Rating buttons — only visible after flip */}
      {isFlipped && (
        <Animated.View entering={FadeInDown.duration(350).springify()} style={st.ratingRow}>
          <RatingButton rating="again" onPress={() => handleRate("again")} />
          <RatingButton rating="hard" onPress={() => handleRate("hard")} />
          <RatingButton rating="good" onPress={() => handleRate("good")} />
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
  progressFill: { height: "100%", borderRadius: 2 },

  cardArea: { flex: 1, justifyContent: "center", paddingHorizontal: 20, paddingVertical: 16 },
  flipTouch: { flex: 1, maxHeight: 420 },

  face: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 26, borderWidth: 1.5, padding: 28, justifyContent: "center", alignItems: "center", gap: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  faceBack: { position: "absolute" },

  faceBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, position: "absolute", top: 20, left: 20 },
  faceBadgeText: { fontSize: 10, fontFamily: "Inter_800ExtraBold", letterSpacing: 0.8 },

  faceText: { fontSize: 20, fontFamily: "Nunito_800ExtraBold", textAlign: "center", lineHeight: 28, letterSpacing: -0.4 },
  hintText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", fontStyle: "italic", lineHeight: 20 },

  tapHint: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, position: "absolute", bottom: 24 },
  tapHintText: { fontSize: 12, fontFamily: "Inter_500Medium" },

  ratingRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingBottom: 24 },
  ratingPlaceholder: { height: 110, paddingBottom: 24 },
});
