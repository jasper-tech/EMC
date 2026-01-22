import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Animated,
  Alert,
} from "react-native";
import React, { useContext, useMemo, useState, useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../context/AuthContext";
import { useSplash } from "../context/SplashContext";
import SplashScreen from "../components/SplashScreen";

const Index = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [savedUser, setSavedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  const { user, loading: authLoading } = useAuth();
  const { hasShownSplash, markSplashAsShown } = useSplash();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Avatar colors for users without images - MOVED BEFORE EARLY RETURNS
  const AVATAR_VARIANTS = [
    { bg: "#FF6B6B", icon: "person" },
    { bg: "#4ECDC4", icon: "person-circle" },
    { bg: "#45B7D1", icon: "body" },
    { bg: "#FFA07A", icon: "happy" },
    { bg: "#98D8C8", icon: "person-outline" },
  ];

  const avatarVariant = useMemo(() => {
    if (!savedUser) return AVATAR_VARIANTS[0];
    const seed = savedUser.email || "User";
    const hash = seed
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return AVATAR_VARIANTS[hash % AVATAR_VARIANTS.length];
  }, [savedUser]);

  // Check saved user only once when component mounts
  useEffect(() => {
    checkSavedUser();
  }, []);

  // Handle splash screen
  useEffect(() => {
    if (hasShownSplash) {
      setShowSplash(false);
      startAnimations();
    }
  }, [hasShownSplash]);

  // Handle authentication redirect - FIXED: Prevent infinite loop
  useEffect(() => {
    if (!authLoading && !showSplash && !hasCheckedAuth) {
      if (user) {
        console.log("User authenticated, redirecting to dashboard");
        setHasCheckedAuth(true);
        router.replace("/dashboard");
      } else {
        setHasCheckedAuth(true);
      }
    }
  }, [user, authLoading, showSplash, hasCheckedAuth]);

  const handleSplashComplete = () => {
    markSplashAsShown();
    setShowSplash(false);
    startAnimations();
  };

  const startAnimations = () => {
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
  };

  const checkSavedUser = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem("userEmail");
      const savedName = await AsyncStorage.getItem("userName");

      const emailKey = savedEmail?.replace(/[@.]/g, "_");
      const savedProfileImg = await AsyncStorage.getItem(
        `savedProfileImg_${emailKey}`
      );

      console.log("Saved user data:", {
        savedEmail,
        savedName,
        hasProfileImg: !!savedProfileImg,
      });

      if (savedEmail && savedName) {
        setSavedUser({
          email: savedEmail,
          name: savedName,
          profileImg: savedProfileImg,
        });
      } else {
        console.log("No saved user identity found");
        setSavedUser(null);
      }
    } catch (error) {
      console.error("Error checking saved user:", error);
      setSavedUser(null);
    }
  };

  const handleQuickLogin = () => {
    if (!savedUser) return;

    // Redirect to login with pre-filled email and welcome message
    router.push({
      pathname: "/login",
      params: {
        prefillEmail: savedUser.email,
        message: `Welcome back, ${savedUser.name}! Please enter your password to continue.`,
      },
    });
  };

  const handleDifferentAccount = () => {
    router.push("/login");
  };

  // Show splash screen only if not shown before
  if (showSplash && !hasShownSplash) {
    return <SplashScreen onSplashComplete={handleSplashComplete} />;
  }

  // If auth is still loading after splash, show loading
  if (authLoading && !hasCheckedAuth) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.blueAccent} />
        <ThemedText style={styles.loadingText}>Loading...</ThemedText>
      </ThemedView>
    );
  }

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
          {/* <ThemedText type="title" style={styles.title}>
            Ready to Continue?
          </ThemedText> */}
        </View>

        {savedUser ? (
          <View style={styles.userSection}>
            <TouchableOpacity
              style={styles.userCard}
              onPress={handleQuickLogin}
              disabled={loading}
            >
              <View style={styles.userCardContent}>
                <View style={styles.avatarContainer}>
                  {savedUser.profileImg ? (
                    <Image
                      source={{ uri: savedUser.profileImg }}
                      style={styles.profileImage}
                      onError={() => console.log("Image failed to load")}
                    />
                  ) : (
                    <View
                      style={[
                        styles.defaultAvatar,
                        { backgroundColor: avatarVariant.bg },
                      ]}
                    >
                      <Ionicons
                        name={avatarVariant.icon}
                        size={28}
                        color="#fff"
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

            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[
                  styles.continueButton,
                  loading && styles.buttonDisabled,
                ]}
                onPress={handleQuickLogin}
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
            {/* 
            <ThemedText style={styles.securityHint}>
              🔒 Password required for security
            </ThemedText> */}
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
            <ThemedText style={styles.noUserTitle}>Welcome</ThemedText>
            <ThemedText style={styles.noUserText}>
              Sign in to access the union dashboard
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

        <View style={styles.footer}>
          {/* <ThemedText style={styles.footerText}>
            Secure • Reliable • Fast
          </ThemedText> */}
        </View>
      </Animated.View>
    </ThemedView>
  );
};

export default Index;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    opacity: 0.7,
  },
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
    marginBottom: 16,
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
  securityHint: {
    textAlign: "center",
    fontSize: 13,
    opacity: 0.6,
    fontStyle: "italic",
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
});
