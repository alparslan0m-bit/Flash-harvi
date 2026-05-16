import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { CardSession } from "@/types";

interface Props {
  result: CardSession;
}

export function RecentResultCard({ result }: Props) {
  const colors = useColors();

  const mastery = result.mastery_rate ?? 0;
  const scoreBg =
    mastery >= 80 ? colors.success + "1A" :
    mastery >= 50 ? colors.warning + "1A" :
    colors.destructive + "1A";

  const scoreColor =
    mastery >= 80 ? colors.success :
    mastery >= 50 ? colors.warning :
    colors.destructive;

  const formattedDate = new Date(result.created_at).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.left}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {result.lecture_name ?? "Session"}
        </Text>
        <Text style={[styles.date, { color: colors.mutedForeground }]}>
          {formattedDate}
        </Text>
      </View>
      <View style={[styles.badge, { backgroundColor: scoreBg }]}>
        <Text style={[styles.scoreText, { color: scoreColor }]}>
          {Math.round(mastery)}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  left: { flex: 1, gap: 2 },
  name: { fontSize: 14, fontFamily: "Inter_500Medium" },
  date: { fontSize: 12, fontFamily: "Inter_400Regular" },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  scoreText: { fontSize: 13, fontFamily: "Inter_700Bold" },
});
