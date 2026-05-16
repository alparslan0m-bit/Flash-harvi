import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";
import { Lecture } from "@/types";

interface Props {
  lecture: Lecture;
  index: number;
  completed?: boolean;
  /** True when new cards were added since this lecture was last downloaded */
  hasNewCards?: boolean;
  /** True when cards are pre-cached for offline use */
  isCached?: boolean;
  onPress: () => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function LectureCard({
  lecture,
  index,
  completed = false,
  hasNewCards = false,
  isCached = false,
  onPress,
}: Props) {
  const colors = useColors();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedTouchable
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        animStyle,
      ]}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.98, { damping: 20 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 20 });
      }}
      activeOpacity={1}
    >
      {/* Vertical Accent Stripe */}
      <View
        style={[
          styles.accentStripe,
          {
            backgroundColor: completed ? colors.success : colors.primary + "33",
          },
        ]}
      />

      {/* Index Badge */}
      <View
        style={[
          styles.indexBadge,
          { backgroundColor: completed ? colors.success + "1A" : colors.muted },
        ]}
      >
        <Text
          style={[
            styles.indexText,
            { color: completed ? colors.success : colors.mutedForeground },
          ]}
        >
          {index + 1}
        </Text>
      </View>

      <View style={styles.textCol}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, { color: colors.foreground }]}
            numberOfLines={2}
          >
            {lecture.name}
          </Text>
          {hasNewCards && (
            <View
              style={[styles.newBadge, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
        </View>

        <View style={styles.metaRow}>
          {lecture.card_count != null && lecture.card_count > 0 && (
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {lecture.card_count} cards
            </Text>
          )}
          {isCached && !hasNewCards && (
            <View style={styles.cachedChip}>
              <Feather name="download" size={9} color={colors.primary} />
              <Text style={[styles.cachedText, { color: colors.primary }]}>
                downloaded
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Right icon */}
      {completed ? (
        <View
          style={[
            styles.checkCircle,
            { backgroundColor: colors.success + "1A" },
          ]}
        >
          <Feather name="check" size={14} color={colors.success} />
        </View>
      ) : (
        <View
          style={[styles.playIcon, { backgroundColor: colors.primary + "1A" }]}
        >
          <Feather name="play-circle" size={18} color={colors.primary} />
        </View>
      )}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 16,
    paddingRight: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  accentStripe: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  indexBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 16,
    marginRight: 12,
  },
  indexText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  textCol: { flex: 1, gap: 3 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  title: {
    fontSize: 18,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.4,
    lineHeight: 24,
    flexShrink: 1,
  },
  newBadge: {
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  newBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.5,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  cachedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  cachedText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  playIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
