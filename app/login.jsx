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
import { router } from "expo-router";
import {
  signInWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { auth, db } from "../firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, setDoc, addDoc, collection } from "firebase/firestore";
import { ThemeContext } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

WebBrowser.maybeCompleteAuthSession();

const Login = () => {
  const { scheme } = useContext(ThemeContext);
  const { pendingVerification, setPendingVerification } = useAuth();
  const theme = Colors[scheme] ?? Colors.light;
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

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

      // Check if email is verified
      if (!user.emailVerified) {
        Alert.alert(
          "Email Not Verified",
          "Please verify your email before signing in. Check your inbox for the verification link.",
          [
            {
              text: "Resend Verification",
              onPress: async () => {
                try {
                  await sendEmailVerification(user);
                  Alert.alert("Success", "Verification email sent!");
                  // Redirect to verification screen
                  router.push("/verification-required");
                } catch (error) {
                  Alert.alert("Error", "Failed to send verification email");
                }
              },
            },
            {
              text: "Go to Verification",
              onPress: () => router.push("/verification-required"),
            },
          ]
        );
        setLoading(false);
        return;
      }

      // User is verified - proceed with login
      console.log("User logged in:", user.uid);

      // Check if user exists in Firestore, if not, create them
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        // Check if we have pending user data from signup
        const pendingData = await AsyncStorage.getItem("pendingUserData");
        if (pendingData) {
          const userData = JSON.parse(pendingData);
          await saveUserToFirestore(user, userData);
          await AsyncStorage.removeItem("pendingUserData");
        }
      }

      if (rememberMe) {
        await AsyncStorage.setItem("savedEmail", formData.email);
        await AsyncStorage.setItem("savedPassword", formData.password);
      }

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

  const saveUserToFirestore = async (user, userData) => {
    try {
      // Save to users collection
      await setDoc(doc(db, "users", user.uid), {
        ...userData,
        uid: user.uid,
        emailVerified: true,
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
        uid: user.uid,
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

      console.log("User data saved to Firestore");
    } catch (error) {
      console.error("Error saving user to Firestore:", error);
      throw error;
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
            {/* Header Section */}
            <View style={styles.header}>
              {/* <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  <Ionicons
                    name="lock-closed"
                    size={32}
                    color={Colors.blueAccent}
                  />
                </View>
                <View style={styles.welcomeBadge}>
                  <Ionicons name="flash" size={14} color={Colors.blueAccent} />
                  <ThemedText style={styles.welcomeBadgeText}>
                    Welcome Back
                  </ThemedText>
                </View>
              </View> */}

              <ThemedText type="title" style={styles.title}>
                Sign In to Your Account
              </ThemedText>
            </View>

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
                  style={styles.rememberMeContainer}
                  onPress={() => setRememberMe(!rememberMe)}
                  disabled={loading}
                >
                  <View
                    style={[
                      styles.checkbox,
                      rememberMe && styles.checkboxChecked,
                    ]}
                  >
                    {rememberMe && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </View>
                  <ThemedText style={styles.rememberMeText}>
                    Remember me
                  </ThemedText>
                </TouchableOpacity>

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

              {/* Divider */}
              {/* <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <ThemedText style={styles.dividerText}>or</ThemedText>
                <View style={styles.dividerLine} />
              </View> */}

              {/* Alternative Sign In Options */}
              {/* <View style={styles.alternativeAuthContainer}>
                <TouchableOpacity
                  style={styles.alternativeButton}
                  disabled={loading}
                >
                  <Ionicons name="logo-google" size={20} color="#DB4437" />
                  <ThemedText style={styles.alternativeButtonText}>
                    Continue with Google
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.alternativeButton}
                  disabled={loading}
                >
                  <Ionicons name="logo-apple" size={20} color="#000" />
                  <ThemedText style={styles.alternativeButtonText}>
                    Continue with Apple
                  </ThemedText>
                </TouchableOpacity>
              </View> */}

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
    marginBottom: 40,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Colors.blueAccent}15`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: `${Colors.blueAccent}20`,
  },
  welcomeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${Colors.blueAccent}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
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
    marginBottom: 12,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
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
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  rememberMeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.blueAccent,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: Colors.blueAccent,
  },
  rememberMeText: {
    fontSize: 14,
    fontWeight: "500",
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
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: `${Colors.blueAccent}20`,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    opacity: 0.5,
    fontWeight: "500",
  },
  alternativeAuthContainer: {
    gap: 12,
    marginBottom: 32,
  },
  alternativeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: `${Colors.blueAccent}20`,
    backgroundColor: Colors.uiBackground,
  },
  alternativeButtonText: {
    fontSize: 14,
    fontWeight: "600",
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
