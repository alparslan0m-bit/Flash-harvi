import { useColorScheme } from "react-native";

import colors from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";

export function useColors() {
  const { theme } = useTheme();
  const systemScheme = useColorScheme();

  const activeTheme = theme === "system" ? (systemScheme || "light") : theme;
  
  const palette = (colors as any)[activeTheme] || colors.light;

  return { ...palette, radius: colors.radius };
}
