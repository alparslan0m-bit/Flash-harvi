import { Feather } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

interface Props {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
}

export function OfflineBanner({ isOnline, pendingCount, isSyncing }: Props) {
  const colors = useColors();
  const translateY = useSharedValue(-60);
  const opacity = useSharedValue(0);

  const shouldShow = !isOnline || isSyncing || pendingCount > 0;

  useEffect(() => {
    if (shouldShow) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withSpring(-60, { damping: 20, stiffness: 200 });
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [shouldShow]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const bg = !isOnline ? colors.warning : isSyncing ? colors.primary : colors.success;
  const icon: React.ComponentProps<typeof Feather>["name"] = !isOnline
    ? "wifi-off"
    : isSyncing
    ? "refresh-cw"
    : "check-circle";

  const label = !isOnline
    ? pendingCount > 0
      ? `Offline · ${pendingCount} result${pendingCount !== 1 ? "s" : ""} queued`
      : "You're offline"
    : isSyncing
    ? "Syncing results…"
    : pendingCount > 0
    ? `Synced ${pendingCount} result${pendingCount !== 1 ? "s" : ""}`
    : "";

  return (
    <Animated.View 
      style={[
        styles.banner, 
        { 
          backgroundColor: colors.card,
          borderColor: bg + "33",
        }, 
        animStyle
      ]}
    >
      <View style={[styles.indicator, { backgroundColor: bg }]} />
      <Feather name={icon} size={11} color={bg} />
      <Text style={[styles.text, { color: colors.foreground }]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    zIndex: 999,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.1,
  },
});
