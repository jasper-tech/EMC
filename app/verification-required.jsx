import {
  StyleSheet,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import React, { useState, useEffect, useContext } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import { router, useLocalSearchParams } from "expo-router";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
} from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc, addDoc, collection } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeContext } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

const VerificationRequired = () => {
  const { scheme } = useContext(ThemeContext);
  const { user, setPendingVerification } = useAuth();
  const theme = Colors[scheme] ?? Colors.light;
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const params = useLocalSearchParams();

  useEffect(() => {
    // Load email from params or AsyncStorage
    if (params.email) {
      setUserEmail(params.email);
    }

    // Load pending user data
    const loadPendingData = async () => {
      try {
        const data = await AsyncStorage.getItem("pendingUserData");
        if (data) {
          const userData = JSON.parse(data);
          setUserEmail(userData.email);
        }
      } catch (error) {
        console.error("Error loading pending user data:", error);
      }
    };

    loadPendingData();
  }, []);

  useEffect(() => {
    // Listen for auth state changes to check verification status
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Refresh the user to get latest email verification status
        await currentUser.reload();
        setIsEmailVerified(currentUser.emailVerified);

        if (currentUser.emailVerified) {
          // User has verified their email - save to Firestore and update state
          await saveUserToFirestore();
          setPendingVerification(false);
        }
      }
    });

    return unsubscribe;
  }, []);

  const handleCheckVerification = async () => {
    setCheckingStatus(true);
    try {
      if (auth.currentUser) {
        // Refresh user to get latest verification status
        await auth.currentUser.reload();

        if (auth.currentUser.emailVerified) {
          setIsEmailVerified(true);
          setPendingVerification(false);
          Alert.alert("Success", "Email verified! You can now log in.");
        } else {
          Alert.alert(
            "Not Verified Yet",
            "Your email is still not verified. Please check your email and click the verification link."
          );
        }
      } else {
        Alert.alert("Error", "No user found. Please try signing in again.");
      }
    } catch (error) {
      console.error("Error checking verification:", error);
      Alert.alert("Error", "Failed to check verification status.");
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleResendVerification = async () => {
    if (!auth.currentUser) {
      Alert.alert("Error", "No user found. Please try signing in again.");
      return;
    }

    setResending(true);
    try {
      await sendEmailVerification(auth.currentUser);
      Alert.alert(
        "Success",
        "Verification email sent! Check your inbox and spam folder."
      );
    } catch (error) {
      console.error("Error resending verification:", error);
      Alert.alert("Error", "Failed to resend verification email.");
    } finally {
      setResending(false);
    }
  };

  const handleLogin = async () => {
    if (!isEmailVerified) {
      Alert.alert(
        "Not Verified",
        "Please verify your email first before logging in."
      );
      return;
    }

    setLoading(true);
    try {
      // Get stored credentials
      const savedEmail = await AsyncStorage.getItem("savedEmail");
      const savedPassword = await AsyncStorage.getItem("savedPassword");

      if (!savedEmail || !savedPassword) {
        Alert.alert(
          "Error",
          "No saved credentials found. Please sign in manually."
        );
        router.replace("/");
        return;
      }

      // Sign in with saved credentials
      const userCredential = await signInWithEmailAndPassword(
        auth,
        savedEmail,
        savedPassword
      );

      if (userCredential.user.emailVerified) {
        // Clear pending data
        await AsyncStorage.removeItem("pendingUserData");
        setPendingVerification(false);
        router.replace("/dashboard");
      } else {
        Alert.alert(
          "Not Verified",
          "Email still not verified. Please check your email."
        );
      }
    } catch (error) {
      console.error("Error during login:", error);
      Alert.alert(
        "Login Failed",
        "Failed to log in. Please try signing in manually."
      );
      router.replace("/");
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
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error("No user logged in");
      }

      // Save to users collection
      await setDoc(doc(db, "users", currentUser.uid), {
        fullName: userData.fullName,
        email: userData.email,
        phone: userData.phone,
        role: userData.role,
        address: userData.address,
        emailVerified: true,
        uid: currentUser.uid,
        createdAt: new Date().toISOString(),
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

      console.log("User data saved to Firestore after verification");
    } catch (error) {
      console.error("Error saving user data:", error);
      throw error;
    }
  };

  const handleGoToHome = () => {
    router.replace("/");
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: isEmailVerified
                      ? `${Colors.green}15`
                      : `${Colors.blueAccent}15`,
                  },
                ]}
              >
                <Ionicons
                  name={isEmailVerified ? "checkmark-circle" : "mail-outline"}
                  size={48}
                  color={isEmailVerified ? Colors.green : Colors.blueAccent}
                />
              </View>

              <ThemedText type="title" style={styles.title}>
                {isEmailVerified ? "Email Verified!" : "Verify Your Email"}
              </ThemedText>

              <ThemedText style={styles.subtitle}>
                {isEmailVerified
                  ? "Your email has been successfully verified!"
                  : "We sent a verification link to:"}
              </ThemedText>

              <ThemedText style={styles.emailText}>{userEmail}</ThemedText>

              {!isEmailVerified && (
                <View style={styles.demoCodeContainer}>
                  <ThemedText style={styles.demoCodeText}>
                    Check your inbox and spam folder
                  </ThemedText>
                </View>
              )}
            </View>

            {/* Status Section */}
            <View
              style={[
                styles.statusContainer,
                {
                  backgroundColor: isEmailVerified
                    ? `${Colors.green}10`
                    : `${Colors.blueAccent}10`,
                },
              ]}
            >
              <Ionicons
                name={isEmailVerified ? "checkmark-circle" : "time-outline"}
                size={24}
                color={isEmailVerified ? Colors.green : Colors.blueAccent}
              />
              <ThemedText
                style={[
                  styles.statusText,
                  { color: isEmailVerified ? Colors.green : Colors.blueAccent },
                ]}
              >
                {isEmailVerified
                  ? "Email verified successfully!"
                  : "Awaiting email verification..."}
              </ThemedText>
            </View>

            {/* Instructions */}
            {!isEmailVerified && (
              <View style={styles.instructions}>
                <ThemedText style={styles.instructionTitle}>
                  How to verify your email:
                </ThemedText>
                <ThemedText style={styles.instructionText}>
                  1. Check your email inbox{"\n"}
                  2. Look for an email from Union Management System{"\n"}
                  3. Click the verification link in the email{"\n"}
                  4. Return here and click "Check Verification Status"{"\n"}
                  5. Once verified, the login button will appear
                </ThemedText>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actions}>
              {isEmailVerified ? (
                // Show login button when email is verified
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { backgroundColor: Colors.green },
                  ]}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="log-in-outline" size={20} color="#fff" />
                      <ThemedText style={styles.primaryButtonText}>
                        Proceed to Login
                      </ThemedText>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                // Show verification actions when not verified
                <>
                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      { backgroundColor: Colors.blueAccent },
                    ]}
                    onPress={handleCheckVerification}
                    disabled={checkingStatus}
                  >
                    {checkingStatus ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons
                          name="refresh-outline"
                          size={20}
                          color="#fff"
                        />
                        <ThemedText style={styles.primaryButtonText}>
                          Check Verification Status
                        </ThemedText>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleResendVerification}
                    disabled={resending}
                  >
                    {resending ? (
                      <ActivityIndicator
                        color={Colors.blueAccent}
                        size="small"
                      />
                    ) : (
                      <>
                        <Ionicons
                          name="mail-outline"
                          size={20}
                          color={Colors.blueAccent}
                        />
                        <ThemedText style={styles.secondaryButtonText}>
                          Resend Verification Email
                        </ThemedText>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {/* Always show home button */}
              <TouchableOpacity
                style={styles.tertiaryButton}
                onPress={handleGoToHome}
              >
                <ThemedText style={styles.tertiaryButtonText}>
                  Go to Home
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Additional Info */}
            <View style={styles.infoBox}>
              <ThemedText style={styles.infoText}>
                {isEmailVerified
                  ? "You're all set! Click 'Proceed to Login' to access your dashboard."
                  : "This page automatically checks for email verification. You don't need to enter any codes."}
              </ThemedText>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
};

export default VerificationRequired;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    color: Colors.blueAccent,
  },
  demoCodeContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: `${Colors.blueAccent}15`,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.blueAccent,
  },
  demoCodeText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.blueAccent,
    textAlign: "center",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 30,
    padding: 16,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 16,
    fontWeight: "600",
  },
  instructions: {
    backgroundColor: Colors.uiBackground,
    padding: 20,
    borderRadius: 16,
    marginBottom: 30,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  actions: {
    gap: 12,
    marginBottom: 30,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 18,
    borderRadius: 16,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.blueAccent,
  },
  secondaryButtonText: {
    color: Colors.blueAccent,
    fontSize: 16,
    fontWeight: "600",
  },
  tertiaryButton: {
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tertiaryButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  infoBox: {
    backgroundColor: `${Colors.blueAccent}08`,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.blueAccent,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
    textAlign: "center",
  },
});
