import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";
import type { CardRating } from "@/types";

interface Props {
  rating: CardRating;
  onPress: () => void;
  disabled?: boolean;
  interval?: string;
}

const CONFIG: Record<
  CardRating,
  {
    label: string;
    icon: React.ComponentProps<typeof Feather>["name"];
    colorKey: "destructive" | "warning" | "success";
  }
> = {
  again: { label: "Again", icon: "x", colorKey: "destructive" },
  hard: { label: "Hard", icon: "minus", colorKey: "warning" },
  good: { label: "Good", icon: "check", colorKey: "success" },
};

export function RatingButton({ rating, onPress, disabled, interval }: Props) {
  const colors = useColors();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const { label, icon, colorKey } = CONFIG[rating];
  const color = colors[colorKey];

  return (
    <Animated.View style={[{ flex: 1 }, animStyle]}>
      <TouchableOpacity
        style={[
          styles.btn,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            shadowColor: color,
          },
        ]}
        onPress={() => {
          scale.value = withSequence(
            withSpring(0.9, { damping: 15 }),
            withSpring(1, { damping: 12 }),
          );
          onPress();
        }}
        activeOpacity={0.9}
        disabled={disabled}
      >
        <View style={[styles.glow, { backgroundColor: color + "10" }]} />
        <View style={[styles.iconCircle, { backgroundColor: color }]}>
          <Feather name={icon} size={18} color="#fff" />
        </View>
        <Text style={[styles.label, { color: colors.foreground }]}>
          {label}
        </Text>
        {interval && (
          <Text style={[styles.interval, { color: colors.mutedForeground }]}>
            {interval}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 8,
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  interval: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    opacity: 0.7,
    marginTop: -4,
  },
});
