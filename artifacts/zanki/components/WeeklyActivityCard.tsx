import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { WeeklyDay } from "@/types";

interface Props {
  data: WeeklyDay[];
}

export function WeeklyActivityCard({ data }: Props) {
  const colors = useColors();
  
  const studiedCount = data.filter(d => d.count > 0).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Last 7 Days</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {studiedCount}/7 studied
        </Text>
      </View>

      <View style={styles.row}>
        {data.map((day, i) => {
          const hasStudied = day.count > 0;
          const label = day.label.substring(0, 2); // "Su", "Mo" etc
          
          return (
            <View key={i} style={styles.dayCol}>
              <View 
                style={[
                  styles.box, 
                  { 
                    backgroundColor: hasStudied ? colors.primary : colors.muted + "40",
                  }
                ]} 
              />
              <Text 
                style={[
                  styles.dayLabel, 
                  { 
                    color: hasStudied ? colors.primary : colors.mutedForeground,
                    fontFamily: hasStudied ? "Inter_700Bold" : "Inter_400Regular"
                  }
                ]}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 24,
    borderRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: "Nunito_800ExtraBold",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayCol: {
    alignItems: "center",
    gap: 10,
  },
  box: {
    width: 38,
    height: 38,
    borderRadius: 12,
  },
  dayLabel: {
    fontSize: 12,
  },
});
