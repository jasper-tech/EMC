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
  Dimensions,
} from "react-native";
import React, { useState, useEffect, useRef, useContext } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import { router, useLocalSearchParams } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeContext } from "../context/ThemeContext";

const { width, height } = Dimensions.get("window");
const isWeb = Platform.OS === "web";
const isTablet = width >= 768;

const ForgotPassword = () => {
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;
  const accentColors = Colors;
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const params = useLocalSearchParams();

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
    // Load saved email or prefilled email
    const loadEmail = async () => {
      if (params.prefillEmail) {
        setEmail(params.prefillEmail);
      } else {
        const savedEmail = await AsyncStorage.getItem("userEmail");
        if (savedEmail) {
          setEmail(savedEmail);
        }
      }
    };
    loadEmail();
  }, [params.prefillEmail]);

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

  const handleSendResetEmail = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);

      // Save email for future reference
      await AsyncStorage.setItem("userEmail", email);

      setEmailSent(true);
      Alert.alert(
        "Success",
        `A password reset link has been sent to ${email}. Please check your inbox and spam folder.`,
        [
          {
            text: "OK",
            onPress: () => {
              router.replace("/login");
            },
          },
        ]
      );
    } catch (error) {
      console.error("Password reset error:", error);
      let errorMessage = "An error occurred while sending the reset email";

      switch (error.code) {
        case "auth/invalid-email":
          errorMessage = "Invalid email address";
          break;
        case "auth/user-not-found":
          errorMessage = "No account found with this email address";
          break;
        case "auth/too-many-requests":
          errorMessage = "Too many requests. Please try again later";
          break;
        default:
          errorMessage = error.message;
      }

      Alert.alert("Reset Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.backgroundGraphics}>
        <View
          style={[
            styles.circle,
            styles.circle1,
            { backgroundColor: `${accentColors.blueAccent}08` },
          ]}
        />
        <View
          style={[
            styles.circle,
            styles.circle2,
            { backgroundColor: `${accentColors.blueAccent}05` },
          ]}
        />
        <View
          style={[
            styles.circle,
            styles.circle3,
            { backgroundColor: `${accentColors.blueAccent}03` },
          ]}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
        enabled={!isWeb}
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
                maxWidth: isWeb ? 600 : "100%",
                alignSelf: "center",
                width: "100%",
              },
            ]}
          >
            {/* Header Section */}
            <View style={styles.header}>
              <ThemedText type="title" style={styles.title}>
                Reset Password
              </ThemedText>
              <ThemedText style={styles.subtitle}>
                Enter your email address and we'll send you a link to reset your
                password
              </ThemedText>
            </View>

            {/* Form Section */}
            <View style={styles.form}>
              {/* Email Input */}
              <View style={styles.inputContainer}>
                <ThemedText
                  style={[styles.label, { color: accentColors.blueAccent }]}
                >
                  Email Address
                </ThemedText>
                <Animated.View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: theme.uiBackground,
                      borderColor: `${accentColors.blueAccent}20`,
                      shadowColor: accentColors.blueAccent,
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
                    color={accentColors.blueAccent}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Enter your email"
                    placeholderTextColor={theme.iconColor}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    editable={!loading && !emailSent}
                  />
                </Animated.View>
              </View>

              {/* Send Reset Link Button */}
              <TouchableOpacity
                style={[
                  styles.resetButton,
                  (loading || emailSent) && styles.resetButtonDisabled,
                  {
                    backgroundColor: accentColors.blueAccent,
                    shadowColor: accentColors.blueAccent,
                  },
                ]}
                onPress={handleSendResetEmail}
                disabled={loading || emailSent}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="send-outline" size={20} color="#fff" />
                    <ThemedText style={styles.resetButtonText}>
                      {emailSent ? "Email Sent" : "Send Reset Link"}
                    </ThemedText>
                  </>
                )}
              </TouchableOpacity>

              {/* Info Box */}
              <View
                style={[
                  styles.infoBox,
                  {
                    backgroundColor: theme.uiBackground,
                    borderLeftColor: accentColors.yellowAccent,
                  },
                ]}
              >
                <Ionicons
                  name="information-circle"
                  size={20}
                  color={accentColors.yellowAccent}
                />
                <View style={styles.infoTextContainer}>
                  <ThemedText style={styles.infoTitle}>
                    What happens next?
                  </ThemedText>
                  <ThemedText style={styles.infoText}>
                    • Check your email inbox for a reset link{"\n"}• Click the
                    link to create a new password{"\n"}• Link expires in 1 hour
                    for security{"\n"}• Check spam folder if you don't see it
                  </ThemedText>
                </View>
              </View>

              {/* Back to Login Link */}
              <View style={styles.loginContainer}>
                <ThemedText style={[styles.loginText, { opacity: 0.7 }]}>
                  Remember your password?{" "}
                </ThemedText>
                <TouchableOpacity
                  onPress={() => router.replace("/login")}
                  disabled={loading}
                >
                  <ThemedText
                    style={[
                      styles.loginLink,
                      { color: accentColors.blueAccent },
                    ]}
                  >
                    Sign In
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <ThemedText style={[styles.footerText, { opacity: 0.5 }]}>
                Secure • Encrypted • Trusted
              </ThemedText>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
};

