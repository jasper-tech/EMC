import React, { createContext, useState, useEffect } from "react";
import { useColorScheme } from "react-native";

export const ThemeContext = createContext({
  scheme: "light",
  toggleScheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const system = useColorScheme() ?? "light";
  const [scheme, setScheme] = useState(system);

  // Keep initial value in sync with system changes, but allow app control afterwards
  useEffect(() => {
    setScheme(system);
  }, [system]);

  const toggleScheme = () =>
    setScheme((s) => (s === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ scheme, toggleScheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
