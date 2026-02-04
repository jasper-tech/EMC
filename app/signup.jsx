import {
  StyleSheet,
  ScrollView,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  Animated,
  Dimensions,
} from "react-native";

import { Picker } from "@react-native-picker/picker";
import React, { useState, useRef, useContext } from "react";
import { Ionicons } from "@expo/vector-icons";
import RNPickerSelect from "react-native-picker-select";
import { Colors } from "../constants/Colors";
import { ThemeContext } from "../context/ThemeContext";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import { router } from "expo-router";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc, collection, addDoc } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomAlert from "../components/CustomAlert"; // Import CustomAlert

const { width, height } = Dimensions.get("window");
const isWeb = Platform.OS === "web";
const isTablet = width >= 768;

const Signup = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    role: "",
    password: "",
    confirmPassword: "",
    address: "",
  });
  const [loading, setLoading] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [tempRole, setTempRole] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);
  const [showVerificationAlert, setShowVerificationAlert] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");

  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;
  const accentColors = Colors;

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const inputFocusAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
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

  const validateForm = () => {
    if (
      !formData.fullName ||
      !formData.email ||
      !formData.phone ||
      !formData.role ||
      !formData.password ||
      !formData.confirmPassword ||
      !formData.address
    ) {
      Alert.alert("Error", "Please fill in all fields");
      return false;
    }

    if (formData.password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return false;
    }

    return true;
  };

  const handleVerificationAlertConfirm = () => {
    setShowVerificationAlert(false);
    // Redirect to login with email pre-filled
    router.replace({
      pathname: "/login",
      params: {
        prefillEmail: verificationEmail,
        message:
          "Please verify your email and sign in to continue. Check spam if you don't see the email.",
      },
    });
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // 1. Create user in Firebase Auth only
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const user = userCredential.user;

      // 2. Update profile with display name
      await updateProfile(user, {
        displayName: formData.fullName,
      });

      // 3. Save user data temporarily (NOT to Firestore yet)
      const userData = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        address: formData.address,
        createdAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem("pendingUserData", JSON.stringify(userData));

      // 4. Send verification email
      await sendEmailVerification(user);

      // 5. Sign out immediately (user cannot access app until verified)
      await signOut(auth);

      // Clear form
      setFormData({
        fullName: "",
        email: "",
        phone: "",
        role: "",
        password: "",
        confirmPassword: "",
        address: "",
      });

      // Show custom verification alert
      setVerificationEmail(userData.email);
      setShowVerificationAlert(true);
    } catch (error) {
      console.error("Signup error:", error);
      let errorMessage = "An error occurred during signup";

      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage = "This email is already registered";
          break;
        case "auth/invalid-email":
          errorMessage = "Invalid email address";
          break;
        case "auth/operation-not-allowed":
          errorMessage = "Email/password accounts are not enabled";
          break;
        case "auth/weak-password":
          errorMessage = "Password is too weak";
          break;
        default:
          errorMessage = error.message;
      }

      Alert.alert("Signup Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { label: "Union President", value: "Union President" },
    { label: "Union Vice President", value: "Union Vice President" },
    { label: "Union General Secretary", value: "Union General Secretary" },
    { label: "Union Assistant Secretary", value: "Union Assistant Secretary" },
    { label: "Union Financial Secretary", value: "Union Financial Secretary" },
    { label: "Union Treasurer", value: "Union Treasurer" },
    {
      label: "Union Organizing Secretary",
      value: "Union Organizing Secretary",
    },
    {
      label: "Union Assistant Organizing Secretary",
      value: "Union Assistant Organizing Secretary",
    },
    { label: "Union Mother", value: "Union Mother" },
    { label: "Union Prayer Secretary", value: "Union Prayer Secretary" },
    { label: "Union Bible Facilitator", value: "Union Bible Facilitator" },
  ];

  const openRolePicker = () => {
    setTempRole(formData.role || roleOptions[0].value);
    setShowRolePicker(true);
  };

  const handleRoleConfirm = () => {
    setFormData({ ...formData, role: tempRole });
    setShowRolePicker(false);
  };

  const handleRoleCancel = () => {
    setShowRolePicker(false);
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
                Create Your Account
              </ThemedText>
            </View>

            {/* Form Section */}
            <View style={styles.form}>
              {/* Full Name Input */}
              <View style={styles.inputContainer}>
                <ThemedText
                  style={[styles.label, { color: accentColors.blueAccent }]}
                >
                  Full Name
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
                    name="person-outline"
                    size={20}
                    color={accentColors.blueAccent}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Enter your full name"
                    placeholderTextColor={theme.iconColor}
                    value={formData.fullName}
                    onChangeText={(text) =>
                      setFormData({ ...formData, fullName: text })
                    }
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    editable={!loading}
                  />
                </Animated.View>
              </View>

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
                    value={formData.email}
                    onChangeText={(text) =>
                      setFormData({ ...formData, email: text })
                    }
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    editable={!loading}
                  />
                </Animated.View>
              </View>

              {/* Phone Input */}
              <View style={styles.inputContainer}>
                <ThemedText
                  style={[styles.label, { color: accentColors.blueAccent }]}
                >
                  Phone Number
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
                    name="call-outline"
                    size={20}
                    color={accentColors.blueAccent}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Enter your phone number"
                    placeholderTextColor={theme.iconColor}
                    keyboardType="phone-pad"
                    value={formData.phone}
                    onChangeText={(text) =>
                      setFormData({ ...formData, phone: text })
                    }
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    editable={!loading}
                  />
                </Animated.View>
              </View>

              {/* Address Input */}
              <View style={styles.inputContainer}>
                <ThemedText
                  style={[styles.label, { color: accentColors.blueAccent }]}
                >
                  Address
                </ThemedText>
                <Animated.View
                  style={[
                    styles.inputWrapper,
                    styles.textAreaWrapper,
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
                    name="home-outline"
                    size={20}
                    color={accentColors.blueAccent}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      styles.textArea,
                      { color: theme.text },
                    ]}
                    placeholder="Enter your address"
                    placeholderTextColor={theme.iconColor}
                    value={formData.address}
                    onChangeText={(text) =>
                      setFormData({ ...formData, address: text })
                    }
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    multiline
                    numberOfLines={3}
                    editable={!loading}
                  />
                </Animated.View>
              </View>

              {/* Role Selection */}
              <View style={styles.inputContainer}>
                <ThemedText
                  style={[styles.label, { color: accentColors.blueAccent }]}
                >
                  Union Role
                </ThemedText>
                {Platform.OS === "ios" ? (
                  <TouchableOpacity
                    style={[
                      styles.pickerTouchable,
                      {
                        backgroundColor: theme.uiBackground,
                        borderColor: `${accentColors.blueAccent}20`,
                        shadowColor: accentColors.blueAccent,
                      },
                    ]}
                    onPress={openRolePicker}
                    disabled={loading}
                  >
                    <Ionicons
                      name="person-circle-outline"
                      size={20}
                      color={accentColors.blueAccent}
                      style={styles.inputIcon}
                    />
                    <ThemedText
                      style={[
                        styles.pickerText,
                        !formData.role && styles.pickerPlaceholder,
                        { color: formData.role ? theme.text : theme.iconColor },
                      ]}
                    >
                      {formData.role || "Select your union role"}
                    </ThemedText>
                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color={accentColors.blueAccent}
                    />
                  </TouchableOpacity>
                ) : (
                  <View
                    style={[
                      styles.pickerContainer,
                      {
                        backgroundColor: theme.uiBackground,
                        borderColor: `${accentColors.blueAccent}20`,
                        shadowColor: accentColors.blueAccent,
                      },
                    ]}
                  >
                    <RNPickerSelect
                      placeholder={{
                        label: "Select your union role",
                        value: null,
                        color: theme.iconColor,
                      }}
                      items={roleOptions.map((option) => ({
                        ...option,
                        color: theme.text,
                      }))}
                      onValueChange={(value) =>
                        setFormData({ ...formData, role: value })
                      }
                      value={formData.role}
                      disabled={loading}
                      style={{
                        inputAndroid: [
                          styles.pickerInputAndroid,
                          { color: theme.text },
                        ],
                        inputIOS: [
                          styles.pickerInputAndroid,
                          { color: theme.text },
                        ],
                        placeholder: {
                          color: theme.iconColor,
                        },
                      }}
                      useNativeAndroidPickerStyle={false}
                      Icon={() => (
                        <Ionicons
                          name="chevron-down"
                          size={20}
                          color={accentColors.blueAccent}
                        />
                      )}
                    />
                  </View>
                )}
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <ThemedText
                  style={[styles.label, { color: accentColors.blueAccent }]}
                >
                  Password
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
                    name="lock-closed-outline"
                    size={20}
                    color={accentColors.blueAccent}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Create a password (min 6 characters)"
                    placeholderTextColor={theme.iconColor}
                    secureTextEntry={!isPasswordVisible}
                    value={formData.password}
                    onChangeText={(text) =>
                      setFormData({ ...formData, password: text })
                    }
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    editable={!loading}
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
                      color={accentColors.blueAccent}
                    />
                  </TouchableOpacity>
                </Animated.View>
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputContainer}>
                <ThemedText
                  style={[styles.label, { color: accentColors.blueAccent }]}
                >
                  Confirm Password
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
                    name="lock-closed-outline"
                    size={20}
                    color={accentColors.blueAccent}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Confirm your password"
                    placeholderTextColor={theme.iconColor}
                    secureTextEntry={!isConfirmPasswordVisible}
                    value={formData.confirmPassword}
                    onChangeText={(text) =>
                      setFormData({ ...formData, confirmPassword: text })
                    }
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.visibilityToggle}
                    onPress={() =>
                      setIsConfirmPasswordVisible(!isConfirmPasswordVisible)
                    }
                  >
                    <Ionicons
                      name={
                        isConfirmPasswordVisible
                          ? "eye-off-outline"
                          : "eye-outline"
                      }
                      size={20}
                      color={accentColors.blueAccent}
                    />
                  </TouchableOpacity>
                </Animated.View>
              </View>

              {/* Sign Up Button */}
              <TouchableOpacity
                style={[
                  styles.signupButton,
                  loading && styles.signupButtonDisabled,
                  {
                    backgroundColor: accentColors.blueAccent,
                    shadowColor: accentColors.blueAccent,
                  },
                ]}
                onPress={handleSignup}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons
                      name="person-add-outline"
                      size={20}
                      color="#fff"
                    />
                    <ThemedText style={styles.signupButtonText}>
                      Create Account
                    </ThemedText>
                  </>
                )}
              </TouchableOpacity>

              {/* Login Link */}
              <View style={styles.loginContainer}>
                <ThemedText style={[styles.loginText, { opacity: 0.7 }]}>
                  Already have an account?{" "}
                </ThemedText>
                <TouchableOpacity
                  onPress={() => router.push("/login")}
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
            {/* <View style={styles.footer}>
              <ThemedText style={[styles.footerText, { opacity: 0.5 }]}>
                Secure • Community • Trusted
              </ThemedText>
            </View> */}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* iOS Modal Picker */}
      <Modal
        visible={showRolePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={handleRoleCancel}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={handleRoleCancel}
          />
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.uiBackground,
                maxHeight: height * 0.6,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleRoleCancel}>
                <ThemedText
                  style={[
                    styles.modalButton,
                    { color: accentColors.blueAccent },
                  ]}
                >
                  Cancel
                </ThemedText>
              </TouchableOpacity>
              <ThemedText style={styles.modalTitle}>
                Select Union Role
              </ThemedText>
              <TouchableOpacity onPress={handleRoleConfirm}>
                <ThemedText
                  style={[
                    styles.modalButton,
                    styles.modalButtonDone,
                    { color: accentColors.blueAccent },
                  ]}
                >
                  Done
                </ThemedText>
              </TouchableOpacity>
            </View>
            <Picker
              selectedValue={tempRole}
              onValueChange={(itemValue) => setTempRole(itemValue)}
              style={[styles.picker, { color: theme.text }]}
              dropdownIconColor={accentColors.blueAccent}
            >
              {roleOptions.map((option) => (
                <Picker.Item
                  key={option.value}
                  label={option.label}
                  value={option.value}
                  color={theme.text}
                />
              ))}
            </Picker>
          </View>
        </View>
      </Modal>

      {/* Custom Verification Alert */}
      <CustomAlert
        visible={showVerificationAlert}
        type="info"
        title=" Check Your Email"
        message={`We've sent a verification link to: ${verificationEmail}\n\nImportant:\n• Check your INBOX\n• Also check SPAM/JUNK folder\n• Click the link to verify your account`}
        confirmText="Continue to Login"
        onConfirm={handleVerificationAlertConfirm}
        autoClose={false}
      />
    </ThemedView>
  );
};

