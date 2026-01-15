import { StyleSheet, View, TouchableOpacity, Platform } from "react-native";
import React, { useContext } from "react";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";
import ThemedText from "./ThemedText";
import { ThemeContext } from "../context/ThemeContext";

const FooterNav = ({ onMenuPress }) => {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;
  const isWeb = Platform.OS === "web";

  // Define different tabs for web and mobile
  const mobileTabs = [
    {
      name: "Home",
      icon: "home",
      iconFilled: "home",
      route: "/dashboard",
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

  const webTabs = [
    {
      name: "Menu",
      icon: "menu-outline",
      iconFilled: "menu",
      isMenu: true,
    },
    {
      name: "Home",
      icon: "home-outline",
      iconFilled: "home",
      route: "/dashboard",
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

  // Use web tabs if on web, mobile tabs otherwise
  const tabs = isWeb ? webTabs : mobileTabs;

  const isActive = (route) => {
    if (!route) return false; // Menu button doesn't have a route
    if (route === "/") {
      return pathname === "/" || pathname === "/index";
    }
    return pathname === route;
  };

  // Get icon color based on theme and active state
  const getIconColor = (active, isMenu = false) => {
    if (isMenu) {
      // Menu button always uses the same color scheme
      return scheme === "dark" ? "#FFFFFF" : "#000000";
    }

    if (active) {
      return Colors.primary; // Active tabs use primary color
    }
    // Inactive tabs: light in dark mode, dark in light mode
    return scheme === "dark" ? "#FFFFFF" : "#000000";
  };

  const handleTabPress = (tab) => {
    if (tab.isMenu && onMenuPress) {
      // Call the menu press handler for hamburger icon
      onMenuPress();
    } else if (tab.route && !isActive(tab.route)) {
      // Navigate to the route
      router.push(tab.route);
    }
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
        const iconColor = getIconColor(active, tab.isMenu);

        return (
          <TouchableOpacity
            key={index}
            style={[
              styles.tab,
              tab.isMenu && styles.menuTab, // Optional: different styling for menu
            ]}
            onPress={() => handleTabPress(tab)}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Ionicons
                name={active ? tab.iconFilled : tab.icon}
                size={tab.isMenu ? 28 : 26} // Slightly larger for menu icon
                color={iconColor}
              />
              {!tab.isMenu && active && (
                <View
                  style={[
                    styles.activeIndicator,
                    { backgroundColor: Colors.primary },
                  ]}
                />
              )}
              {/* Special indicator for menu button */}
              {tab.isMenu && (
                <View
                  style={[
                    styles.menuIndicator,
                    {
                      backgroundColor:
                        scheme === "dark" ? "#FFFFFF" : "#000000",
                    },
                  ]}
                />
              )}
            </View>
            <ThemedText
              style={[
                styles.label,
                {
                  color: iconColor,
                  fontWeight: active || tab.isMenu ? "600" : "500",
                  opacity: tab.isMenu ? 0.9 : 1,
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
    flex: 1,
  },
  menuTab: {
    // Optional: You can add special styling for menu tab
  },
  iconContainer: {
    position: "relative",
    marginBottom: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 12,
    marginTop: 2,
  },
  activeIndicator: {
    position: "absolute",
    top: -8,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  menuIndicator: {
    position: "absolute",
    top: -6,
    width: 6,
    height: 2,
    borderRadius: 1,
    opacity: 0.7,
  },
});
