import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { SrsLevel } from "@/types";

interface Props {
  data: SrsLevel[];
}

export function SrsDistributionCard({ data }: Props) {
  const colors = useColors();
  const total = data.reduce((s, item) => s + item.count, 0);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>
        Card Distribution
      </Text>

      <View style={styles.barContainer}>
        {data.map((item, i) => (
          <View
            key={item.label}
            style={[
              styles.segment,
              {
                backgroundColor: item.color,
                flex: Math.max(item.count, 1),
                borderTopLeftRadius: i === 0 ? 8 : 0,
                borderBottomLeftRadius: i === 0 ? 8 : 0,
                borderTopRightRadius: i === data.length - 1 ? 8 : 0,
                borderBottomRightRadius: i === data.length - 1 ? 8 : 0,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.legendGrid}>
        {data.map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            <View>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                {item.label}
              </Text>
              <Text style={[styles.count, { color: colors.foreground }]}>
                {item.count}{" "}
                <Text style={styles.percent}>
                  ({Math.round(item.percentage)}%)
                </Text>
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: "Nunito_800ExtraBold",
    marginBottom: 16,
  },
  barContainer: {
    flexDirection: "row",
    height: 12,
    width: "100%",
    backgroundColor: "#e2e8f0",
    borderRadius: 8,
    marginBottom: 20,
    overflow: "hidden",
  },
  segment: {
    height: "100%",
  },
  legendGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    width: "45%",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  count: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  percent: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    opacity: 0.6,
  },
});
