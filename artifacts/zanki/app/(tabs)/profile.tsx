import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useScrollToTop } from "@react-navigation/native";
import React, { useCallback, useRef } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProfileHeroCard, AccountActions } from "@/components";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useProfileData } from "@/hooks/useProfileData";

import { useScreenAnimation } from "@/hooks/useScreenAnimation";

/**
 * ProfileScreen - Refactored to be thin and readable.
 * Follows Phase 7 of the Senior Refactor Skill.
 */
export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { avatarId, displayName } = useProfileData();

  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  // Reusable screen transition animation
  const { fadeAnim, translateY } = useScreenAnimation(scrollRef);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const initial = (user?.email?.[0] ?? "U").toUpperCase();
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* --- Fixed Header --- */}
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
          Profile
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Manage your medical account
        </Text>
      </View>

      <Animated.View
        style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY }] }}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 100 },
          ]}
        >
          {/* --- Hero Section --- */}
          <ProfileHeroCard
            avatarId={avatarId}
            displayName={displayName}
            email={user?.email}
            memberSince={memberSince}
            initial={initial}
          />


          <AccountActions userId={user?.id} onSignOut={signOut} />

          <Text style={[styles.versionText, { color: colors.mutedForeground }]}>
            Zanki · v1.0.0
          </Text>
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
  title: {
    fontSize: 38,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", marginTop: -2 },
  content: { paddingTop: 12, paddingHorizontal: 20 },
  versionText: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 12,
    marginBottom: 12,
  },
});
