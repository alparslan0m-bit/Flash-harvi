import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { AVATARS, AvatarId } from "./DoctorAvatars";

interface Props {
  visible: boolean;
  current: AvatarId | null;
  onSelect: (id: AvatarId) => void;
  onClose: () => void;
}

export function AvatarPicker({ visible, current, onSelect, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const males   = AVATARS.filter((a) => a.id.startsWith("male_"));
  const females = AVATARS.filter((a) => a.id.startsWith("female_"));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Dim backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Sheet */}
      <View style={[styles.sheet, {
        backgroundColor: colors.background,
        paddingBottom: insets.bottom + 16,
      }]}>
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {/* Header */}
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
            Choose your avatar
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Male section */}
          <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>
            MALE DOCTOR
          </Text>
          <View style={styles.grid}>
            {males.map((avatar) => {
              const selected = current === avatar.id;
              const C = avatar.component;
              return (
                <TouchableOpacity
                  key={avatar.id}
                  style={[
                    styles.avatarCell,
                    {
                      backgroundColor: selected ? colors.primary + "18" : colors.card,
                      borderColor: selected ? colors.primary : colors.border,
                      borderWidth: selected ? 2.5 : 1,
                    },
                  ]}
                  onPress={() => {
                    onSelect(avatar.id);
                    onClose();
                  }}
                  activeOpacity={0.8}
                >
                  <C size={72} />
                  {selected && (
                    <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
                      <Feather name="check" size={10} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Female section */}
          <Text style={[styles.groupLabel, { color: colors.mutedForeground, marginTop: 8 }]}>
            FEMALE DOCTOR
          </Text>
          <View style={styles.grid}>
            {females.map((avatar) => {
              const selected = current === avatar.id;
              const C = avatar.component;
              return (
                <TouchableOpacity
                  key={avatar.id}
                  style={[
                    styles.avatarCell,
                    {
                      backgroundColor: selected ? colors.primary + "18" : colors.card,
                      borderColor: selected ? colors.primary : colors.border,
                      borderWidth: selected ? 2.5 : 1,
                    },
                  ]}
                  onPress={() => {
                    onSelect(avatar.id);
                    onClose();
                  }}
                  activeOpacity={0.8}
                >
                  <C size={72} />
                  {selected && (
                    <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
                      <Feather name="check" size={10} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "72%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.4,
  },
  groupLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginBottom: 12,
    marginLeft: 2,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  avatarCell: {
    width: "30%",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    position: "relative",
  },
  checkBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
