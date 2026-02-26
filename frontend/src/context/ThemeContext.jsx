import { useEffect, useState } from "react";
import { ThemeContext } from "./theme-context";

export default function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") return true;
    if (stored === "light") return false;
    // Default to light mode for predictable UI, unless user explicitly selects dark.
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;

    if (darkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode((prev) => !prev);
  };

  return (
    <ThemeContext.Provider
      value={{
        darkMode,
        theme: darkMode ? "dark" : "light",
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
