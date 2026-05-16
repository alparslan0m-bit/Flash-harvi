import { Feather } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import type { RatedCard } from "@/types";

interface Props {
  history: RatedCard[];
  totalCount: number;
  topPad: number;
  onBack: () => void;
}

const RCFG = {
  again: { label: "Again", color: "destructive" as const, icon: "x-circle" as const },
  hard: { label: "Hard", color: "warning" as const, icon: "alert-circle" as const },
  good: { label: "Good", color: "success" as const, icon: "check-circle" as const },
};

export function CardReviewScreen({ history, totalCount, topPad, onBack }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const againC = history.filter((h) => h.rating === "again").length;
  const hardC = history.filter((h) => h.rating === "hard").length;
  const goodC = history.filter((h) => h.rating === "good").length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[s.header, { paddingTop: topPad + 14, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={[s.backBtn, { backgroundColor: colors.muted }]} activeOpacity={0.75}>
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={[s.headerTitle, { color: colors.foreground }]}>Review Cards</Text>
          <Text style={[s.headerSub, { color: colors.mutedForeground }]}>{totalCount} flashcard{totalCount !== 1 ? "s" : ""}</Text>
        </View>
      </View>
      <View style={[s.strip, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {[{ n: againC, l: "Again", c: colors.destructive }, { n: hardC, l: "Hard", c: colors.warning }, { n: goodC, l: "Good", c: colors.success }].map((it, i) => (
          <React.Fragment key={it.l}>
            {i > 0 && <View style={[s.div, { backgroundColor: colors.border }]} />}
            <View style={s.si}><View style={[s.dot, { backgroundColor: it.c }]} /><Text style={[s.sn, { color: it.c }]}>{it.n}</Text><Text style={[s.sl, { color: colors.mutedForeground }]}>{it.l}</Text></View>
          </React.Fragment>
        ))}
      </View>
      <ScrollView contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        {history.map((item, idx) => {
          const cfg = RCFG[item.rating];
          const ac = colors[cfg.color];
          return (
            <Animated.View key={idx} entering={FadeInDown.delay(idx * 40).duration(350).springify()} style={[s.card, { backgroundColor: colors.card, borderColor: ac + "4D" }]}>
              <View style={[s.ch, { backgroundColor: ac + "12", borderBottomColor: ac + "4D" }]}>
                <View style={[s.nb, { backgroundColor: ac + "22" }]}><Text style={[s.nt, { color: ac }]}>#{idx + 1}</Text></View>
                <Text style={[s.cs, { color: ac }]}>{cfg.label}</Text>
                <Feather name={cfg.icon} size={17} color={ac} />
              </View>
              <View style={s.cb}>
                <Text style={[s.fl, { color: colors.mutedForeground }]}>FRONT</Text>
                <Text style={[s.ft, { color: colors.foreground }]}>{item.card.front}</Text>
                <View style={[s.sep, { borderTopColor: colors.border }]} />
                <Text style={[s.fl, { color: colors.primary }]}>BACK</Text>
                <Text style={[s.ft, { color: colors.foreground }]}>{item.card.back}</Text>
              </View>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 28, fontFamily: "Nunito_800ExtraBold", letterSpacing: -0.5 },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 1 },
  strip: { flexDirection: "row", alignItems: "center", paddingVertical: 16, paddingHorizontal: 24, borderBottomWidth: StyleSheet.hairlineWidth },
  si: { flex: 1, alignItems: "center", gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  sn: { fontSize: 24, fontFamily: "Nunito_800ExtraBold", letterSpacing: -0.8 },
  sl: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  div: { width: 1, height: 38, marginHorizontal: 8 },
  list: { padding: 16, gap: 16 },
  card: { borderRadius: 26, borderWidth: 1.5, overflow: "hidden" },
  ch: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  nb: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  nt: { fontSize: 12, fontFamily: "Inter_800ExtraBold", letterSpacing: 0.2 },
  cs: { flex: 1, fontSize: 14, fontFamily: "Inter_700Bold" },
  cb: { padding: 18, gap: 6 },
  fl: { fontSize: 10, fontFamily: "Inter_800ExtraBold", letterSpacing: 0.8 },
  ft: { fontSize: 16, fontFamily: "Inter_500Medium", lineHeight: 23 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, marginVertical: 10 },
});
