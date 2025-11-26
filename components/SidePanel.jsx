import {
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import React, { useContext, useMemo, useState, useEffect } from "react";
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
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../context/AuthContext";
import SigningOutScreen from "./SignOutScreen";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PANEL_WIDTH = SCREEN_WIDTH * 0.8;

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

const SidePanel = ({ isOpen, onClose, onAvatarUpdate }) => {
  const { scheme, toggleScheme } = useContext(ThemeContext);
  const { user } = useAuth();
  const theme = Colors[scheme] ?? Colors.light;
  const [uploading, setUploading] = useState(false);
  const [currentUserAvatar, setCurrentUserAvatar] = useState(null);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("Member");
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showConfirmSignOut, setShowConfirmSignOut] = useState(false);

  const translateX = useSharedValue(isOpen ? 0 : -PANEL_WIDTH);

  useEffect(() => {
    translateX.value = withSpring(isOpen ? 0 : -PANEL_WIDTH, {
      damping: 25,
      stiffness: 300,
      mass: 0.5,
    });
  }, [isOpen]);

  useEffect(() => {
    const loadUserProfile = async () => {
      if (isOpen && user) {
        setLoadingProfile(true);
        try {
          const savedName = await AsyncStorage.getItem(`userName_${user.uid}`);
          const savedProfileImg = await AsyncStorage.getItem(
            `savedProfileImg_${user.uid}`
          );

          setUserName(
            savedName || user.displayName || user.email.split("@")[0]
          );
          setCurrentUserAvatar(savedProfileImg);

          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();

            if (userData.fullName) {
              setUserName(userData.fullName);
              await AsyncStorage.setItem(
                `userName_${user.uid}`,
                userData.fullName
              );
            }

            if (userData.role) {
              setUserRole(userData.role);
            }

            if (userData.profileImg) {
              setCurrentUserAvatar(userData.profileImg);
              await AsyncStorage.setItem(
                `savedProfileImg_${user.uid}`,
                userData.profileImg
              );
            }
          } else {
            console.log("No user data found in Firestore, using basic profile");
            setUserRole("Member");
          }
        } catch (error) {
          console.error("Error loading user profile:", error);
          const savedName = await AsyncStorage.getItem(`userName_${user.uid}`);
          setUserName(
            savedName || user.displayName || user.email.split("@")[0]
          );
        } finally {
          setLoadingProfile(false);
        }
      }
    };

    loadUserProfile();
  }, [isOpen, user]);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isOpen ? 0.5 : 0, { duration: 200 }),
    pointerEvents: isOpen ? "auto" : "none",
  }));

  const avatarVariant = useMemo(() => {
    const seed = user?.uid || userName || "User";
    const hash = seed
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return AVATAR_VARIANTS[hash % AVATAR_VARIANTS.length];
  }, [user?.uid, userName]);

  const handleSignOutClick = () => {
    // Close the side panel first
    onClose();
    // Show confirmation modal
    setShowConfirmSignOut(true);
  };

  const handleConfirmSignOut = () => {
    setShowConfirmSignOut(false);
    setIsSigningOut(true);
  };

  const handleCancelSignOut = () => {
    setShowConfirmSignOut(false);
  };

  const handleSignOutComplete = async () => {
    try {
      // Now perform the actual sign out
      await signOut(auth);

      // Clear any stored data
      await AsyncStorage.multiRemove([
        `userName_${user.uid}`,
        `savedProfileImg_${user.uid}`,
        "savedProfileImg",
      ]);

      // Navigate to login screen
      router.replace("/");
    } catch (error) {
      console.error("Error during sign out:", error);
      Alert.alert("Sign Out Error", "Failed to sign out properly.");
    } finally {
      setIsSigningOut(false);
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
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant photo library access to update your profile picture."
        );
        return;
      }

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
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const fileExtension = uri.split(".").pop().toLowerCase();
      let mimeType = "image/jpeg";

      if (fileExtension === "png") {
        mimeType = "image/png";
      } else if (fileExtension === "jpg" || fileExtension === "jpeg") {
        mimeType = "image/jpeg";
      } else if (fileExtension === "gif") {
        mimeType = "image/gif";
      } else if (fileExtension === "webp") {
        mimeType = "image/webp";
      }

      const base64Image = `data:${mimeType};base64,${base64}`;

      // Update Firestore user document
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        profileImg: base64Image,
        updatedAt: new Date().toISOString(),
      });

      // Update members collection
      const membersQuery = query(
        collection(db, "members"),
        where("uid", "==", auth.currentUser.uid)
      );
      const membersSnapshot = await getDocs(membersQuery);

      if (!membersSnapshot.empty) {
        const memberDoc = membersSnapshot.docs[0];
        const memberRef = doc(db, "members", memberDoc.id);
        await updateDoc(memberRef, {
          profileImg: base64Image,
          updatedAt: new Date().toISOString(),
        });
      }

      // ✅ Save with multiple keys for different use cases
      // 1. User-specific key (for SidePanel)
      await AsyncStorage.setItem(
        `savedProfileImg_${auth.currentUser.uid}`,
        base64Image
      );

      // 2. Email-based key (for Index page)
      const emailKey = auth.currentUser.email.replace(/[@.]/g, "_");
      await AsyncStorage.setItem(`savedProfileImg_${emailKey}`, base64Image);

      // 3. General key (backwards compatibility)
      await AsyncStorage.setItem("savedProfileImg", base64Image);

      setCurrentUserAvatar(base64Image);

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

  // If we're in the signing out process, show the signing out screen
  if (isSigningOut) {
    return <SigningOutScreen onSignOutComplete={handleSignOutComplete} />;
  }

  if (loadingProfile) {
    return (
      <>
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

        <Animated.View
          style={[
            styles.panel,
            { backgroundColor: theme.navBackground, width: PANEL_WIDTH },
            panelStyle,
          ]}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.blueAccent} />
            <ThemedText style={styles.loadingText}>
              Loading profile...
            </ThemedText>
          </View>
        </Animated.View>
      </>
    );
  }

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
                      backgroundColor: currentUserAvatar
                        ? "transparent"
                        : avatarVariant.bg,
                    },
                  ]}
                >
                  {currentUserAvatar ? (
                    <Image
                      source={{ uri: currentUserAvatar }}
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
                    { backgroundColor: Colors.blueAccent },
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
                    color={Colors.goldAccent}
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
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOutClick}
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

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmSignOut}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelSignOut}
      >
        <View style={styles.confirmModalOverlay}>
          <View
            style={[
              styles.confirmModalContent,
              { backgroundColor: theme.navBackground },
            ]}
          >
            <View style={styles.confirmHeader}>
              <Ionicons
                name="log-out-outline"
                size={32}
                color={Colors.redAccent}
              />
              <ThemedText style={styles.confirmTitle}>
                Confirm Sign Out
              </ThemedText>
              <ThemedText style={styles.confirmMessage}>
                Are you sure you want to sign out?
              </ThemedText>
            </View>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={handleCancelSignOut}
                activeOpacity={0.7}
              >
                <ThemedText style={styles.cancelButtonText}>
                  No, Stay
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmButton, styles.signOutConfirmButton]}
                onPress={handleConfirmSignOut}
                activeOpacity={0.7}
              >
                <Ionicons name="log-out-outline" size={18} color="#fff" />
                <ThemedText style={styles.signOutConfirmButtonText}>
                  Yes, Sign Out
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    opacity: 0.7,
  },
  // Confirmation Modal Styles
  confirmModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 20,
  },
  confirmModalContent: {
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  confirmHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 8,
    textAlign: "center",
  },
  confirmMessage: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
    lineHeight: 22,
  },
  confirmButtons: {
    flexDirection: "row",
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: Colors.uiBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  signOutConfirmButton: {
    backgroundColor: Colors.redAccent,
  },
  signOutConfirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
