import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

interface DayData {
  day: string;
  count: number;
  isToday?: boolean;
}

interface Props {
  data: DayData[];
}

const BAR_MAX_H = 72;

function AnimatedBar({
  item,
  index,
  maxCount,
}: {
  item: DayData;
  index: number;
  maxCount: number;
}) {
  const colors = useColors();
  const progress = useSharedValue(0);

  const targetH = item.count > 0 ? Math.max((item.count / maxCount) * BAR_MAX_H, 12) : 0;

  useEffect(() => {
    progress.value = withDelay(
      index * 60,
      withTiming(1, { duration: 550, easing: Easing.out(Easing.cubic) })
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.count]);

  const barStyle = useAnimatedStyle(() => ({
    height: progress.value * targetH,
  }));

  const isActive = item.count > 0;
  const barColor = item.isToday
    ? colors.primary
    : isActive
    ? colors.primary + "bb"
    : colors.muted;

  return (
    <View style={styles.barWrapper}>
      {/* Count label above bar */}
      <View style={styles.labelWrap}>
        {isActive && (
          <Text style={[styles.countLabel, { color: item.isToday ? colors.primary : colors.mutedForeground }]}>
            {item.count}
          </Text>
        )}
      </View>

      {/* Bar track */}
      <View style={[styles.track, { backgroundColor: colors.muted }]}>
        <Animated.View
          style={[
            styles.bar,
            barStyle,
            {
              backgroundColor: barColor,
              shadowColor: item.isToday ? colors.primary : "transparent",
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: item.isToday ? 0.3 : 0,
              shadowRadius: 6,
            },
          ]}
        />
      </View>

      {/* Day label */}
      <Text
        style={[
          styles.dayLabel,
          {
            color: item.isToday ? colors.primary : colors.mutedForeground,
            fontFamily: item.isToday ? "Inter_700Bold" : "Inter_500Medium",
          },
        ]}
      >
        {item.day}
      </Text>

      {/* Today dot */}
      {item.isToday && (
        <View style={[styles.todayDot, { backgroundColor: colors.primary }]} />
      )}
    </View>
  );
}

export function WeeklyChart({ data }: Props) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <View style={styles.container}>
      {data.map((item, i) => (
        <AnimatedBar key={item.day} item={item} index={i} maxCount={maxCount} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 110,
  },
  barWrapper: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    height: "100%",
    justifyContent: "flex-end",
  },
  labelWrap: {
    height: 16,
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: 2,
  },
  countLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  track: {
    width: "62%",
    height: BAR_MAX_H,
    borderRadius: 8,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  bar: {
    width: "100%",
    borderRadius: 8,
  },
  dayLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
