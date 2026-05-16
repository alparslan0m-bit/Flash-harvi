import { Feather } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useSessionAnimation } from "@/hooks/useSessionAnimation";
import { getRingColor, getGrade, getTitle } from "@/utils/sessionHelpers";

export interface CardResultsProps {
  masteryRate: number;
  againCount: number;
  hardCount: number;
  goodCount: number;
  totalCount: number;
  lectureName?: string;
  onRetry: () => void;
  onReview: () => void;
  onHome: () => void;
}

export function CardResultsView({ masteryRate, againCount, hardCount, goodCount, totalCount, lectureName, onRetry, onReview, onHome }: CardResultsProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { displayScore, ringAnimStyle } = useSessionAnimation(masteryRate);
  const ringColor = getRingColor(masteryRate, colors);
  const grade = getGrade(masteryRate);
  const { text: titleText, icon: feedbackIcon } = getTitle(masteryRate);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={[st.scroll, { paddingBottom: insets.bottom + 48, paddingTop: insets.top + 32 }]} showsVerticalScrollIndicator={false}>
        {/* Mastery Ring */}
        <Animated.View style={[st.ringWrap, ringAnimStyle]}>
          <View style={[st.ringOuter, { borderColor: ringColor + "20" }]}>
            <View style={[st.ringInner, { borderColor: ringColor }]}>
              <View style={st.scoreRow}>
                <Text style={[st.scoreNum, { color: ringColor }]}>{displayScore}</Text>
                <Text style={[st.scorePct, { color: ringColor }]}>%</Text>
              </View>
              <Text style={[st.gradeHint, { color: ringColor + "99" }]}>mastery</Text>
            </View>
          </View>
          <View style={[st.gradeBadge, { backgroundColor: ringColor }]}>
            <Text style={st.gradeText}>{grade}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400).springify()} style={st.titleGroup}>
          <View style={st.titleRow}>
            <Text style={[st.title, { color: colors.foreground }]}>{titleText}</Text>
            <Feather name={feedbackIcon} size={28} color={ringColor} />
          </View>
        </Animated.View>

        {/* Stat Pills */}
        <Animated.View entering={FadeInDown.delay(300).duration(400).springify()} style={st.pills}>
          {[
            { v: againCount, l: "Again", c: colors.destructive, i: "x-circle" as const },
            { v: hardCount, l: "Hard", c: colors.warning, i: "alert-circle" as const },
            { v: goodCount, l: "Good", c: colors.success, i: "check-circle" as const },
          ].map((p) => (
            <View key={p.l} style={[st.pill, { backgroundColor: p.c + "14", borderColor: p.c + "35" }]}>
              <Feather name={p.i} size={18} color={p.c} />
              <Text style={[st.pillNum, { color: colors.foreground }]}>{p.v}</Text>
              <Text style={[st.pillLabel, { color: colors.mutedForeground }]}>{p.l}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View entering={FadeInDown.delay(500).duration(400).springify()} style={st.btnGroup}>
          <TouchableOpacity style={[st.btn, st.primaryBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]} onPress={onRetry} activeOpacity={0.88}>
            <Feather name="refresh-cw" size={18} color="#fff" />
            <Text style={[st.btnText, { color: "#fff" }]}>Study Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[st.btn, { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border }]} onPress={onReview} activeOpacity={0.88}>
            <Feather name="list" size={18} color={colors.foreground} />
            <Text style={[st.btnText, { color: colors.foreground }]}>Review Cards</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[st.btn, { backgroundColor: "transparent", marginTop: 4 }]} onPress={onHome} activeOpacity={0.7}>
            <Feather name="home" size={18} color={colors.mutedForeground} />
            <Text style={[st.btnText, { color: colors.mutedForeground }]}>Go Home</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  scroll: { alignItems: "center", paddingHorizontal: 24, paddingTop: 8 },
  ringWrap: { alignItems: "center", marginBottom: 28 },
  ringOuter: { width: 170, height: 170, borderRadius: 85, borderWidth: 14, alignItems: "center", justifyContent: "center" },
  ringInner: { width: 138, height: 138, borderRadius: 69, borderWidth: 8, alignItems: "center", justifyContent: "center", gap: 2 },
  scoreRow: { flexDirection: "row", alignItems: "flex-end", gap: 2 },
  scoreNum: { fontSize: 48, fontFamily: "Nunito_800ExtraBold", letterSpacing: -1 },
  scorePct: { fontSize: 20, fontFamily: "Nunito_800ExtraBold", letterSpacing: -0.5, marginBottom: 6 },
  gradeHint: { fontSize: 11, fontFamily: "Inter_400Regular", letterSpacing: 0.2 },
  gradeBadge: { position: "absolute", bottom: 4, right: 4, width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  gradeText: { fontSize: 19, fontFamily: "Inter_800ExtraBold", color: "#fff" },
  titleGroup: { alignItems: "center", marginBottom: 28, width: "100%" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { fontSize: 32, fontFamily: "Nunito_800ExtraBold", letterSpacing: -0.9, textAlign: "center" },
  pills: { flexDirection: "row", gap: 10, width: "100%", marginBottom: 16 },
  pill: { flex: 1, alignItems: "center", paddingVertical: 18, paddingHorizontal: 6, borderRadius: 22, borderWidth: 1, gap: 6 },
  pillNum: { fontSize: 24, fontFamily: "Nunito_800ExtraBold", letterSpacing: -0.8 },
  pillLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  btnGroup: { gap: 12, width: "100%", marginTop: 8 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18, borderRadius: 24 },
  primaryBtn: { shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 4 },
  btnText: { fontSize: 17, fontFamily: "Nunito_800ExtraBold", letterSpacing: 0 },
});
