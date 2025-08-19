import React, {createContext, useContext, useState, useEffect} from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("theme");
        if (saved === "dark") setIsDark(true);
    }, []);

    useEffect(() => {
        if (isDark) {
            document.body.classList.add("dark-mode");
            localStorage.setItem("theme", "dark");
        } else {
            document.body.classList.remove("dark-mode");
            localStorage.setItem("theme", "light");
        }
    }, [isDark]);

    const toggleTheme = () => setIsDark((prev) => !prev);

    return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
    return useContext(ThemeContext);
}