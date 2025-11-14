import {
  StyleSheet,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect, useContext } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import { router } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc, addDoc, collection } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeContext } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

const PhoneVerified = () => {
  const { scheme } = useContext(ThemeContext);
  const { setPendingVerification } = useAuth();
  const theme = Colors[scheme] ?? Colors.light;
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        // No user logged in, redirect to signup
        router.replace("/signup");
      }
    });

    return unsubscribe;
  }, []);

  const handleProceedToDashboard = async () => {
    if (!currentUser) {
      Alert.alert("Error", "No user found. Please sign up again.");
      router.replace("/signup");
      return;
    }

    setLoading(true);
    try {
      await saveUserToFirestore();
      setPendingVerification(false);
      router.replace("/dashboard");
    } catch (error) {
      console.error("Error saving user data:", error);
      Alert.alert("Error", "Failed to complete setup. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const saveUserToFirestore = async () => {
    try {
      const pendingData = await AsyncStorage.getItem("pendingUserData");
      if (!pendingData) {
        throw new Error("No user data found");
      }

      const userData = JSON.parse(pendingData);

      // Save to users collection
      await setDoc(doc(db, "users", currentUser.uid), {
        ...userData,
        uid: currentUser.uid,
        phoneVerified: true,
        updatedAt: new Date().toISOString(),
      });

      // Save to members collection
      await addDoc(collection(db, "members"), {
        fullname: userData.fullName,
        email: userData.email,
        phone: userData.phone,
        role: userData.role,
        address: userData.address,
        dateJoined: new Date().toISOString().split("T")[0],
        isExecutive: true,
        uid: currentUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Create notification
      await addDoc(collection(db, "notifications"), {
        type: "user_created",
        title: "New Executive Joined",
        message: `${userData.fullName} (${userData.role}) has joined the union as an executive`,
        timestamp: new Date(),
        read: false,
      });

      // Clean up
      await AsyncStorage.removeItem("pendingUserData");

      console.log("User data saved to Firestore after phone verification");
    } catch (error) {
      console.error("Error saving user data:", error);
      throw error;
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${Colors.green}15` },
            ]}
          >
            <Ionicons name="checkmark-circle" size={64} color={Colors.green} />
          </View>

          <ThemedText type="title" style={styles.title}>
            Phone Verified!
          </ThemedText>

          <ThemedText style={styles.subtitle}>
            Your phone number has been successfully verified
          </ThemedText>
        </View>

        {/* Success Message */}
        <View
          style={[
            styles.successContainer,
            { backgroundColor: `${Colors.green}10` },
          ]}
        >
          <Ionicons name="shield-checkmark" size={32} color={Colors.green} />
          <View style={styles.successTextContainer}>
            <ThemedText style={[styles.successTitle, { color: Colors.green }]}>
              Verification Complete
            </ThemedText>
            <ThemedText style={styles.successText}>
              Your account is now fully set up and ready to use
            </ThemedText>
          </View>
        </View>

        {/* Features List */}
        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <Ionicons
              name="people-outline"
              size={24}
              color={Colors.blueAccent}
            />
            <ThemedText style={styles.featureText}>
              Access union member management
            </ThemedText>
          </View>
          <View style={styles.featureItem}>
            <Ionicons
              name="calendar-outline"
              size={24}
              color={Colors.blueAccent}
            />
            <ThemedText style={styles.featureText}>
              Manage events and activities
            </ThemedText>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="cash-outline" size={24} color={Colors.blueAccent} />
            <ThemedText style={styles.featureText}>
              Track finances and contributions
            </ThemedText>
          </View>
          <View style={styles.featureItem}>
            <Ionicons
              name="notifications-outline"
              size={24}
              color={Colors.blueAccent}
            />
            <ThemedText style={styles.featureText}>
              Send announcements to members
            </ThemedText>
          </View>
        </View>

        {/* Action Button */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: Colors.green }]}
            onPress={handleProceedToDashboard}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
                <ThemedText style={styles.primaryButtonText}>
                  Proceed to Dashboard
                </ThemedText>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer Note */}
        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>
            Welcome to the union management system! 🎉
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
};

export default PhoneVerified;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
    lineHeight: 24,
  },
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
    borderRadius: 16,
    marginBottom: 32,
  },
  successTextContainer: {
    flex: 1,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  successText: {
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 20,
  },
  featuresList: {
    gap: 16,
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    backgroundColor: Colors.uiBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${Colors.blueAccent}15`,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 18,
    borderRadius: 16,
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  footer: {
    alignItems: "center",
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: "center",
  },
});
