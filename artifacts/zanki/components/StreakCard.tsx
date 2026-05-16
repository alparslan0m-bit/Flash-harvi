import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

function streakMessage(streak: number): string {
  if (streak === 0) return "Study today to start a streak!";
  if (streak === 1) return "Great start — come back tomorrow!";
  if (streak < 5) return "You're building momentum. Keep it up!";
  if (streak < 10) return "Impressive consistency — don't break it!";
  if (streak < 30) return "You're on fire! Keep the streak alive!";
  return "Legendary dedication. You're unstoppable!";
}

export function StreakCard({ streak }: { streak: number }) {
  const colors = useColors();

  const zapScale = useSharedValue(1);
  useEffect(() => {
    if (streak > 0) {
      zapScale.value = withRepeat(
        withSequence(
          withTiming(1.18, { duration: 600, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 600, easing: Easing.in(Easing.quad) })
        ),
        -1,
        false
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streak]);

  const zapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: zapScale.value }],
  }));

  const isActive = streak > 0;
  const iconBg = isActive ? colors.warning + "1A" : colors.muted;
  const iconColor = isActive ? colors.warning : colors.mutedForeground;
  const numColor = isActive ? colors.warning : colors.mutedForeground;

  return (
    <View style={[
      styles.card,
      { 
        backgroundColor: colors.card, 
        borderColor: isActive ? colors.warning + "4D" : colors.border 
      },
    ]}>
      {isActive && (
        <LinearGradient
          colors={[colors.warning + "0A", colors.warning + "1A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={styles.left}>
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <Animated.View style={zapStyle}>
            <Feather name="zap" size={22} color={iconColor} />
          </Animated.View>
        </View>
        <View style={styles.numCol}>
          <Text style={[styles.num, { color: numColor }]}>{streak}</Text>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>day streak</Text>
        </View>
      </View>
      <Text style={[styles.message, { color: colors.mutedForeground }]}>
        {streakMessage(streak)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  left: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  numCol: { alignItems: "flex-start" },
  num: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -1, lineHeight: 32 },
  label: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  message: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, textAlign: "right" },
});
