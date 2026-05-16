import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

interface Props {
  subject: string;
  mastery: number;
}

export function MasteryBar({ subject, mastery }: Props) {
  const colors = useColors();
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(mastery, { duration: 800 });
  }, [mastery]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  const color =
    mastery >= 80 ? colors.success :
    mastery >= 50 ? colors.warning :
    colors.destructive;

  return (
    <View style={styles.row}>
      <Text style={[styles.subject, { color: colors.foreground }]} numberOfLines={1}>
        {subject}
      </Text>
      <View style={[styles.track, { backgroundColor: colors.muted }]}>
        <Animated.View style={[styles.fill, { backgroundColor: color }, barStyle]} />
      </View>
      <Text style={[styles.pct, { color: colors.mutedForeground }]}>{mastery}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  subject: {
    width: 100,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
  },
  pct: {
    width: 36,
    textAlign: "right",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});
