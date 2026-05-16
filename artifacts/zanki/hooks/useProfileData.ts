import { useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { STORAGE_KEYS } from "../constants/storage";
import { AvatarId } from "../components/DoctorAvatars";

/**
 * Hook to manage user profile data from AsyncStorage.
 * Extracted from ProfileScreen logic.
 */
export function useProfileData() {
  const [avatarId, setAvatarId] = useState<AvatarId | null>(null);
  const [displayName, setDisplayName] = useState("");

  const loadProfile = useCallback(async () => {
    try {
      const pairs = await AsyncStorage.multiGet([
        STORAGE_KEYS.AVATAR,
        STORAGE_KEYS.DISPLAY_NAME,
      ]);
      
      const av = pairs[0][1];
      const nm = pairs[1][1];

      if (av) setAvatarId(av as AvatarId);
      setDisplayName(nm ?? "");
    } catch (error) {
      console.error("[useProfileData] Error loading profile:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  return { avatarId, displayName, refresh: loadProfile };
}
