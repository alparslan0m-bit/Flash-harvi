import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: boolean;
}

export function StatCard({ label, value, icon, accent }: Props) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: accent ? colors.primary : colors.card,
          borderColor: accent ? colors.primary : colors.border,
        },
      ]}
    >
      <View style={[styles.headerRow]}>
        <View style={[styles.iconWrap, { backgroundColor: accent ? "rgba(255,255,255,0.2)" : colors.primary + "10" }]}>
          {icon}
        </View>
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.value, { color: accent ? "#fff" : colors.foreground }]}>{value}</Text>
        <Text style={[styles.label, { color: accent ? "rgba(255,255,255,0.8)" : colors.mutedForeground }]}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    minHeight: 110,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 4,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    gap: 0,
  },
  value: {
    fontSize: 24,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0,
  },
});
