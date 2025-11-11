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
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import React, { useState } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import RNPickerSelect from "react-native-picker-select";
import { Colors } from "../constants/Colors";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import { router } from "expo-router";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const Signup = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    role: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [tempRole, setTempRole] = useState("");

  const validateForm = () => {
    if (
      !formData.fullName ||
      !formData.email ||
      !formData.phone ||
      !formData.role ||
      !formData.password ||
      !formData.confirmPassword
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
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const user = userCredential.user;

      try {
        await user.getIdToken();
      } catch (tokenErr) {
        console.warn(
          "Could not refresh user token before writing user document:",
          tokenErr
        );
      }

      await updateProfile(user, {
        displayName: formData.fullName,
      });

      await setDoc(doc(db, "users", user.uid), {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        createdAt: new Date().toISOString(),
        uid: user.uid,
      });

      console.log("User created and saved to Firestore:", user.uid);

      Alert.alert("Success", "Account created successfully!", [
        {
          text: "OK",
          onPress: () => router.push("/dashboard"),
        },
      ]);
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <MaterialIcons
              name="group-add"
              size={60}
              color={Colors.blueAccent}
            />
            <ThemedText type="title" style={styles.title}>
              Create Account
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Join your union community today
            </ThemedText>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Full Name</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                value={formData.fullName}
                onChangeText={(text) =>
                  setFormData({ ...formData, fullName: text })
                }
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Email</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(text) =>
                  setFormData({ ...formData, email: text })
                }
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Phone Number</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
                value={formData.phone}
                onChangeText={(text) =>
                  setFormData({ ...formData, phone: text })
                }
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Role</ThemedText>
              {Platform.OS === "ios" ? (
                <TouchableOpacity
                  style={styles.pickerTouchable}
                  onPress={openRolePicker}
                  disabled={loading}
                >
                  <ThemedText
                    style={[
                      styles.pickerText,
                      !formData.role && styles.pickerPlaceholder,
                    ]}
                  >
                    {formData.role || "Select your role"}
                  </ThemedText>
                  <MaterialIcons
                    name="arrow-drop-down"
                    size={24}
                    color="#666"
                  />
                </TouchableOpacity>
              ) : (
                <View style={styles.pickerContainer}>
                  <RNPickerSelect
                    placeholder={{
                      label: "Select your role",
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
                  />
                </View>
              )}
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Password</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Create a password (min 6 characters)"
                secureTextEntry
                value={formData.password}
                onChangeText={(text) =>
                  setFormData({ ...formData, password: text })
                }
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Confirm Password</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Confirm your password"
                secureTextEntry
                value={formData.confirmPassword}
                onChangeText={(text) =>
                  setFormData({ ...formData, confirmPassword: text })
                }
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.signupButton,
                loading && styles.signupButtonDisabled,
              ]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.signupButtonText}>Sign Up</ThemedText>
              )}
            </TouchableOpacity>

            <View style={styles.loginContainer}>
              <ThemedText style={styles.loginText}>
                Already have an account?{" "}
              </ThemedText>
              <TouchableOpacity onPress={() => router.push("/")}>
                <ThemedText style={styles.loginLink}>Login</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleRoleCancel}>
                <ThemedText style={styles.modalButton}>Cancel</ThemedText>
              </TouchableOpacity>
              <ThemedText style={styles.modalTitle}>Select Role</ThemedText>
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

export default Signup;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  pickerTouchable: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pickerText: {
    fontSize: 16,
    color: "#000",
  },
  pickerPlaceholder: {
    color: "#9EA0A4",
  },
  signupButton: {
    backgroundColor: Colors.blueAccent,
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 10,
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
    marginTop: 24,
  },
  loginText: {
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.blueAccent,
  },
  pickerContainer: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  pickerInputAndroid: {
    fontSize: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    color: "#000",
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
    backgroundColor: "#000",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  modalButton: {
    fontSize: 17,
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
