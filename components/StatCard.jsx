import { StyleSheet, View } from "react-native";
import React, { useContext } from "react";
import ThemedCard from "./ThemedCard";
import ThemedText from "./ThemedText";
import { Colors } from "../constants/Colors";
import { ThemeContext } from "../context/ThemeContext";

const StatCard = ({ icon, title, value, subtitle, trend }) => {
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;

  const getTrendColor = () => {
    if (!trend) return theme.text;
    return trend.includes("+") ? "#4CAF50" : "#f44336";
  };

  return (
    <ThemedCard style={styles.card}>
      <View style={styles.iconContainer}>
        <ThemedText style={[styles.icon, { color: theme.iconColor }]}>
          {icon}
        </ThemedText>
      </View>
      <ThemedText style={styles.title}>{title}</ThemedText>
      <ThemedText type="title" style={styles.value}>
        {value}
      </ThemedText>
      {subtitle && <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>}
      {trend && (
        <ThemedText style={[styles.trend, { color: getTrendColor() }]}>
          {trend}
        </ThemedText>
      )}
    </ThemedCard>
  );
};

export default StatCard;

const styles = StyleSheet.create({
  card: {
    width: 160,
    marginRight: 12,
    padding: 16,
  },
  iconContainer: {
    marginBottom: 8,
  },
  icon: {
    fontSize: 28,
  },
  title: {
    fontSize: 12,
    marginBottom: 8,
    opacity: 0.7,
  },
  value: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 2,
  },
  trend: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
});
