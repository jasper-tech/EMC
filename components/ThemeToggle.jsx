import { TouchableOpacity, StyleSheet } from "react-native";
import React, { useContext } from "react";
import { Colors } from "../constants/Colors";
import ThemedText from "./ThemedText";
import { ThemeContext } from "../context/ThemeContext";

const ThemeToggle = () => {
  const { scheme, toggleScheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;
  const isDark = scheme === "dark";

  return (
    <TouchableOpacity
      style={[styles.toggle, { backgroundColor: theme.uiBackground }]}
      onPress={toggleScheme}
    >
      <ThemedText style={styles.icon}>{isDark ? "☀️" : "🌙"}</ThemedText>
    </TouchableOpacity>
  );
};

export default ThemeToggle;

const styles = StyleSheet.create({
  toggle: {
    padding: 10,
    borderRadius: 20,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 20,
  },
});
