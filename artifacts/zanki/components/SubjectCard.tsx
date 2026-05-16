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
import { Subject } from "@/types";

interface Props {
  subject: Subject;
  index: number;
  completedCount: number;
  isLocked?: boolean;
  isFreePreview?: boolean;
  onPress: () => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function SubjectCard({
  subject,
  index,
  completedCount,
  isLocked,
  isFreePreview,
  onPress,
}: Props) {
  const scale = useSharedValue(1);
  const gradient =
    (colors.yearGradients[index % colors.yearGradients.length] as [
      string,
      string,
    ]) ?? colors.yearGradients[0];

  const total = subject.lectures.length;
  const progress = total > 0 ? completedCount / total : 0;
  const allDone = completedCount >= total && total > 0;

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
        {/* Title row */}
        <View style={styles.row}>
          <Text style={styles.title} numberOfLines={2}>
            {subject.name}
          </Text>
          {/* Completion/Lock/Open badge */}
          <View style={[styles.badge, allDone && styles.badgeDone, isLocked && styles.badgeLocked]}>
            {isLocked ? (
              <Feather name="lock" size={12} color="#fff" />
            ) : (
              <View style={styles.flexRow}>
                {/* If it's a free preview, show OPEN icon or text */}
                <Text style={styles.badgeText}>
                  {allDone ? "✓" : `${completedCount}/${total}`}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Progress bar */}
        {total > 0 && (
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { width: `${Math.round(progress * 100)}%` as `${number}%` },
              ]}
            />
          </View>
        )}

        {/* Status indicator for free content */}
        {isFreePreview && (
          <View style={styles.statusLabel}>
             <Text style={styles.statusText}>FREE PREVIEW</Text>
          </View>
        )}

        {/* Decorative elements */}
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
    paddingBottom: 20,
    minHeight: 110,
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
  },
  innerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 26,
    borderWidth: 1.5,
    zIndex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
    zIndex: 2,
  },
  title: {
    flex: 1,
    color: "#fff",
    fontSize: 22,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.5,
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    alignSelf: "center",
  },
  badgeDone: {
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  badgeLocked: {
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  statusLabel: {
    position: "absolute",
    bottom: 20,
    right: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  statusText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 0.5,
  },
  flexRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
    zIndex: 2,
  },
  barFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
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
