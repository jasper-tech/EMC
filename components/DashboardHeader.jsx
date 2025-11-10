import { StyleSheet, View, TouchableOpacity, Platform } from "react-native";
import React, { useContext } from "react";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import ThemedText from "./ThemedText";
import ThemeToggle from "./ThemeToggle";
import { Colors } from "../constants/Colors";
import { ThemeContext } from "../context/ThemeContext";

const DashboardHeader = ({
  unionName = "Students Union",
  userRole = "Admin",
  onProfilePress,
  //   onNotificationPress,
  //   hasStackHeader = false,
}) => {
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;

  const getCurrentGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const getCurrentDate = () => {
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return new Date().toLocaleDateString("en-US", options);
  };

  return (
    <View style={[styles.header, { backgroundColor: theme.navBackground }]}>
      <View style={styles.topRow}>
        <View style={styles.unionInfo}>
          <View
            style={[
              styles.logoContainer,
              { backgroundColor: `${Colors.primary}15` },
            ]}
          >
            <MaterialCommunityIcons
              name="school"
              size={28}
              color={Colors.primary}
            />
          </View>
          <View style={styles.textContainer}>
            <ThemedText type="title" style={styles.unionName}>
              {unionName}
            </ThemedText>
            <View style={styles.greetingRow}>
              <Ionicons
                name="sunny"
                size={14}
                color={theme.text}
                style={styles.greetingIcon}
              />
              <ThemedText style={styles.greeting}>
                {getCurrentGreeting()}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.rightSection}>
          {/* Notification Button */}
          {/* <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.uiBackground }]}
            onPress={onNotificationPress}
            activeOpacity={0.7}
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={theme.text}
            />
            <View style={[styles.badge, { backgroundColor: Colors.primary }]}>
              <ThemedText style={styles.badgeText}>3</ThemedText>
            </View>
          </TouchableOpacity> */}

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Profile Button */}
          <TouchableOpacity
            style={[
              styles.profileButton,
              { backgroundColor: theme.uiBackground },
            ]}
            onPress={onProfilePress}
            activeOpacity={0.7}
          >
            <Ionicons name="person" size={20} color={theme.text} />
            <View
              style={[styles.roleBadge, { backgroundColor: Colors.primary }]}
            >
              <ThemedText style={styles.roleText}>
                {userRole.substring(0, 1)}
              </ThemedText>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Row */}
      <View style={styles.dateRow}>
        <Ionicons
          name="calendar-outline"
          size={14}
          color={theme.text}
          style={styles.dateIcon}
        />
        <ThemedText style={styles.date}>{getCurrentDate()}</ThemedText>
      </View>
    </View>
  );
};

export default DashboardHeader;

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  unionInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  unionName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 2,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  greetingIcon: {
    marginRight: 4,
    opacity: 0.7,
  },
  greeting: {
    fontSize: 13,
    opacity: 0.7,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#fff",
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  roleBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  roleText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#fff",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  dateIcon: {
    marginRight: 6,
    opacity: 0.6,
  },
  date: {
    fontSize: 12,
    opacity: 0.6,
    fontWeight: "500",
  },
});
