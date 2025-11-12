import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Animated,
  Dimensions,
} from "react-native";
import React, { useState, useEffect, useRef, useContext } from "react";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import { router } from "expo-router";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { ProfileContext } from "../context/ProfileContext";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const Index = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [savedUser, setSavedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Get profile image from context
  const { profileImage } = useContext(ProfileContext);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    checkSavedUser();

    const timer = setTimeout(() => {
      setShowSplash(false);
      // Start entrance animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Update savedUser when profileImage changes in context
  useEffect(() => {
    if (savedUser && profileImage) {
      setSavedUser((prev) => ({
        ...prev,
        profileImg: profileImage,
      }));
    }
  }, [profileImage]);

  const checkSavedUser = async () => {
    try {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          router.replace("/dashboard");
        } else {
          setSavedUser(null);
          const savedEmail = await AsyncStorage.getItem("savedEmail");
          const savedPassword = await AsyncStorage.getItem("savedPassword");
          const savedName = await AsyncStorage.getItem("savedName");
          const savedProfileImg = await AsyncStorage.getItem("savedProfileImg");

          // Use profileImage from context if available, otherwise fall back to AsyncStorage
          const currentProfileImg = profileImage || savedProfileImg;

          if (savedEmail && savedPassword) {
            setSavedUser({
              email: savedEmail,
              password: savedPassword,
              name: savedName || "User",
              profileImg: currentProfileImg,
            });
          }
        }
        setCheckingAuth(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Error checking saved user:", error);
      setCheckingAuth(false);
    }
  };

  const handleContinueAs = async () => {
    if (!savedUser) return;

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        savedUser.email,
        savedUser.password
      );

      // Update saved profile image from Firestore if available
      try {
        const userDocRef = doc(db, "users", userCredential.user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().profileImg) {
          await AsyncStorage.setItem(
            "savedProfileImg",
            userDoc.data().profileImg
          );
        }
      } catch (err) {
        console.warn("Could not update profile image:", err);
      }

      router.replace("/dashboard");
    } catch (error) {
      console.error("Auto-login error:", error);
      await AsyncStorage.multiRemove([
        "savedEmail",
        "savedPassword",
        "savedName",
        "savedProfileImg",
      ]);
      setSavedUser(null);

      Alert.alert(
        "Login Failed",
        "Unable to log in automatically. Please log in manually.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDifferentAccount = () => {
    router.push("/login");
  };

  // Splash Screen
  if (showSplash || checkingAuth) {
    return (
      <ThemedView style={styles.splashContainer}>
        <View style={styles.splashContent}>
          <Animated.View style={styles.logoContainer}>
            <ThemedText style={styles.splashTitle}>EMC</ThemedText>
            <View style={styles.splashSubtitleContainer}>
              <ThemedText style={styles.splashSubtitle}>
                EPSU Management
              </ThemedText>
            </View>
          </Animated.View>
        </View>
        <View style={styles.splashFooter}>
          <ThemedText style={styles.splashFooterText}>
            by jasper-tech
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  // Welcome Screen with saved user
  return (
    <ThemedView style={styles.container}>
      <View style={styles.backgroundGraphics}>
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
        <View style={[styles.circle, styles.circle3]} />
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.welcomeBadge}>
            <Ionicons name="flash" size={16} color={Colors.blueAccent} />
            <ThemedText style={styles.welcomeBadgeText}>
              Welcome Back
            </ThemedText>
          </View>
          <ThemedText type="title" style={styles.title}>
            Ready to Continue?
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Pick up where you left off
          </ThemedText>
        </View>

        {savedUser ? (
          <View style={styles.userSection}>
            {/* User Card */}
            <TouchableOpacity
              style={styles.userCard}
              onPress={handleContinueAs}
              disabled={loading}
            >
              <View style={styles.userCardContent}>
                <View style={styles.avatarContainer}>
                  {savedUser.profileImg ? (
                    <Image
                      source={{
                        uri: savedUser.profileImg.startsWith("data:")
                          ? savedUser.profileImg
                          : savedUser.profileImg,
                      }}
                      style={styles.profileImage}
                    />
                  ) : (
                    <View style={styles.defaultAvatar}>
                      <Ionicons
                        name="person"
                        size={28}
                        color={Colors.blueAccent}
                      />
                    </View>
                  )}
                  <View style={styles.onlineIndicator} />
                </View>

                <View style={styles.userInfo}>
                  <ThemedText style={styles.userName}>
                    {savedUser.name}
                  </ThemedText>
                  <ThemedText style={styles.userEmail}>
                    {savedUser.email}
                  </ThemedText>
                </View>

                <View style={styles.quickAction}>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={Colors.blueAccent}
                  />
                </View>
              </View>
            </TouchableOpacity>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[
                  styles.continueButton,
                  loading && styles.buttonDisabled,
                ]}
                onPress={handleContinueAs}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="rocket" size={20} color="#fff" />
                    <ThemedText style={styles.continueButtonText}>
                      Continue as {savedUser.name.split(" ")[0]}
                    </ThemedText>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.differentAccountButton}
                onPress={handleDifferentAccount}
                disabled={loading}
              >
                <Ionicons name="people" size={18} color={Colors.blueAccent} />
                <ThemedText style={styles.differentAccountText}>
                  Use different account
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.noUserSection}>
            <View style={styles.noUserIllustration}>
              <Ionicons
                name="person-outline"
                size={80}
                color={Colors.blueAccent}
                style={styles.noUserIcon}
              />
            </View>
            <ThemedText style={styles.noUserTitle}>No Account Found</ThemedText>
            <ThemedText style={styles.noUserText}>
              Sign in to access your expense management dashboard
            </ThemedText>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => router.push("/login")}
            >
              <Ionicons name="log-in" size={20} color="#fff" />
              <ThemedText style={styles.loginButtonText}>
                Get Started
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>
            Secure • Reliable • Fast
          </ThemedText>
        </View>
      </Animated.View>
    </ThemedView>
  );
};

export default Index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGraphics: {
    ...StyleSheet.absoluteFillObject,
  },
  circle: {
    position: "absolute",
    borderRadius: 500,
    backgroundColor: `${Colors.blueAccent}08`,
  },
  circle1: {
    width: 300,
    height: 300,
    top: -150,
    right: -100,
  },
  circle2: {
    width: 200,
    height: 200,
    bottom: 100,
    left: -50,
    backgroundColor: `${Colors.blueAccent}05`,
  },
  circle3: {
    width: 150,
    height: 150,
    bottom: -50,
    right: 50,
    backgroundColor: `${Colors.blueAccent}03`,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  welcomeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${Colors.blueAccent}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
    gap: 6,
  },
  welcomeBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.blueAccent,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
  },
  userSection: {
    width: "100%",
  },
  userCard: {
    backgroundColor: Colors.uiBackground,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: `${Colors.blueAccent}15`,
    shadowColor: Colors.blueAccent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  userCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  defaultAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${Colors.blueAccent}10`,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: `${Colors.blueAccent}20`,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#4CAF50",
    borderWidth: 2,
    borderColor: Colors.uiBackground,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    opacity: 0.7,
  },
  quickAction: {
    padding: 8,
  },
  actionsContainer: {
    gap: 12,
  },
  continueButton: {
    backgroundColor: Colors.blueAccent,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    shadowColor: Colors.blueAccent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  continueButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  differentAccountButton: {
    padding: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${Colors.blueAccent}30`,
  },
  differentAccountText: {
    fontSize: 14,
    color: Colors.blueAccent,
    fontWeight: "600",
  },
  noUserSection: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 40,
  },
  noUserIllustration: {
    marginBottom: 24,
  },
  noUserIcon: {
    opacity: 0.5,
  },
  noUserTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  noUserText: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  loginButton: {
    backgroundColor: Colors.blueAccent,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    shadowColor: Colors.blueAccent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  footer: {
    alignItems: "center",
    paddingTop: 20,
  },
  footerText: {
    fontSize: 12,
    opacity: 0.5,
    letterSpacing: 1,
  },
  // Splash Screen Styles
  splashContainer: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 60,
  },
  splashContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    alignItems: "center",
  },
  splashTitle: {
    fontSize: 72,
    fontWeight: "bold",
    letterSpacing: 4,
    color: Colors.blueAccent,
    marginBottom: 20,
  },
  splashSubtitleContainer: {
    alignItems: "center",
  },
  splashSubtitle: {
    fontSize: 18,
    opacity: 0.8,
    letterSpacing: 2,
    marginBottom: 4,
  },
  splashFooter: {
    paddingBottom: 20,
  },
  splashFooterText: {
    fontSize: 14,
    opacity: 0.6,
    letterSpacing: 1,
  },
});
