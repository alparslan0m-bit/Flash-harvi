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
}

const CONFIG: Record<
  CardRating,
  { label: string; icon: React.ComponentProps<typeof Feather>["name"]; colorKey: "destructive" | "warning" | "success" }
> = {
  again: { label: "Again", icon: "x", colorKey: "destructive" },
  hard: { label: "Hard", icon: "minus", colorKey: "warning" },
  good: { label: "Good", icon: "check", colorKey: "success" },
};

export function RatingButton({ rating, onPress, disabled }: Props) {
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
            backgroundColor: color + "14",
            borderColor: color + "4D",
          },
        ]}
        onPress={() => {
          scale.value = withSequence(
            withSpring(0.92, { damping: 20 }),
            withSpring(1, { damping: 15 }),
          );
          onPress();
        }}
        activeOpacity={0.85}
        disabled={disabled}
      >
        <View style={[styles.iconCircle, { backgroundColor: color + "22" }]}>
          <Feather name={icon} size={18} color={color} />
        </View>
        <Text style={[styles.label, { color }]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 22,
    borderWidth: 1.5,
    gap: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
});
