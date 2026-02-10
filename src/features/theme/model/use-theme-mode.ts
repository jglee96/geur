import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

export function useThemeMode() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem("theme_mode");
    return isThemeMode(stored) ? stored : "system";
  });

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const isDark =
        themeMode === "dark" || (themeMode === "system" && media.matches);
      root.classList.toggle("dark", isDark);
      root.style.colorScheme = isDark ? "dark" : "light";
    };

    applyTheme();
    localStorage.setItem("theme_mode", themeMode);

    if (themeMode !== "system") return;
    const listener = () => applyTheme();
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [themeMode]);

  return { themeMode, setThemeMode } as const;
}
