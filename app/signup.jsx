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

  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;

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

      Alert.alert(
        "Verification Required",
        `We've sent a verification link to ${formData.email}. Please check your inbox and verify your email to continue.`,
        [
          {
            text: "Continue to Login",
            onPress: () => {
              // Redirect to login with email pre-filled
              router.replace({
                pathname: "/login",
                params: {
                  prefillEmail: formData.email,
                  message: "Please verify your email and sign in to continue",
                },
              });
            },
          },
        ]
      );

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
              <ThemedText type="title" style={styles.title}>
                Create Your Account
              </ThemedText>
            </View>

            {/* Form Section */}
            <View style={styles.form}>
              {/* Full Name Input */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Full Name</ThemedText>
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
                    name="person-outline"
                    size={20}
                    color={Colors.blueAccent}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    placeholderTextColor="#999"
                    value={formData.fullName}
                    onChangeText={(text) =>
                      setFormData({ ...formData, fullName: text })
                    }
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    editable={!loading}
                    color={theme.text}
                  />
                </Animated.View>
              </View>

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

              {/* Phone Input */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Phone Number</ThemedText>
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
                    name="call-outline"
                    size={20}
                    color={Colors.blueAccent}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your phone number"
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                    value={formData.phone}
                    onChangeText={(text) =>
                      setFormData({ ...formData, phone: text })
                    }
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    editable={!loading}
                    color={theme.text}
                  />
                </Animated.View>
              </View>

              {/* Address Input */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Address</ThemedText>
                <Animated.View
                  style={[
                    styles.inputWrapper,
                    styles.textAreaWrapper,
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
                    name="home-outline"
                    size={20}
                    color={Colors.blueAccent}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Enter your address"
                    placeholderTextColor="#999"
                    value={formData.address}
                    onChangeText={(text) =>
                      setFormData({ ...formData, address: text })
                    }
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    multiline
                    numberOfLines={3}
                    editable={!loading}
                    color={theme.text}
                  />
                </Animated.View>
              </View>

              {/* Role Selection */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Union Role</ThemedText>
                {Platform.OS === "ios" ? (
                  <TouchableOpacity
                    style={[
                      styles.pickerTouchable,
                      { backgroundColor: theme.uiBackground },
                    ]}
                    onPress={openRolePicker}
                    disabled={loading}
                  >
                    <Ionicons
                      name="person-circle-outline"
                      size={20}
                      color={Colors.blueAccent}
                      style={styles.inputIcon}
                    />
                    <ThemedText
                      style={[
                        styles.pickerText,
                        !formData.role && styles.pickerPlaceholder,
                      ]}
                    >
                      {formData.role || "Select your union role"}
                    </ThemedText>
                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color={Colors.blueAccent}
                    />
                  </TouchableOpacity>
                ) : (
                  <View
                    style={[
                      styles.pickerContainer,
                      { backgroundColor: theme.uiBackground },
                    ]}
                  >
                    <RNPickerSelect
                      placeholder={{
                        label: "Select your union role",
                        value: null,
                        color: "#9EA0A4",
                      }}
                      items={roleOptions}
                      onValueChange={(value) =>
                        setFormData({ ...formData, role: value })
                      }
                      value={formData.role}
                      disabled={loading}
                      style={{
                        inputAndroid: styles.pickerInputAndroid,
                        placeholder: {
                          color: "#9EA0A4",
                        },
                      }}
                      useNativeAndroidPickerStyle={false}
                      Icon={() => (
                        <Ionicons
                          name="chevron-down"
                          size={20}
                          color={Colors.blueAccent}
                        />
                      )}
                    />
                  </View>
                )}
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
                    placeholder="Create a password (min 6 characters)"
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

              {/* Confirm Password Input */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Confirm Password</ThemedText>
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
                    placeholder="Confirm your password"
                    placeholderTextColor="#999"
                    secureTextEntry={!isConfirmPasswordVisible}
                    value={formData.confirmPassword}
                    onChangeText={(text) =>
                      setFormData({ ...formData, confirmPassword: text })
                    }
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    editable={!loading}
                    color={theme.text}
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
                      color={Colors.blueAccent}
                    />
                  </TouchableOpacity>
                </Animated.View>
              </View>

              {/* Sign Up Button */}
              <TouchableOpacity
                style={[
                  styles.signupButton,
                  loading && styles.signupButtonDisabled,
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
                <ThemedText style={styles.loginText}>
                  Already have an account?{" "}
                </ThemedText>
                <TouchableOpacity
                  onPress={() => router.push("/login")}
                  disabled={loading}
                >
                  <ThemedText style={styles.loginLink}>Sign In</ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <ThemedText style={styles.footerText}>
                Secure • Community • Trusted
              </ThemedText>
            </View>
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
              { backgroundColor: theme.uiBackground },
            ]}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleRoleCancel}>
                <ThemedText style={styles.modalButton}>Cancel</ThemedText>
              </TouchableOpacity>
              <ThemedText style={styles.modalTitle}>
                Select Union Role
              </ThemedText>
              <TouchableOpacity onPress={handleRoleConfirm}>
                <ThemedText
                  style={[styles.modalButton, styles.modalButtonDone]}
                >
                  Done
                </ThemedText>
              </TouchableOpacity>
            </View>
            <Picker
              selectedValue={tempRole}
              onValueChange={(itemValue) => setTempRole(itemValue)}
              style={styles.picker}
            >
              {roleOptions.map((option) => (
                <Picker.Item
                  key={option.value}
                  label={option.label}
                  value={option.value}
                />
              ))}
            </Picker>
          </View>
        </View>
      </Modal>
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

    // ✅ CREATE NOTIFICATION FOR NEW EXECUTIVE
    await addDoc(collection(db, "notifications"), {
      type: "user_created",
      title: "New Executive Member",
      message: `${userData.fullName} has joined as ${userData.role}`,
      timestamp: new Date(),
      read: false,
      userId: user.uid,
      userRole: userData.role,
    });

    console.log("✅ New executive notification created");

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
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 38,
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
  textAreaWrapper: {
    alignItems: "flex-start",
    paddingVertical: 12,
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
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  visibilityToggle: {
    padding: 4,
  },
  pickerTouchable: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: `${Colors.blueAccent}20`,
    shadowColor: Colors.blueAccent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  pickerPlaceholder: {
    color: "#9EA0A4",
  },
  pickerContainer: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: `${Colors.blueAccent}20`,
    shadowColor: Colors.blueAccent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pickerInputAndroid: {
    fontSize: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    color: Colors.text,
  },
  signupButton: {
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
  signupButtonDisabled: {
    opacity: 0.7,
  },
  signupButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginText: {
    fontSize: 14,
    opacity: 0.7,
  },
  loginLink: {
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
    paddingBottom: 34,
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.blueAccent}20`,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalButton: {
    fontSize: 16,
    color: Colors.blueAccent,
  },
  modalButtonDone: {
    fontWeight: "600",
  },
  picker: {
    width: "100%",
    height: 216,
  },
});
