import {
  StyleSheet,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput, // Add this import
} from "react-native";
import React, { useState, useEffect, useContext } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import { router, useLocalSearchParams } from "expo-router";
import {
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
} from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc, addDoc, collection } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeContext } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

const VerificationRequired = () => {
  const { scheme } = useContext(ThemeContext);
  const { setPendingVerification, refreshUserProfile } = useAuth();
  const theme = Colors[scheme] ?? Colors.light;
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [manualPassword, setManualPassword] = useState(""); // Add this state
  const [showPasswordInput, setShowPasswordInput] = useState(false); // Add this state

  const params = useLocalSearchParams();

  useEffect(() => {
    if (params.email) {
      setUserEmail(params.email);
    }

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

  const handleCheckVerification = async () => {
    setCheckingStatus(true);
    try {
      // Get saved credentials
      const savedEmail = await AsyncStorage.getItem("savedEmail");
      const savedPassword = await AsyncStorage.getItem("savedPassword");

      console.log("Checking credentials:", {
        hasEmail: !!savedEmail,
        hasPassword: !!savedPassword,
        email: savedEmail,
      });

      // Determine which email and password to use
      const emailToUse = savedEmail || userEmail;
      let passwordToUse = savedPassword;

      // If no saved password but we have manual password input
      if (!savedPassword && manualPassword) {
        passwordToUse = manualPassword;
      }

      if (!emailToUse || !passwordToUse) {
        // Show password input instead of redirecting to login
        setShowPasswordInput(true);
        Alert.alert(
          "Password Required",
          "For security reasons, please enter your password to check verification status.",
          [{ text: "OK" }]
        );
        setCheckingStatus(false);
        return;
      }

      // Sign in temporarily to check verification status
      const userCredential = await signInWithEmailAndPassword(
        auth,
        emailToUse,
        passwordToUse
      );

      await userCredential.user.reload();

      if (userCredential.user.emailVerified) {
        setIsEmailVerified(true);

        // Save the password if it was entered manually
        if (manualPassword && !savedPassword) {
          await AsyncStorage.setItem("savedPassword", manualPassword);
        }

        // Save to Firestore immediately after verification
        await saveUserToFirestore(emailToUse, passwordToUse);

        // Sign out the user immediately - they need to click "Continue" to log in
        await signOut(auth);

        Alert.alert(
          "Email Verified!",
          "Your email has been verified. Click 'Continue to Dashboard' to proceed.",
          [{ text: "OK" }]
        );
      } else {
        // Sign out if not verified
        await signOut(auth);
        Alert.alert(
          "Not Verified Yet",
          "Please check your email and click the verification link."
        );
      }
    } catch (error) {
      console.error("Error checking verification:", error);

      if (error.code === "auth/wrong-password") {
        Alert.alert(
          "Incorrect Password",
          "The password you entered is incorrect. Please try again.",
          [{ text: "OK" }]
        );
        setManualPassword(""); // Clear the incorrect password
      } else {
        Alert.alert(
          "Error",
          `Failed to check verification status: ${error.message}`
        );
      }
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    try {
      const savedEmail = await AsyncStorage.getItem("savedEmail");
      const savedPassword = await AsyncStorage.getItem("savedPassword");

      // Determine which email and password to use
      const emailToUse = savedEmail || userEmail;
      let passwordToUse = savedPassword;

      // If no saved password but we have manual password input
      if (!savedPassword && manualPassword) {
        passwordToUse = manualPassword;
      }

      if (!emailToUse || !passwordToUse) {
        setShowPasswordInput(true);
        Alert.alert(
          "Password Required",
          "Please enter your password to resend verification email.",
          [{ text: "OK" }]
        );
        setResending(false);
        return;
      }

      // Sign in temporarily to send verification email
      const userCredential = await signInWithEmailAndPassword(
        auth,
        emailToUse,
        passwordToUse
      );

      await sendEmailVerification(userCredential.user);

      // Sign out immediately
      await signOut(auth);

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

  const handleContinueToDashboard = async () => {
    if (!isEmailVerified) {
      Alert.alert(
        "Not Verified",
        "Please verify your email first before proceeding."
      );
      return;
    }

    setLoading(true);
    try {
      const savedEmail = await AsyncStorage.getItem("savedEmail");
      const savedPassword = await AsyncStorage.getItem("savedPassword");

      // Determine which email and password to use
      const emailToUse = savedEmail || userEmail;
      let passwordToUse = savedPassword;

      // If no saved password but we have manual password input
      if (!savedPassword && manualPassword) {
        passwordToUse = manualPassword;
      }

      if (!emailToUse || !passwordToUse) {
        Alert.alert(
          "Password Required",
          "Please enter your password to continue to dashboard.",
          [{ text: "OK" }]
        );
        setLoading(false);
        return;
      }

      // Fresh login to ensure AuthContext properly loads user data
      const userCredential = await signInWithEmailAndPassword(
        auth,
        emailToUse,
        passwordToUse
      );

      if (userCredential.user.emailVerified) {
        // Save the password if it was entered manually
        if (manualPassword && !savedPassword) {
          await AsyncStorage.setItem("savedPassword", manualPassword);
        }

        // Clear pending data
        await AsyncStorage.removeItem("pendingUserData");

        setPendingVerification(false);

        // Force refresh of user profile from AuthContext
        if (refreshUserProfile) {
          await refreshUserProfile();
        }

        // Add a delay to ensure all context updates propagate
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Navigate to dashboard
        router.replace("/dashboard");

        Alert.alert("Welcome!", "Successfully logged into your dashboard.");
      } else {
        await signOut(auth);
        Alert.alert(
          "Not Verified",
          "Email still not verified. Please check your email."
        );
      }
    } catch (error) {
      console.error("Error during login:", error);
      Alert.alert(
        "Login Failed",
        "Failed to log in. Please check your password and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const saveUserToFirestore = async (email, password) => {
    try {
      const pendingData = await AsyncStorage.getItem("pendingUserData");
      if (!pendingData) {
        throw new Error("No user data found");
      }

      const userData = JSON.parse(pendingData);

      // Temporary sign in to get user UID
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const currentUser = userCredential.user;

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

      await addDoc(collection(db, "notifications"), {
        type: "user_created",
        title: "New Executive Joined",
        message: `${userData.fullName} (${userData.role}) has joined the union as an executive`,
        timestamp: new Date(),
        read: false,
      });

      // Sign out after saving
      await signOut(auth);

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
            {/* Icon and Title */}
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
                  name={isEmailVerified ? "checkmark-circle" : "mail"}
                  size={56}
                  color={isEmailVerified ? Colors.green : Colors.blueAccent}
                />
              </View>

              <ThemedText type="title" style={styles.title}>
                {isEmailVerified ? "Email Verified ✓" : "Check Your Email"}
              </ThemedText>

              <ThemedText style={styles.subtitle}>
                {isEmailVerified
                  ? "Ready to continue to your dashboard"
                  : `Verification link sent to`}
              </ThemedText>

              {userEmail && (
                <ThemedText style={styles.emailText}>{userEmail}</ThemedText>
              )}
            </View>

            {/* Password Input (shown when needed) */}
            {showPasswordInput && !isEmailVerified && (
              <View style={styles.passwordCard}>
                <ThemedText style={styles.passwordTitle}>
                  Security Check Required
                </ThemedText>
                <ThemedText style={styles.passwordSubtitle}>
                  For security reasons, please enter your password to verify
                  your identity.
                </ThemedText>

                <View style={styles.passwordInputContainer}>
                  <Ionicons
                    name="lock-closed"
                    size={20}
                    color={Colors.blueAccent}
                    style={styles.passwordIcon}
                  />
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter your password"
                    secureTextEntry
                    value={manualPassword}
                    onChangeText={setManualPassword}
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                  />
                </View>

                <ThemedText style={styles.passwordNote}>
                  Your password is required to access verification status for
                  security purposes.
                </ThemedText>
              </View>
            )}

            {/* Main Content Card */}
            <View style={styles.card}>
              {!isEmailVerified ? (
                <>
                  <ThemedText style={styles.cardTitle}>Next Steps:</ThemedText>
                  <ThemedText style={styles.instructionText}>
                    1. Open your email inbox{"\n"}
                    2. Click the verification link{"\n"}
                    3. Return here and check status
                  </ThemedText>

                  <View style={styles.divider} />

                  <ThemedText style={styles.noteText}>
                    Don't see the email? Check your spam folder or request a new
                    one.
                  </ThemedText>
                </>
              ) : (
                <ThemedText style={styles.successText}>
                  Your email has been verified successfully! Click the button
                  below to log in and continue to your dashboard.
                </ThemedText>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
              {isEmailVerified ? (
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { backgroundColor: Colors.green },
                  ]}
                  onPress={handleContinueToDashboard}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="log-in" size={20} color="#fff" />
                      <ThemedText style={styles.primaryButtonText}>
                        Continue to Dashboard
                      </ThemedText>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      { backgroundColor: Colors.blueAccent },
                    ]}
                    onPress={handleCheckVerification}
                    disabled={
                      checkingStatus || (showPasswordInput && !manualPassword)
                    }
                  >
                    {checkingStatus ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="refresh" size={20} color="#fff" />
                        <ThemedText style={styles.primaryButtonText}>
                          Check Verification Status
                        </ThemedText>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleResendVerification}
                    disabled={
                      resending || (showPasswordInput && !manualPassword)
                    }
                  >
                    {resending ? (
                      <ActivityIndicator
                        color={Colors.blueAccent}
                        size="small"
                      />
                    ) : (
                      <ThemedText style={styles.secondaryButtonText}>
                        Resend Verification Email
                      </ThemedText>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Footer Link */}
            <TouchableOpacity
              style={styles.footerLink}
              onPress={handleGoToHome}
            >
              <ThemedText style={styles.footerLinkText}>
                Back to Home
              </ThemedText>
            </TouchableOpacity>
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
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    opacity: 0.6,
    textAlign: "center",
    marginBottom: 6,
  },
  emailText: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    color: Colors.blueAccent,
    marginTop: 4,
  },
  // New styles for password input
  passwordCard: {
    backgroundColor: Colors.uiBackground,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: Colors.blueAccent,
  },
  passwordTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: Colors.blueAccent,
  },
  passwordSubtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 16,
    lineHeight: 20,
  },
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${Colors.blueAccent}08`,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: `${Colors.blueAccent}20`,
  },
  passwordIcon: {
    marginRight: 12,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.text,
  },
  passwordNote: {
    fontSize: 12,
    opacity: 0.6,
    fontStyle: "italic",
  },
  card: {
    backgroundColor: Colors.uiBackground,
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 15,
    lineHeight: 24,
    opacity: 0.7,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 16,
    opacity: 0.3,
  },
  noteText: {
    fontSize: 13,
    opacity: 0.6,
    fontStyle: "italic",
  },
  successText: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.8,
    textAlign: "center",
  },
  actions: {
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.blueAccent,
  },
  secondaryButtonText: {
    color: Colors.blueAccent,
    fontSize: 15,
    fontWeight: "600",
  },
  footerLink: {
    alignItems: "center",
    paddingVertical: 12,
  },
  footerLinkText: {
    fontSize: 15,
    opacity: 0.6,
    fontWeight: "500",
  },
});
