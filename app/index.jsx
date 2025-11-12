import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import React, { useState, useEffect } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import { router } from "expo-router";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useFocusEffect } from "expo-router";

const Index = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [savedUser, setSavedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    checkSavedUser();

    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const checkSavedUser = async () => {
    try {
      // Check if user is already logged in
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          // User is logged in, navigate to dashboard
          router.replace("/dashboard");
        } else {
          // RESET STATE FIRST to avoid showing old data
          setSavedUser(null);

          // Check for saved credentials
          const savedEmail = await AsyncStorage.getItem("savedEmail");
          const savedPassword = await AsyncStorage.getItem("savedPassword");
          const savedName = await AsyncStorage.getItem("savedName");
          const savedProfileImg = await AsyncStorage.getItem("savedProfileImg");

          console.log(
            "Saved profile image:",
            savedProfileImg ? "Exists" : "Null"
          ); // Debug log

          if (savedEmail && savedPassword) {
            setSavedUser({
              email: savedEmail,
              password: savedPassword,
              name: savedName || "User",
              profileImg: savedProfileImg, // This can be null, base64, or URL
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

      console.log("User logged in:", userCredential.user.uid);

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
      // ...existing error handling...
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
          <ThemedText style={styles.splashTitle}>EMC</ThemedText>
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
      <View style={styles.content}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Welcome Back
          </ThemedText>
        </View>

        {savedUser ? (
          <View style={styles.userSection}>
            <View style={styles.userCard}>
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
                <MaterialIcons
                  name="account-circle"
                  size={80}
                  color={Colors.blueAccent}
                />
              )}
              <ThemedText style={styles.userName}>{savedUser.name}</ThemedText>
              <ThemedText style={styles.userEmail}>
                {savedUser.email}
              </ThemedText>
            </View>

            <TouchableOpacity
              style={[styles.continueButton, loading && styles.buttonDisabled]}
              onPress={handleContinueAs}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.continueButtonText}>
                  Continue as {savedUser.name}
                </ThemedText>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.differentAccountButton}
              onPress={handleDifferentAccount}
              disabled={loading}
            >
              <ThemedText style={styles.differentAccountText}>
                Use a different account
              </ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noUserSection}>
            <ThemedText style={styles.noUserText}>
              No saved account found
            </ThemedText>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => router.push("/login")}
            >
              <ThemedText style={styles.loginButtonText}>
                Go to Login
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ThemedView>
  );
};

export default Index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 16,
  },
  userSection: {
    width: "100%",
  },
  userCard: {
    backgroundColor: Colors.uiBackground,
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
  },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 12,
  },
  userEmail: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  continueButton: {
    backgroundColor: Colors.blueAccent,
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
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
  },
  differentAccountText: {
    fontSize: 14,
    color: Colors.blueAccent,
  },
  noUserSection: {
    width: "100%",
    alignItems: "center",
  },
  noUserText: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: Colors.blueAccent,
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    width: "100%",
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
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
  splashTitle: {
    fontSize: 72,
    fontWeight: "bold",
    letterSpacing: 4,
    color: Colors.blueAccent,
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
