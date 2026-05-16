import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useScrollToTop } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { YearCard } from "@/components/YearCard";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useHierarchy } from "@/hooks/useHierarchy";

function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const colors = useColors();
  const isRLS =
    error.message.includes("row-level security") ||
    error.message.includes("42501");
  const isMissing =
    (error.message.includes("relation") &&
      error.message.includes("does not exist")) ||
    error.message.includes("42P01");

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.errorContainer}
    >
      <View
        style={[
          styles.errorIcon,
          { backgroundColor: colors.destructive + "1A" },
        ]}
      >
        <Feather name="alert-triangle" size={28} color={colors.destructive} />
      </View>
      <Text style={[styles.errorTitle, { color: colors.foreground }]}>
        {isMissing
          ? "Database tables not found"
          : isRLS
            ? "Access denied"
            : "Could not load content"}
      </Text>
      {isMissing && (
        <View
          style={[
            styles.infoBox,
            {
              backgroundColor: colors.destructive + "1A",
              borderColor: colors.destructive + "33",
            },
          ]}
        >
          <Text style={[styles.infoText, { color: colors.foreground }]}>
            One or more tables (<Text style={styles.mono}>years</Text>,{" "}
            <Text style={styles.mono}>modules</Text>,{" "}
            <Text style={styles.mono}>subjects</Text>,{" "}
            <Text style={styles.mono}>lectures</Text>) are missing.{"\n\n"}
            Go to <Text style={styles.bold}>Supabase → SQL Editor</Text> and run
            your schema migration, then pull-to-refresh.
          </Text>
        </View>
      )}
      {isRLS && (
        <View
          style={[
            styles.infoBox,
            {
              backgroundColor: colors.warning + "1A",
              borderColor: colors.warning + "33",
            },
          ]}
        >
          <Text style={[styles.infoText, { color: colors.foreground }]}>
            Row Level Security is blocking reads.{"\n\n"}
            In{" "}
            <Text style={styles.bold}>
              Supabase → Authentication → Policies
            </Text>
            , add a <Text style={styles.mono}>SELECT</Text> policy for
            authenticated users on <Text style={styles.mono}>years</Text>,{" "}
            <Text style={styles.mono}>modules</Text>,{" "}
            <Text style={styles.mono}>subjects</Text>, and{" "}
            <Text style={styles.mono}>lectures</Text>.
          </Text>
        </View>
      )}
      {!isMissing && !isRLS && (
        <View
          style={[
            styles.infoBox,
            {
              backgroundColor: colors.primary + "1A",
              borderColor: colors.primary + "33",
            },
          ]}
        >
          <Text
            style={[styles.infoText, { color: colors.foreground }]}
            selectable
          >
            {error.message}
          </Text>
        </View>
      )}
      <TouchableOpacity
        style={[styles.retryBtn, { backgroundColor: colors.primary }]}
        onPress={onRetry}
      >
        <Feather name="refresh-cw" size={16} color="#fff" />
        <Text style={styles.retryText}>Try Again</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

export default function LearnScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { session, loading: authLoading } = useAuth();
  const { data: years, isLoading, error, refetch } = useHierarchy();

  useEffect(() => {
    if (!authLoading && !session) {
      router.replace("/auth");
    }
  }, [session, authLoading]);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [15, 0],
  });

  useFocusEffect(
    React.useCallback(() => {
      // Fade and slide in transition
      fadeAnim.setValue(0);
      Animated.spring(fadeAnim, {
        toValue: 1,
        tension: 65,
        friction: 10,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      }, 50);
      return () => clearTimeout(timer);
    }, [fadeAnim]),
  );

  if (isLoading || authLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.header,
            {
              paddingTop: topPad + 14,
              borderBottomColor: "transparent",
              backgroundColor: colors.background,
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.foreground }]}>
            Zanki
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Learn smarter, not harder.
          </Text>
        </View>
        <Animated.View
          style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY }] }}
        >
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text
              style={[styles.loadingText, { color: colors.mutedForeground }]}
            >
              Loading Zanki content...
            </Text>
          </View>
        </Animated.View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.header,
            {
              paddingTop: topPad + 14,
              borderBottomColor: "transparent",
              backgroundColor: colors.background,
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.foreground }]}>
            Zanki
          </Text>
        </View>
        <Animated.View
          style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY }] }}
        >
          <ErrorState error={error as Error} onRetry={refetch} />
        </Animated.View>
      </View>
    );
  }

  const yearCount = years?.length ?? 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Fixed header ──────────────────────────────────────────────── */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 14,
            borderBottomColor: "transparent",
            backgroundColor: colors.background,
          },
        ]}
      >
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: colors.foreground }]}>Zanki</Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Learn smarter, not harder.
        </Text>
      </View>

      <Animated.View
        style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY }] }}
      >
        {/* ── Scrollable content ────────────────────────────────────────── */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {years?.map((year, i) => (
            <YearCard
              key={year.id}
              year={year}
              index={i}
              onPress={() =>
                router.push({
                  pathname: "/year/[id]",
                  params: { id: year.id, index: String(i) },
                })
              }
            />
          ))}

          {(!years || years.length === 0) && (
            <View style={styles.emptyState}>
              <View
                style={[
                  styles.emptyIcon,
                  { backgroundColor: colors.primary + "1A" },
                ]}
              >
                <Feather name="book-open" size={32} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No content yet
              </Text>
              <Text
                style={[styles.emptyText, { color: colors.mutedForeground }]}
              >
                Your content will appear here once years and modules are added
                to your database.
              </Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 38,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", marginTop: -2 },

  content: { paddingTop: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular" },

  emptyState: {
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 60,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },

  errorContainer: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 60,
    gap: 16,
  },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  infoBox: { width: "100%", padding: 16, borderRadius: 14, borderWidth: 1 },
  infoText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  bold: { fontFamily: "Inter_700Bold" },
  mono: { fontFamily: "Inter_600SemiBold" },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  retryText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