export default ForgotPassword;

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
  },
  circle1: {
    width: isWeb ? 400 : 250,
    height: isWeb ? 400 : 250,
    top: -100,
    right: isWeb ? -100 : -80,
  },
  circle2: {
    width: isWeb ? 300 : 180,
    height: isWeb ? 300 : 180,
    bottom: isWeb ? 120 : 80,
    left: isWeb ? -80 : -40,
  },
  circle3: {
    width: isWeb ? 200 : 120,
    height: isWeb ? 200 : 120,
    bottom: -30,
    right: isWeb ? 80 : 40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: isWeb ? 40 : 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: isWeb ? 40 : 24,
    paddingTop: isWeb ? 80 : 60,
    paddingBottom: isWeb ? 80 : 40,
    justifyContent: "space-between",
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: Colors.blueAccent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    alignItems: "center",
    marginBottom: isWeb ? 50 : 40,
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
    fontSize: isWeb ? 40 : 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: isWeb ? 16 : 12,
    lineHeight: isWeb ? 48 : 38,
  },
  subtitle: {
    fontSize: isWeb ? 18 : 16,
    opacity: 0.7,
    textAlign: "center",
    lineHeight: isWeb ? 28 : 24,
    paddingHorizontal: isWeb ? 20 : 10,
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: isWeb ? 32 : 24,
  },
  label: {
    fontSize: isWeb ? 16 : 14,
    fontWeight: "600",
    marginBottom: isWeb ? 12 : 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: isWeb ? 12 : 16,
    paddingHorizontal: isWeb ? 20 : 16,
    borderWidth: 2,
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
    paddingVertical: isWeb ? 18 : 16,
    fontSize: isWeb ? 18 : 16,
  },
  resetButton: {
    borderRadius: isWeb ? 12 : 16,
    padding: isWeb ? 22 : 18,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: isWeb ? 12 : 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: isWeb ? 32 : 24,
  },
  resetButtonDisabled: {
    opacity: 0.7,
  },
  resetButtonText: {
    color: "#fff",
    fontSize: isWeb ? 18 : 16,
    fontWeight: "bold",
  },
  infoBox: {
    flexDirection: "row",
    padding: isWeb ? 20 : 16,
    borderRadius: isWeb ? 12 : 12,
    marginBottom: isWeb ? 32 : 24,
    borderLeftWidth: 4,
    gap: isWeb ? 16 : 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: isWeb ? 16 : 14,
    fontWeight: "600",
    marginBottom: isWeb ? 12 : 8,
  },
  infoText: {
    fontSize: isWeb ? 15 : 13,
    opacity: 0.7,
    lineHeight: isWeb ? 24 : 20,
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginText: {
    fontSize: isWeb ? 16 : 14,
  },
  loginLink: {
    fontSize: isWeb ? 16 : 14,
    fontWeight: "bold",
  },
  footer: {
    alignItems: "center",
    marginTop: isWeb ? 60 : 40,
  },
  footerText: {
    fontSize: isWeb ? 14 : 12,
    letterSpacing: 1,
  },
});
