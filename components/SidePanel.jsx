import {
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
} from "react-native";
import React, { useContext, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import ThemedText from "./ThemedText";
import { Colors } from "../constants/Colors";
import { ThemeContext } from "../context/ThemeContext";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { router } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import AsyncStorage from "@react-native-async-storage/async-storage"; // ADD THIS IMPORT

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PANEL_WIDTH = SCREEN_WIDTH * 0.8;

// Avatar colors and icons for users without images
const AVATAR_VARIANTS = [
  { bg: "#FF6B6B", icon: "person" },
  { bg: "#4ECDC4", icon: "person-circle" },
  { bg: "#45B7D1", icon: "body" },
  { bg: "#FFA07A", icon: "happy" },
  { bg: "#98D8C8", icon: "person-outline" },
  { bg: "#F7DC6F", icon: "people" },
  { bg: "#BB8FCE", icon: "man" },
  { bg: "#85C1E2", icon: "woman" },
];

const SidePanel = ({
  userName = "John Doe",
  userRole = "Admin",
  userAvatar = null,
  userId = null,
  isOpen,
  onClose,
  onAvatarUpdate,
}) => {
  const { scheme, toggleScheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;
  const [uploading, setUploading] = useState(false);

  const translateX = useSharedValue(isOpen ? 0 : -PANEL_WIDTH);

  // Generate consistent avatar variant based on userId or userName
  const avatarVariant = useMemo(() => {
    const seed = userId || userName;
    const hash = seed
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return AVATAR_VARIANTS[hash % AVATAR_VARIANTS.length];
  }, [userId, userName]);

  React.useEffect(() => {
    translateX.value = withSpring(isOpen ? 0 : -PANEL_WIDTH, {
      damping: 25,
      stiffness: 300,
      mass: 0.5,
    });
  }, [isOpen]);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isOpen ? 0.5 : 0, { duration: 200 }),
    pointerEvents: isOpen ? "auto" : "none",
  }));

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      onClose();
      router.replace("/");
    } catch (error) {
      console.error("Error signing out:", error);
      Alert.alert("Sign Out Error", "Failed to sign out properly.");
    }
  };

  const getCurrentGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const handlePickImage = async () => {
    try {
      // Request permission
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant photo library access to update your profile picture."
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        await saveImageAsBase64(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const saveImageAsBase64 = async (uri) => {
    if (!auth.currentUser) {
      Alert.alert(
        "Error",
        "You must be logged in to update your profile picture."
      );
      return;
    }

    setUploading(true);

    try {
      // Convert image to base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Get the file extension to determine the mime type
      const fileExtension = uri.split(".").pop().toLowerCase();
      let mimeType = "image/jpeg"; // default

      if (fileExtension === "png") {
        mimeType = "image/png";
      } else if (fileExtension === "jpg" || fileExtension === "jpeg") {
        mimeType = "image/jpeg";
      } else if (fileExtension === "gif") {
        mimeType = "image/gif";
      } else if (fileExtension === "webp") {
        mimeType = "image/webp";
      }

      // Create data URI with base64
      const base64Image = `data:${mimeType};base64,${base64}`;

      // Update Firestore user document with base64 image
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        profileImg: base64Image,
        updatedAt: new Date().toISOString(),
      });

      // Call the callback to update parent component
      if (onAvatarUpdate) {
        onAvatarUpdate(base64Image);
      }

      Alert.alert("Success", "Profile picture updated successfully!");
    } catch (error) {
      console.error("Error saving image:", error);
      Alert.alert("Error", "Failed to save image. Please try again.");
    } finally {
      setUploading(false);
    }
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
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <ThemedText type="title" style={styles.greeting}>
              {getCurrentGreeting()}
            </ThemedText>
            <TouchableOpacity
              style={[
                styles.closeButton,
                { backgroundColor: theme.uiBackground },
              ]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Profile Card */}
          <View
            style={[
              styles.profileCard,
              { backgroundColor: theme.uiBackground },
            ]}
          >
            <View style={styles.profileContent}>
              <View style={styles.avatarWrapper}>
                <View
                  style={[
                    styles.avatarContainer,
                    {
                      backgroundColor: userAvatar
                        ? "transparent"
                        : avatarVariant.bg,
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
                    <Ionicons
                      name={avatarVariant.icon}
                      size={32}
                      color="#fff"
                    />
                  )}
                </View>

                {/* Edit Button */}
                <TouchableOpacity
                  style={[
                    styles.editButton,
                    { backgroundColor: Colors.primary },
                  ]}
                  onPress={handlePickImage}
                  activeOpacity={0.8}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="pencil" size={14} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.userInfo}>
                <ThemedText style={styles.userName} numberOfLines={1}>
                  {userName}
                </ThemedText>
                <View
                  style={[
                    styles.roleBadge,
                    { backgroundColor: `${Colors.uiBackground}15` },
                  ]}
                >
                  <Ionicons
                    name="shield-checkmark"
                    size={12}
                    color={theme.text}
                  />
                  <ThemedText style={[styles.roleText, { color: theme.text }]}>
                    {userRole}
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={toggleScheme}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.menuIconContainer,
                { backgroundColor: theme.uiBackground },
              ]}
            >
              <Ionicons
                name={scheme === "dark" ? "moon" : "sunny"}
                size={20}
                color={theme.text}
              />
            </View>
            <View style={styles.menuTextContainer}>
              <ThemedText style={styles.menuText}>Appearance</ThemedText>
              <ThemedText style={styles.menuSubtext}>
                {scheme === "dark" ? "Dark" : "Light"} mode
              </ThemedText>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.text}
              opacity={0.3}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onClose();
              router.push("/settings");
            }}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.menuIconContainer,
                { backgroundColor: theme.uiBackground },
              ]}
            >
              <Ionicons name="settings-outline" size={20} color={theme.text} />
            </View>
            <View style={styles.menuTextContainer}>
              <ThemedText style={styles.menuText}>Settings</ThemedText>
              <ThemedText style={styles.menuSubtext}>
                Preferences & privacy
              </ThemedText>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.text}
              opacity={0.3}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onClose();
              router.push("/help");
            }}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.menuIconContainer,
                { backgroundColor: theme.uiBackground },
              ]}
            >
              <Ionicons
                name="help-circle-outline"
                size={20}
                color={theme.text}
              />
            </View>
            <View style={styles.menuTextContainer}>
              <ThemedText style={styles.menuText}>Help & Support</ThemedText>
              <ThemedText style={styles.menuSubtext}>
                FAQs and contact
              </ThemedText>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.text}
              opacity={0.3}
            />
          </TouchableOpacity>
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.menuIconContainer,
                { backgroundColor: `${Colors.redAccent}15` },
              ]}
            >
              <Ionicons
                name="log-out-outline"
                size={20}
                color={Colors.redAccent}
              />
            </View>
            <ThemedText
              style={[styles.signOutText, { color: Colors.redAccent }]}
            >
              Sign Out
            </ThemedText>
          </TouchableOpacity>
        </View>
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
    paddingTop: 50,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  greeting: {
    fontSize: 24,
    fontWeight: "700",
  },
  profileCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrapper: {
    position: "relative",
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  editButton: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "600",
  },
  menuSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 14,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTextContainer: {
    flex: 1,
  },
  menuText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  menuSubtext: {
    fontSize: 13,
    opacity: 0.5,
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 14,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
