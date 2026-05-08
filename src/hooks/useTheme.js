import { useEffect, useState } from "react";

const THEME_STORAGE_KEY = "crmTheme";

function getInitialTheme() {
  if (typeof window === "undefined") return "light";

  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || "light";
  } catch {
    return "light";
  }
}

function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}

    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  }

  return { theme, setTheme, toggleTheme };
}

export default useTheme;
