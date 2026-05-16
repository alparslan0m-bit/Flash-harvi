import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Feather } from "@expo/vector-icons";
import { StatCard } from "./StatCard";
import { useColors } from "@/hooks/useColors";

interface StatsMetricsGridProps {
  totalSessions: number;
  totalCards: number;
  averageMastery: number;
  bestMastery: number;
}

/**
 * Grid displaying primary statistics cards.
 */
export function StatsMetricsGrid({ totalSessions, totalCards, averageMastery, bestMastery }: StatsMetricsGridProps) {
  const colors = useColors();
  
  return (
    <View style={styles.statsGrid}>
      <View style={styles.statsRow}>
        <StatCard
          label="Sessions"
          value={totalSessions}
          icon={<Feather name="layers" size={18} color={colors.primary} />}
          accent
        />
        <StatCard
          label="Cards"
          value={totalCards}
          icon={<Feather name="credit-card" size={18} color={colors.mutedForeground} />}
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          label="Avg Mastery"
          value={`${Math.round(averageMastery)}%`}
          icon={<Feather name="trending-up" size={18} color={colors.mutedForeground} />}
        />
        <StatCard
          label="Best Mastery"
          value={`${Math.round(bestMastery)}%`}
          icon={<Feather name="award" size={18} color={colors.warning} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsGrid: { paddingHorizontal: 20, gap: 10, marginBottom: 16 },
  statsRow: { flexDirection: "row", gap: 10 },
});
