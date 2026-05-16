import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LectureCard } from "@/components/LectureCard";
import { SubjectDownloadButton } from "@/components/SubjectDownloadButton";
import { useColors } from "@/hooks/useColors";
import { useHierarchy } from "@/hooks/useHierarchy";
import { useProgress } from "@/hooks/useProgress";
import { useSubjectCache } from "@/hooks/useSubjectCache";
import { useUserCards } from "@/hooks/useUserCards";
import { useAuth } from "@/context/AuthContext";

export default function SubjectScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: years } = useHierarchy();
  const { user } = useAuth();
  const { data: userCards } = useUserCards(user?.id);
  const completedIds = useProgress();

  const subject = years
    ?.flatMap((y) => y.modules)
    .flatMap((m) => m.subjects)
    .find((s) => s.id === id);

  const { status, progress, lectureInfo, downloadSubject, newCardCount } =
    useSubjectCache(subject);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  if (!subject) return null;

  const completedCount = subject.lectures.filter(
    (lec) => completedIds.has(lec.external_id) || completedIds.has(lec.id),
  ).length;

  const totalCount = subject.lectures.length;
  
  // Calculate due cards for this subject
  const dueCount = React.useMemo(() => {
    if (!subject) return 0;
    const now = new Date();
    let count = 0;
    
    // Check all lectures in this subject
    for (const lec of subject.lectures) {
      const info = lectureInfo.find(li => li.lectureId === lec.id);
      if (!info || !info.isCached) continue; // Skip if we don't have the cards
      
      // We would ideally look at the cards themselves, but since we don't fetch cards here,
      // we can do an estimate based on userCards, or we can just show a generic "Study Subject" button.
      // Actually, since we don't have all cards in memory here, we can't accurately count *New* cards.
      // So let's just render the button generically.
    }
    return count;
  }, [subject, lectureInfo]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 14,
            backgroundColor: colors.background,
            borderBottomColor: "transparent",
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.muted }]}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.titleWrapper}>
          <Text
            style={[styles.headerTitle, { color: colors.foreground }]}
            numberOfLines={2}
          >
            {subject.name}
          </Text>
        </View>

        {/* Placeholder for balance */}
        <View style={{ width: 40 }} />
      </View>

      {/* ── Download row ─────────────────────────────────────────────────── */}
      {totalCount > 0 && (
        <View
          style={[
            styles.downloadRow,
            {
              borderBottomColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        >
          <View style={styles.downloadLeft}>
            <Feather name="wifi-off" size={13} color={colors.mutedForeground} />
            <Text
              style={[styles.downloadLabel, { color: colors.mutedForeground }]}
            >
              Offline access
            </Text>
          </View>
          <SubjectDownloadButton
            status={status}
            progress={progress}
            newCardCount={newCardCount}
            onPress={downloadSubject}
          />
        </View>
      )}

      {/* ── New-cards banner ─────────────────────────────────────────── */}
      {status === "stale" && newCardCount > 0 && (
        <View
          style={[
            styles.staleBanner,
            {
              backgroundColor: colors.warning + "1A",
              borderColor: colors.warning + "4D",
            },
          ]}
        >
          <Feather name="alert-circle" size={14} color={colors.warning} />
          <Text style={[styles.staleText, { color: colors.foreground }]}>
            {newCardCount} new card{newCardCount !== 1 ? "s" : ""}{" "}
            added to this subject — tap "Update available" to get the latest.
          </Text>
        </View>
      )}

      {/* ── Global Subject Study Button ───────────────────────────────── */}
      {totalCount > 0 && (
        <View style={styles.globalStudyContainer}>
          <TouchableOpacity 
            style={[styles.globalStudyBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
            onPress={() => router.push({
              pathname: "/session/subject/[subjectId]",
              params: { subjectId: subject.id, subjectName: subject.name }
            })}
          >
            <Feather name="play" size={18} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.globalStudyText}>Study Subject Due Cards</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Lecture list ─────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          LECTURES
        </Text>

        {subject.lectures.map((lec, i) => {
          const isCompleted =
            completedIds.has(lec.external_id) || completedIds.has(lec.id);
          const info = lectureInfo.find((li) => li.lectureId === lec.id);
          const isCached = info?.isCached ?? false;
          const hasNewCards = info?.isStale ?? false;

          return (
            <LectureCard
              key={lec.id}
              lecture={lec}
              index={i}
              completed={isCompleted}
              isCached={isCached}
              hasNewCards={hasNewCards}
              onPress={() =>
                router.push({
                  pathname: "/session/[lectureId]",
                  params: { lectureId: lec.id, lectureName: lec.name },
                })
              }
            />
          );
        })}

        {subject.lectures.length === 0 && (
          <View style={styles.empty}>
            <Feather
              name="book-open"
              size={36}
              color={colors.mutedForeground}
            />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No lectures yet
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrapper: { flex: 1, alignItems: "center" },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Nunito_800ExtraBold",
    textAlign: "center",
    letterSpacing: -0.8,
    lineHeight: 28,
  },
  downloadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1.5,
  },
  downloadLeft: { flexDirection: "row", alignItems: "center", gap: 7 },
  downloadLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },

  staleBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  staleText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },

  globalStudyContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  globalStudyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  globalStudyText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },

  list: { paddingTop: 20 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    marginHorizontal: 20,
    marginBottom: 14,
  },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
