import { StyleSheet, View, TouchableOpacity } from "react-native";
import React, { useContext } from "react";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";
import ThemedText from "./ThemedText";
import { ThemeContext } from "../context/ThemeContext";

const FooterNav = () => {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;

  const tabs = [
    {
      name: "Home",
      icon: "home",
      iconFilled: "home",
      route: "/",
    },
    {
      name: "About",
      icon: "information-circle-outline",
      iconFilled: "information-circle",
      route: "/about",
    },
    {
      name: "Reports",
      icon: "bar-chart-outline",
      iconFilled: "bar-chart",
      route: "/reports",
    },
  ];

  const isActive = (route) => {
    if (route === "/") {
      return pathname === "/" || pathname === "/index";
    }
    return pathname === route;
  };

  // Get icon color based on theme and active state
  const getIconColor = (active) => {
    if (active) {
      return Colors.primary; // Active tabs use primary color
    }
    // Inactive tabs: light in dark mode, dark in light mode
    return scheme === "dark" ? "#FFFFFF" : "#000000";
  };

  return (
    <View
      style={[
        styles.footer,
        {
          backgroundColor: theme.navBackground,
          paddingBottom: Math.max(12, insets.bottom),
        },
      ]}
    >
      {tabs.map((tab, index) => {
        const active = isActive(tab.route);
        const iconColor = getIconColor(active);

        return (
          <TouchableOpacity
            key={index}
            style={styles.tab}
            onPress={() => router.push(tab.route)}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Ionicons
                name={active ? tab.iconFilled : tab.icon}
                size={26}
                color={iconColor}
              />
              {active && (
                <View
                  style={[
                    styles.activeIndicator,
                    { backgroundColor: Colors.primary },
                  ]}
                />
              )}
            </View>
            <ThemedText
              style={[
                styles.label,
                {
                  color: iconColor,
                  fontWeight: active ? "600" : "500",
                },
              ]}
            >
              {tab.name}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default FooterNav;

const styles = StyleSheet.create({
  footer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(150,150,150,0.2)",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  iconContainer: {
    position: "relative",
    marginBottom: 4,
    alignItems: "center",
  },
  label: {
    fontSize: 12,
  },
  activeIndicator: {
    position: "absolute",
    top: -8,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
