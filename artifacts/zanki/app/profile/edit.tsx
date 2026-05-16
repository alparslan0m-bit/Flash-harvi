import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvatarPicker } from "@/components/AvatarPicker";
import { AvatarById, AvatarId } from "@/components/DoctorAvatars";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";

const AVATAR_KEY = "zanki:avatar";
const NAME_KEY = "zanki:displayName";

export default function EditProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  const [avatarId, setAvatarId] = useState<AvatarId | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const nameRef = useRef<TextInput>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const initial = (user?.email?.[0] ?? "U").toUpperCase();

  useEffect(() => {
    AsyncStorage.multiGet([AVATAR_KEY, NAME_KEY]).then((pairs) => {
      const av = pairs[0][1];
      const nm = pairs[1][1];
      if (av) setAvatarId(av as AvatarId);
      if (nm) setNameInput(nm);
    });
  }, []);

  const handleSelectAvatar = (id: AvatarId) => {
    setAvatarId(id);
    AsyncStorage.setItem(AVATAR_KEY, id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = async () => {
    const trimmed = nameInput.trim();
    await AsyncStorage.setItem(NAME_KEY, trimmed);
    if (avatarId) await AsyncStorage.setItem(AVATAR_KEY, avatarId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <View style={[editStyles.root, { backgroundColor: colors.background }]}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={[editStyles.header, {
        paddingTop: topPad + 14,
        borderBottomColor: "transparent",
        backgroundColor: colors.background,
      }]}>
        <TouchableOpacity
          style={[editStyles.backBtn, { backgroundColor: colors.muted }]}
          onPress={handleCancel}
          activeOpacity={0.75}
        >
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </TouchableOpacity>

        <Text style={[editStyles.headerTitle, { color: colors.foreground }]}>Edit Profile</Text>

        <TouchableOpacity
          style={[editStyles.headerBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          activeOpacity={0.88}
        >
          <Text style={[editStyles.headerBtnText, { color: "#fff" }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[editStyles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── Avatar ───────────────────────────────────────────────────── */}
        <View style={editStyles.avatarSection}>
          <TouchableOpacity
            onPress={() => setPickerVisible(true)}
            activeOpacity={0.8}
            style={editStyles.avatarWrap}
          >
            <View style={[editStyles.avatarRing, { borderColor: colors.primary }]}>
              {avatarId ? (
                <View style={[editStyles.avatarInner, { backgroundColor: colors.primary + "1A" }]}>
                  <AvatarById id={avatarId} size={86} />
                </View>
              ) : (
                <View style={[editStyles.avatarInner, { backgroundColor: colors.primary }]}>
                  <Text style={editStyles.avatarInitialText}>{initial}</Text>
                </View>
              )}
            </View>
            <View style={[editStyles.editBadge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
              <Feather name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={[editStyles.avatarHint, { color: colors.mutedForeground }]}>
            Tap to change medical avatar
          </Text>
        </View>

        {/* ── Name field ───────────────────────────────────────────────── */}
        <View style={editStyles.fieldGroup}>
          <Text style={[editStyles.fieldLabel, { color: colors.mutedForeground }]}>DISPLAY NAME</Text>
          <View style={[editStyles.fieldBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[editStyles.innerBorder, { borderColor: "rgba(255,255,255,0.1)" }]} />
            <Feather name="user" size={16} color={colors.mutedForeground} style={editStyles.fieldIcon} />
            <TextInput
              ref={nameRef}
              style={[editStyles.fieldInput, { color: colors.foreground }]}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Your name"
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="done"
              onSubmitEditing={handleSave}
              maxLength={40}
              autoCapitalize="words"
            />
            {nameInput.length > 0 && (
              <TouchableOpacity onPress={() => setNameInput("")} activeOpacity={0.7}>
                <Feather name="x-circle" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Email field (read-only) ───────────────────────────────────── */}
        <View style={editStyles.fieldGroup}>
          <Text style={[editStyles.fieldLabel, { color: colors.mutedForeground }]}>EMAIL</Text>
          <View style={[editStyles.fieldBox, { backgroundColor: colors.muted + "80", borderColor: colors.border }]}>
            <Feather name="mail" size={16} color={colors.mutedForeground} style={editStyles.fieldIcon} />
            <Text style={[editStyles.fieldReadOnly, { color: colors.mutedForeground }]} numberOfLines={1}>
              {user?.email}
            </Text>
            <Feather name="lock" size={13} color={colors.mutedForeground} />
          </View>
          <Text style={[editStyles.fieldNote, { color: colors.mutedForeground }]}>
            Primary account email (secured)
          </Text>
        </View>
        
        {/* ── Appearance ────────────────────────────────────────────────── */}
        <View style={editStyles.fieldGroup}>
          <Text style={[editStyles.fieldLabel, { color: colors.mutedForeground }]}>APPEARANCE</Text>
          <View style={editStyles.themeRow}>
            {[
              { id: "zanki", label: "Zanki", icon: "activity" },
              { id: "dark", label: "Dark", icon: "moon" },
              { id: "pink", label: "Pink", icon: "heart" },
            ].map((item) => {
              const active = theme === item.id;
              const accent = item.id === "pink" ? "#db2777" : colors.primary;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    editStyles.themeBtn,
                    { 
                      backgroundColor: active ? (item.id === "pink" ? "#db27771A" : colors.primary + "1A") : colors.card,
                      borderColor: active ? accent : colors.border,
                    }
                  ]}
                  onPress={() => {
                    setTheme(item.id as any);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }}
                  activeOpacity={0.75}
                >
                  <Feather 
                    name={item.icon as any} 
                    size={16} 
                    color={active ? accent : colors.mutedForeground} 
                  />
                  <Text style={[
                    editStyles.themeBtnText, 
                    { color: active ? accent : colors.mutedForeground }
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Save button ──────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[editStyles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          activeOpacity={0.88}
        >
          <Feather name="check" size={18} color="#fff" />
          <Text style={editStyles.saveBtnText}>Save Changes</Text>
        </TouchableOpacity>

      </ScrollView>

      <AvatarPicker
        visible={pickerVisible}
        current={avatarId}
        onSelect={handleSelectAvatar}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}

const editStyles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  headerBtnText: { fontSize: 14, fontFamily: "Nunito_800ExtraBold" },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerTitle: { fontSize: 24, fontFamily: "Nunito_800ExtraBold", letterSpacing: -0.5 },

  content: { paddingHorizontal: 24, paddingTop: 26 },

  avatarSection: { alignItems: "center", marginBottom: 32 },
  avatarWrap: { position: "relative" },
  avatarRing: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarInitialText: { fontSize: 40, fontFamily: "Inter_700Bold", color: "#fff" },
  editBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarHint: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 12 },

  fieldGroup: { marginBottom: 24 },
  fieldLabel: {
    fontSize: 11,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 2,
  },
  fieldBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    position: "relative",
    overflow: "hidden",
  },
  innerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 1.5,
    zIndex: 1,
  },
  fieldIcon: { flexShrink: 0, zIndex: 2 },
  fieldInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    padding: 0,
    zIndex: 2,
  },
  fieldReadOnly: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    zIndex: 2,
  },
  fieldNote: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 8,
    marginLeft: 2,
  },

  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 24,
    marginTop: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  saveBtnText: { fontSize: 17, fontFamily: "Nunito_800ExtraBold", color: "#fff" },
  themeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  themeBtn: {
    flex: 1,
    minWidth: "45%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  themeBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
