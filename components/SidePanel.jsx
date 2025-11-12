import {
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import React, { useContext } from "react";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import ThemedText from "./ThemedText";
import { Colors } from "../constants/Colors";
import { ThemeContext } from "../context/ThemeContext";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { router } from "expo-router";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PANEL_WIDTH = SCREEN_WIDTH * 0.75; // 75% of screen width

const SidePanel = ({
  userName = "John Doe",
  userRole = "Admin",
  userAvatar = null,
  isOpen,
  onClose,
}) => {
  const { scheme, toggleScheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;

  const translateX = useSharedValue(isOpen ? 0 : -PANEL_WIDTH);

  React.useEffect(() => {
    translateX.value = withSpring(isOpen ? 0 : -PANEL_WIDTH, {
      damping: 20,
      stiffness: 90,
    });
  }, [isOpen]);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isOpen ? 0.5 : 0, { duration: 300 }),
    pointerEvents: isOpen ? "auto" : "none",
  }));

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      onClose();
      router.replace("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

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
    <>
      {/* Overlay */}
      <Animated.View
        style={[styles.overlay, overlayStyle]}
        pointerEvents={isOpen ? "auto" : "none"}
      >
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>

      {/* Side Panel */}
      <Animated.View
        style={[
          styles.panel,
          { backgroundColor: theme.navBackground, width: PANEL_WIDTH },
          panelStyle,
        ]}
      >
        {/* Close Button */}
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: theme.uiBackground }]}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={24} color={theme.text} />
        </TouchableOpacity>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View
            style={[
              styles.avatarContainer,
              {
                backgroundColor: userAvatar
                  ? "transparent"
                  : `${Colors.primary}15`,
              },
            ]}
          >
            {userAvatar ? (
              <Image
                source={
                  typeof userAvatar === "string"
                    ? { uri: userAvatar }
                    : userAvatar
                }
                style={styles.avatarImage}
              />
            ) : (
              <Ionicons name="person" size={40} color={Colors.primary} />
            )}
            <View
              style={[
                styles.roleBadge,
                { backgroundColor: Colors.uiBackground },
              ]}
            >
              <ThemedText style={styles.roleText}>
                {userRole.substring(0, 1)}
              </ThemedText>
            </View>
          </View>

          <ThemedText type="title" style={styles.userName}>
            {userName}
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

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: theme.uiBackground }]}
            onPress={() => {
              onClose();
              router.push("/profile");
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="person-outline" size={22} color={theme.text} />
            <ThemedText style={styles.menuText}>Profile</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: theme.uiBackground }]}
            onPress={toggleScheme}
            activeOpacity={0.7}
          >
            <Ionicons
              name={scheme === "dark" ? "moon" : "sunny"}
              size={22}
              color={theme.text}
            />
            <ThemedText style={styles.menuText}>
              {scheme === "dark" ? "Dark Mode" : "Light Mode"}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={[
            styles.signOutButton,
            { backgroundColor: `${Colors.redAccent}20` },
          ]}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={22} color={Colors.redAccent} />
          <ThemedText style={[styles.signOutText, { color: Colors.redAccent }]}>
            Sign Out
          </ThemedText>
        </TouchableOpacity>
      </Animated.View>
    </>
  );
};

export default SidePanel;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    zIndex: 998,
  },
  overlayTouchable: {
    flex: 1,
  },
  panel: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 999,
    paddingTop: 60,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  closeButton: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: 20,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    position: "relative",
    overflow: "hidden",
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  roleBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  roleText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  greetingIcon: {
    marginRight: 6,
    opacity: 0.7,
  },
  greeting: {
    fontSize: 14,
    opacity: 0.7,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateIcon: {
    marginRight: 6,
    opacity: 0.6,
  },
  date: {
    fontSize: 13,
    opacity: 0.6,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    marginVertical: 20,
  },
  menuSection: {
    gap: 12,
    flex: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 16,
  },
  menuText: {
    fontSize: 16,
    fontWeight: "500",
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 30,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
