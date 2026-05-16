import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AvatarById, AvatarId } from "@/components/DoctorAvatars";
import { useColors } from "@/hooks/useColors";

interface Props {
  avatarId: AvatarId | null;
  displayName: string;
  email: string | undefined;
  memberSince: string | null;
  initial: string;
}

export function ProfileHeroCard({
  avatarId,
  displayName,
  email,
  memberSince,
  initial,
}: Props) {
  const colors = useColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.topSection}>
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <View
            style={[
              styles.avatarRing,
              { backgroundColor: colors.primary + "0A" },
            ]}
          >
            {avatarId ? (
              <View style={[styles.avatarIllustration]}>
                <AvatarById id={avatarId} size={50} />
              </View>
            ) : (
              <View
                style={[
                  styles.avatarInitial,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Text style={styles.avatarInitialText}>{initial}</Text>
              </View>
            )}
          </View>
        </View>

        {/* User Info Stack */}
        <View style={styles.infoStack}>
          <Text
            style={[
              displayName ? styles.heroName : styles.heroNamePlaceholder,
              {
                color: displayName ? colors.foreground : colors.mutedForeground,
              },
            ]}
            numberOfLines={1}
          >
            {displayName || "Add your name"}
          </Text>

          <Text
            style={[styles.heroEmail, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {email}
          </Text>
        </View>

        {/* Edit button */}
        <TouchableOpacity
          style={[styles.editBtn, { backgroundColor: colors.primary + "15" }]}
          onPress={() => router.push("/profile/edit")}
          activeOpacity={0.7}
        >
          <Feather name="edit-3" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {memberSince && (
        <View style={styles.footer}>
          <Feather name="calendar" size={12} color={colors.mutedForeground} />
          <Text style={[styles.memberText, { color: colors.mutedForeground }]}>
            Joined at{" "}
            <Text
              style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}
            >
              {memberSince}
            </Text>
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    marginBottom: 24,
    overflow: "hidden",
  },
  topSection: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  avatarWrap: { flexShrink: 0 },
  avatarRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarIllustration: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarInitial: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitialText: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },

  infoStack: {
    flex: 1,
    justifyContent: "center",
    gap: 2,
  },
  heroName: {
    fontSize: 24,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.5,
  },
  heroNamePlaceholder: {
    fontSize: 20,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  heroEmail: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0,
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  memberText: { fontSize: 11, fontFamily: "Inter_500Medium" },

  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
});
