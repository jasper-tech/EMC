import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
  ScrollView,
} from "react-native";
import React, { useState, useEffect, useRef, useContext } from "react";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import { router, useLocalSearchParams } from "expo-router";
import {
  signInWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { auth, db } from "../firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ThemeContext } from "../context/ThemeContext";
// import { useAuth } from "../context/AuthContext";
import { saveUserToFirestore } from "./signup";

WebBrowser.maybeCompleteAuthSession();

const Login = () => {
  const { scheme } = useContext(ThemeContext);
  // const { user } = useAuth();
  const theme = Colors[scheme] ?? Colors.light;
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const params = useLocalSearchParams();
  const [securityMessage, setSecurityMessage] = useState("");

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const inputFocusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (params.prefillEmail) {
      setFormData((prev) => ({ ...prev, email: params.prefillEmail }));
    }
    if (params.message) {
      setSecurityMessage(params.message);
    }
  }, [params.prefillEmail, params.message]);

  const handleInputFocus = () => {
    Animated.timing(inputFocusAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleInputBlur = () => {
    Animated.timing(inputFocusAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const user = userCredential.user;

      // Force reload to get latest verification status
      await user.reload();

      if (!user.emailVerified) {
        Alert.alert(
          "Email Not Verified",
          "Please verify your email before signing in.",
          [
            {
              text: "Resend Verification",
              onPress: async () => {
                try {
                  await sendEmailVerification(user);
                  Alert.alert("Success", "Verification email sent!");
                } catch (error) {
                  Alert.alert("Error", "Failed to send verification email");
                }
              },
            },
            { text: "OK" },
          ]
        );
        setLoading(false);
        return;
      }

      // Save user identity for quick login
      await AsyncStorage.setItem("userEmail", user.email);
      await AsyncStorage.setItem(
        "userName",
        user.displayName || user.email.split("@")[0]
      );

      // Check if we need to save to Firestore (first time login after verification)
      const pendingData = await AsyncStorage.getItem("pendingUserData");
      if (pendingData) {
        await saveUserToFirestore(user);
      }

      // ✅ Fetch user profile from Firestore and save profile image
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();

        // Save profile image with BOTH keys
        if (userData.profileImg) {
          // User-specific key (for SidePanel)
          await AsyncStorage.setItem(
            `savedProfileImg_${user.uid}`,
            userData.profileImg
          );

          // ✅ Email-based key (for Index page quick login)
          const emailKey = user.email.replace(/[@.]/g, "_");
          await AsyncStorage.setItem(
            `savedProfileImg_${emailKey}`,
            userData.profileImg
          );

          // Also save to general key for backwards compatibility
          await AsyncStorage.setItem("savedProfileImg", userData.profileImg);
        }

        // Save user name with user-specific key
        if (userData.fullName) {
          await AsyncStorage.setItem(`userName_${user.uid}`, userData.fullName);
        }
      } else {
        // Create basic profile if doesn't exist
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      console.log("Login successful, navigating to dashboard");
      router.replace("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      let errorMessage = "An error occurred during login";

      switch (error.code) {
        case "auth/invalid-email":
          errorMessage = "Invalid email address";
          break;
        case "auth/user-disabled":
          errorMessage = "This account has been disabled";
          break;
        case "auth/user-not-found":
          errorMessage = "No account found with this email";
          break;
        case "auth/wrong-password":
          errorMessage = "Incorrect password";
          break;
        case "auth/invalid-credential":
          errorMessage = "Invalid email or password";
          break;
        default:
          errorMessage = error.message;
      }

      Alert.alert("Login Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.backgroundGraphics}>
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
        <View style={[styles.circle, styles.circle3]} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
              },
            ]}
          >
            {/* Security Notice */}
            {securityMessage && (
              <View style={styles.securityNoticeShield}>
                <Ionicons
                  name="shield-checkmark"
                  size={20}
                  color={Colors.greenAccent}
                />
                <ThemedText style={styles.securityText}>
                  {securityMessage}
                </ThemedText>
              </View>
            )}

            {/* Default Security Message */}
            {!securityMessage && (
              <View style={styles.securityNotice}>
                <Ionicons
                  name="warning"
                  size={20}
                  color={Colors.yellowAccent}
                />
                <View>
                  <ThemedText style={styles.securityTitle}>
                    Authentication Required
                  </ThemedText>
                  <ThemedText style={styles.securitySubtitle}>
                    Make sure no one else is around when you enter your
                    password.
                  </ThemedText>
                </View>
              </View>
            )}

            {/* Form Section */}
            <View style={styles.form}>
              {/* Email Input */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Email Address</ThemedText>
                <Animated.View
                  style={[
                    styles.inputWrapper,
                    {
                      transform: [
                        {
                          scale: inputFocusAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.02],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={Colors.blueAccent}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#999"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={formData.email}
                    onChangeText={(text) =>
                      setFormData({ ...formData, email: text })
                    }
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    editable={!loading}
                    color={theme.text}
                  />
                </Animated.View>
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Password</ThemedText>
                <Animated.View
                  style={[
                    styles.inputWrapper,
                    {
                      transform: [
                        {
                          scale: inputFocusAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.02],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={Colors.blueAccent}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor="#999"
                    secureTextEntry={!isPasswordVisible}
                    value={formData.password}
                    onChangeText={(text) =>
                      setFormData({ ...formData, password: text })
                    }
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    editable={!loading}
                    color={theme.text}
                  />
                  <TouchableOpacity
                    style={styles.visibilityToggle}
                    onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                  >
                    <Ionicons
                      name={
                        isPasswordVisible ? "eye-off-outline" : "eye-outline"
                      }
                      size={20}
                      color={Colors.blueAccent}
                    />
                  </TouchableOpacity>
                </Animated.View>
              </View>

              {/* Options Row */}
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={styles.forgotPassword}
                  disabled={loading}
                >
                  <ThemedText style={styles.forgotPasswordText}>
                    Forgot Password?
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={[
                  styles.loginButton,
                  loading && styles.loginButtonDisabled,
                ]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="log-in-outline" size={20} color="#fff" />
                    <ThemedText style={styles.loginButtonText}>
                      Sign In
                    </ThemedText>
                  </>
                )}
              </TouchableOpacity>

              {/* Sign Up Link */}
              <View style={styles.signupContainer}>
                <ThemedText style={styles.signupText}>
                  Don't have an account?{" "}
                </ThemedText>
                <TouchableOpacity
                  onPress={() => router.push("/signup")}
                  disabled={loading}
                >
                  <ThemedText style={styles.signupLink}>
                    Create Account
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <ThemedText style={styles.footerText}>
                Secure • Encrypted • Trusted
              </ThemedText>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
};

export default Login;

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
    width: 250,
    height: 250,
    top: -100,
    right: -80,
  },
  circle2: {
    width: 180,
    height: 180,
    bottom: 80,
    left: -40,
    backgroundColor: `${Colors.blueAccent}05`,
  },
  circle3: {
    width: 120,
    height: 120,
    bottom: -30,
    right: 40,
    backgroundColor: `${Colors.blueAccent}03`,
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
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 38,
  },
  securityNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.uiBackground,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: Colors.yellowAccent,
    gap: 12,
  },
  securityNoticeShield: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.uiBackground,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: Colors.greenAccent,
    gap: 12,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: "600",
    // color: "#0C4D6B",
    marginBottom: 4,
  },
  securitySubtitle: {
    fontSize: 14,
    // color: "#0C4D6B",
    opacity: 0.8,
  },
  securityText: {
    fontSize: 14,
    // color: "#0C4D6B",
    fontWeight: "500",
    flex: 1,
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: Colors.blueAccent,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.uiBackground,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: `${Colors.blueAccent}20`,
    shadowColor: Colors.blueAccent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.text,
  },
  visibilityToggle: {
    padding: 4,
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 32,
  },
  forgotPassword: {},
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.blueAccent,
  },
  loginButton: {
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
    marginBottom: 24,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signupText: {
    fontSize: 14,
    opacity: 0.7,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.blueAccent,
  },
  footer: {
    alignItems: "center",
    marginTop: 40,
  },
  footerText: {
    fontSize: 12,
    opacity: 0.5,
    letterSpacing: 1,
  },
});
