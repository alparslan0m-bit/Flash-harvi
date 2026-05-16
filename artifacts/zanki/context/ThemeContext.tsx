import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Appearance } from "react-native";

export type ThemeMode = "zanki" | "dark" | "pink";

interface ThemeCtx {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

const Ctx = createContext<ThemeCtx>({
  theme: "zanki",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("zanki");

  useEffect(() => {
    AsyncStorage.getItem("zanki:theme").then((saved) => {
      if (saved === "zanki" || saved === "dark" || saved === "pink") {
        setThemeState(saved as ThemeMode);
        if (saved === "zanki" || saved === "pink") {
          Appearance.setColorScheme("light");
        } else if (saved === "dark") {
          Appearance.setColorScheme("dark");
        }
      }
    }).catch(() => {});
  }, []);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    AsyncStorage.setItem("zanki:theme", newTheme).catch(() => {});
    if (newTheme === "zanki" || newTheme === "pink") {
      Appearance.setColorScheme("light");
    } else {
      Appearance.setColorScheme("dark");
    }
  };

  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  return useContext(Ctx);
}
