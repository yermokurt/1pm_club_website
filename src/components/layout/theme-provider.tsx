"use client";
import { createContext, useContext, useEffect, useState } from "react";
type Theme = "blue" | "purple" | "mono";
const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "blue",
  toggle: () => {},
});
export const useTheme = () => useContext(ThemeContext);
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("blue");
  useEffect(() => {
    const saved = window.localStorage.getItem("1pm-theme") as Theme | null;
    if (saved === "purple" || saved === "mono") setTheme(saved);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("1pm-theme", theme);
  }, [theme]);
  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggle: () =>
          setTheme((value) => (value === "blue" ? "purple" : value === "purple" ? "mono" : "blue")),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
