import React from 'react';
import { Platform } from 'react-native';
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";

interface TabIconProps {
  name: keyof typeof Feather.glyphMap;
  sfName: string;
  color: string;
  size?: number;
}

/**
 * A platform-aware tab icon component.
 * Uses SymbolView on iOS and Feather icons on other platforms.
 */
export function TabIcon({ name, sfName, color, size = 22 }: TabIconProps) {
  if (Platform.OS === 'ios') {
    // SymbolView names are typed in expo-symbols, using any to allow dynamic names
    return <SymbolView name={sfName as any} tintColor={color} size={size + 2} />;
  }
  return <Feather name={name} size={size} color={color} />;
}
