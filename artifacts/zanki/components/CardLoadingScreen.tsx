import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

const TIPS = [
  "Spaced repetition boosts long-term retention by 200%",
  "Retrieval practice is more effective than re-reading",
  "Sleep consolidates memories — study before bedtime",
  "Interleaving topics strengthens pattern recognition",
  "Active recall outperforms passive review every time",
  "Short focused sessions beat marathon study hours",
];

export function CardLoadingScreen({ lectureName }: { lectureName?: string }) {
  const colors = useColors();

  const ring1Scale = useSharedValue(1);
  const ring1Opacity = useSharedValue(0.5);
  const ring2Scale = useSharedValue(1);
  const ring2Opacity = useSharedValue(0.3);
  const iconY = useSharedValue(0);

  const [tipIndex, setTipIndex] = useState(0);
  const [dots, setDots] = useState(1);

  useEffect(() => {
    ring1Scale.value = withRepeat(
      withTiming(2.2, { duration: 1600, easing: Easing.out(Easing.cubic) }),
      -1, false
    );
    ring1Opacity.value = withRepeat(
      withSequence(
        withTiming(0.45, { duration: 200 }),
        withTiming(0, { duration: 1400 })
      ),
      -1, false
    );
    ring2Scale.value = withDelay(700,
      withRepeat(
        withTiming(2.2, { duration: 1600, easing: Easing.out(Easing.cubic) }),
        -1, false
      )
    );
    ring2Opacity.value = withDelay(700,
      withRepeat(
        withSequence(
          withTiming(0.3, { duration: 200 }),
          withTiming(0, { duration: 1400 })
        ),
        -1, false
      )
    );
    iconY.value = withRepeat(
      withSequence(
        withTiming(-7, { duration: 950, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 950, easing: Easing.inOut(Easing.sin) })
      ),
      -1, false
    );

    const dotTimer = setInterval(() => setDots((d) => (d % 3) + 1), 450);
    const tipTimer = setInterval(() => setTipIndex((t) => (t + 1) % TIPS.length), 3200);
    return () => { clearInterval(dotTimer); clearInterval(tipTimer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: ring1Opacity.value,
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: iconY.value }],
  }));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.ringWrap}>
        <Animated.View style={[styles.ring, { borderColor: colors.primary }, ring1Style]} />
        <Animated.View style={[styles.ring, { borderColor: colors.primary }, ring2Style]} />
        <Animated.View style={iconStyle}>
          <View style={[styles.iconBox, { backgroundColor: colors.primary }]}>
            <Feather name="layers" size={34} color="#fff" />
          </View>
        </Animated.View>
      </View>

      <Animated.View entering={FadeIn.delay(200).duration(500)} style={styles.textGroup}>
        <Text style={[styles.title, { color: colors.foreground }]}>Loading Cards</Text>
        {lectureName ? (
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
            {lectureName}
          </Text>
        ) : null}
        <Text style={[styles.dots, { color: colors.primary }]}>
          {"●".repeat(dots) + "○".repeat(3 - dots)}
        </Text>
      </Animated.View>

      <Animated.View
        key={tipIndex}
        entering={FadeInDown.duration(400).springify()}
        exiting={FadeOut.duration(200)}
        style={[styles.tipCard, { backgroundColor: colors.muted, borderColor: colors.border }]}
      >
        <Feather name="book-open" size={13} color={colors.primary} />
        <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
          {TIPS[tipIndex]}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", gap: 32, paddingHorizontal: 32 },
  ringWrap: { width: 88, height: 88, alignItems: "center", justifyContent: "center" },
  ring: {
    position: "absolute",
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
  },
  iconBox: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  textGroup: { alignItems: "center", gap: 6 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.7 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", maxWidth: 240, textAlign: "center" },
  dots: { fontSize: 10, letterSpacing: 4, marginTop: 4 },
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1,
    width: "100%",
  },
  tipText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, letterSpacing: -0.1 },
});
