import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import colors from "@/constants/colors";
import { Module } from "@/types";

interface Props {
  module: Module;
  index: number;
  onPress: () => void;
  hasAccess?: boolean;
  isFree?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function ModuleCard({ module, index, onPress, hasAccess, isFree }: Props) {
  const scale = useSharedValue(1);
  const gradient =
    (colors.yearGradients[index % colors.yearGradients.length] as [
      string,
      string,
    ]) ?? colors.yearGradients[0];

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedTouchable
      style={[styles.card, animStyle]}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 15 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15 });
      }}
      activeOpacity={1}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View
          style={[
            styles.innerBorder,
            { borderColor: "rgba(255,255,255,0.25)" },
          ]}
        />
        <View style={styles.content}>
          <Text style={styles.title}>{module.name}</Text>
        </View>

        {!hasAccess && !isFree && (
          <View style={[styles.lockBadge, { backgroundColor: 'rgba(0,0,0,0.35)' }]}>
            <Feather name="lock" size={14} color="#fff" />
          </View>
        )}

        {isFree && (
          <View style={[styles.freeBadge, { backgroundColor: colors.light.success }]}>
            <Text style={styles.freeBadgeText}>FREE</Text>
          </View>
        )}

        <View style={styles.decorCircle} />
        <View style={styles.decorCircle2} />
        <View style={styles.decorCircle3} />
      </LinearGradient>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 26,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  gradient: {
    padding: 24,
    minHeight: 100,
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  innerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 26,
    borderWidth: 1.5,
    zIndex: 1,
  },
  content: { zIndex: 2 },
  title: {
    color: "#fff",
    fontSize: 26,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.8,
  },
  lockBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  freeBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    zIndex: 3,
  },
  freeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  decorCircle: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.12)",
    right: -40,
    top: -40,
  },
  decorCircle2: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.08)",
    right: 40,
    bottom: -30,
  },
  decorCircle3: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.05)",
    left: -20,
    bottom: -10,
  },
});