// Export the saveUserToFirestore function for login component
export const saveUserToFirestore = async (user) => {
  try {
    const pendingData = await AsyncStorage.getItem("pendingUserData");
    if (!pendingData) {
      console.log("No pending user data found");
      return;
    }

    const userData = JSON.parse(pendingData);

    // Save to users collection
    await setDoc(doc(db, "users", user.uid), {
      ...userData,
      uid: user.uid,
      emailVerified: true,
      profileImg: "",
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
      uid: user.uid,
      profileImg: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    //  CREATE NOTIFICATION FOR NEW EXECUTIVE
    await addDoc(collection(db, "notifications"), {
      type: "user_created",
      title: "New Executive Member",
      message: `${userData.fullName} has joined as ${userData.role}`,
      timestamp: new Date(),
      read: false,
      userId: user.uid,
      userRole: userData.role,
    });

    // console.log(" New executive notification created");

    // Clear pending data
    await AsyncStorage.removeItem("pendingUserData");

    console.log("User saved to Firestore after verification with notification");
  } catch (error) {
    console.error("Error saving to Firestore:", error);
    throw error;
  }
};

export default Signup;

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
  header: {
    alignItems: "center",
    marginBottom: isWeb ? 50 : 40,
  },
  title: {
    fontSize: isWeb ? 40 : 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: isWeb ? 48 : 38,
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: isWeb ? 28 : 24,
  },
  label: {
    fontSize: isWeb ? 16 : 14,
    fontWeight: "600",
    marginBottom: 10,
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
  textAreaWrapper: {
    alignItems: "flex-start",
    paddingVertical: isWeb ? 16 : 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: isWeb ? 18 : 16,
    fontSize: isWeb ? 18 : 16,
  },
  textArea: {
    height: isWeb ? 100 : 80,
    textAlignVertical: "top",
  },
  visibilityToggle: {
    padding: 4,
    marginLeft: 4,
  },
  pickerTouchable: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: isWeb ? 12 : 16,
    paddingHorizontal: isWeb ? 20 : 16,
    paddingVertical: isWeb ? 18 : 16,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pickerText: {
    flex: 1,
    fontSize: isWeb ? 18 : 16,
  },
  pickerPlaceholder: {
    opacity: 0.7,
  },
  pickerContainer: {
    borderRadius: isWeb ? 12 : 16,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  pickerInputAndroid: {
    fontSize: isWeb ? 18 : 16,
    paddingVertical: isWeb ? 18 : 16,
    paddingHorizontal: isWeb ? 20 : 16,
  },
  signupButton: {
    borderRadius: isWeb ? 12 : 16,
    padding: isWeb ? 22 : 18,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: isWeb ? 32 : 24,
  },
  signupButtonDisabled: {
    opacity: 0.7,
  },
  signupButtonText: {
    color: "#fff",
    fontSize: isWeb ? 18 : 16,
    fontWeight: "bold",
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: isWeb ? 40 : 34,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: isWeb ? 30 : 20,
    paddingVertical: isWeb ? 20 : 16,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.blueAccent}20`,
  },
  modalTitle: {
    fontSize: isWeb ? 20 : 18,
    fontWeight: "600",
  },
  modalButton: {
    fontSize: isWeb ? 18 : 16,
  },
  modalButtonDone: {
    fontWeight: "600",
  },
  picker: {
    width: "100%",
    height: isWeb ? 240 : 216,
  },
});
