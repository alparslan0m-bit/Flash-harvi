import { Feather } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  useAnimatedProps
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useColors } from "@/hooks/useColors";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  level: number;
  totalXp: number;
}

export function LevelProgressCard({ level, totalXp }: Props) {
  const colors = useColors();
  
  const xpInLevel = totalXp % 100;
  const progress = useSharedValue(0);

  const size = 100;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  useEffect(() => {
    progress.value = withSpring(xpInLevel / 100, {
      damping: 15,
      stiffness: 90,
    });
  }, [xpInLevel]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.content}>
        {/* Left: Circular Progress */}
        <View style={styles.ringSection}>
          <Svg width={size} height={size}>
            {/* Background Track */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={colors.muted + "30"}
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Progress Fill */}
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={colors.primary}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              animatedProps={animatedProps}
              strokeLinecap="round"
              rotation="-90"
              origin={`${size / 2}, ${size / 2}`}
            />
          </Svg>
          <View style={styles.centerText}>
            <Text style={[styles.levelLabel, { color: colors.mutedForeground }]}>LVL</Text>
            <Text style={[styles.levelValue, { color: colors.foreground }]}>{level}</Text>
          </View>
        </View>

        {/* Right: Info */}
        <View style={styles.infoSection}>
          <View style={styles.headerTop}>
            <Text style={[styles.rankText, { color: colors.primary }]}>Master Scholar</Text>
            <View style={[styles.totalPill, { backgroundColor: colors.primary + "10" }]}>
              <Text style={[styles.totalValue, { color: colors.primary }]}>{totalXp} XP</Text>
            </View>
          </View>

          <Text style={[styles.xpCount, { color: colors.foreground }]}>
            {xpInLevel} <Text style={[styles.xpLabel, { color: colors.mutedForeground }]}>/ 100 XP</Text>
          </Text>

          <Text style={[styles.remainingText, { color: colors.mutedForeground }]}>
            {100 - xpInLevel} XP to Level {level + 1}
          </Text>

          <View style={styles.milestoneRow}>
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.milestoneText, { color: colors.mutedForeground }]}>Next Milestone at {Math.ceil((totalXp + 1) / 100) * 100} XP</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  content: {
    flexDirection: "row",
    padding: 24,
    alignItems: "center",
    gap: 24,
  },
  ringSection: {
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  centerText: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  levelLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    marginBottom: -2,
  },
  levelValue: {
    fontSize: 32,
    fontFamily: "Nunito_800ExtraBold",
  },
  infoSection: {
    flex: 1,
    gap: 6,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  rankText: {
    fontSize: 11,
    fontFamily: "Inter_800ExtraBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  totalPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  totalValue: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  xpCount: {
    fontSize: 22,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.5,
  },
  xpLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  remainingText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    lineHeight: 16,
  },
  milestoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  milestoneText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
});
