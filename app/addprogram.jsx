import React, { useState, useContext } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import FooterNav from "../components/FooterNav";
import { CustomAlert } from "../components/CustomAlert";
import { Colors } from "../constants/Colors";
import { ThemeContext } from "../context/ThemeContext";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const { width } = Dimensions.get("window");
const isWeb = Platform.OS === "web";

// Platform-specific Date Input Component
const DateInput = ({ value, onChange, theme, placeholder }) => {
  if (Platform.OS === "web") {
    return (
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          borderWidth: 1,
          borderRadius: 12,
          borderColor: Colors.border,
          borderStyle: "solid",
          padding: "12px 16px",
          fontSize: 16,
          backgroundColor: Colors.uiBackground,
          color: theme.text,
          width: "100%",
          fontFamily: "inherit",
          minHeight: "48px", // Match TextInput height
          boxSizing: "border-box",
        }}
        placeholder={placeholder}
      />
    );
  }

  return (
    <TextInput
      style={[styles.input, { color: theme.text, borderColor: theme.border }]}
      placeholder={placeholder}
      placeholderTextColor={theme.text + "60"}
      value={value}
      onChangeText={onChange}
    />
  );
};

// Platform-specific Time Input Component
const TimeInput = ({ value, onChange, theme, placeholder }) => {
  if (Platform.OS === "web") {
    return (
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          borderWidth: 1,
          borderRadius: 12,
          borderColor: Colors.border,
          borderStyle: "solid",
          padding: "12px 16px",
          fontSize: 16,
          backgroundColor: Colors.uiBackground,
          color: theme.text,
          width: "100%",
          fontFamily: "inherit",
          minHeight: "48px", // Match TextInput height
          boxSizing: "border-box",
        }}
        placeholder={placeholder}
      />
    );
  }

  return (
    <TextInput
      style={[styles.input, { color: theme.text, borderColor: theme.border }]}
      placeholder={placeholder}
      placeholderTextColor={theme.text + "60"}
      value={value}
      onChangeText={onChange}
    />
  );
};

const AddProgram = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;

  // Alert state
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: "success",
    title: "",
    message: "",
  });

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    date: "",
    time: "",
    location: "",
    description: "",
    organizer: "",
  });

  const showAlert = (type, title, message) => {
    setAlertConfig({
      visible: true,
      type,
      title,
      message,
    });
  };

  const hideAlert = () => {
    setAlertConfig({
      ...alertConfig,
      visible: false,
    });
  };

  const handleAddProgram = async () => {
    // Basic validation
    if (!formData.title.trim()) {
      showAlert("failed", "Validation Error", "Please enter program title");
      return;
    }

    if (!formData.date.trim()) {
      showAlert("failed", "Validation Error", "Please enter program date");
      return;
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(formData.date)) {
      showAlert(
        "failed",
        "Invalid Date Format",
        "Please enter date in YYYY-MM-DD format"
      );
      return;
    }

    try {
      setLoading(true);
      const programsRef = collection(db, "programs");

      await addDoc(programsRef, {
        ...formData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Reset form
      setFormData({
        title: "",
        date: "",
        time: "",
        location: "",
        description: "",
        organizer: "",
      });

      showAlert("success", "Success!", "Program has been added successfully");
    } catch (error) {
      console.error("Error adding program:", error);
      showAlert("failed", "Error", "Failed to add program. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAlertConfirm = () => {
    hideAlert();
    if (alertConfig.type === "success") {
      router.back();
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      date: "",
      time: "",
      location: "",
      description: "",
      organizer: "",
    });
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText style={styles.subtitle}>
              Fill in the details for the upcoming program
            </ThemedText>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Program Title *</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { color: theme.text, borderColor: theme.border },
                ]}
                placeholder="Enter program title"
                placeholderTextColor={theme.text + "60"}
                value={formData.title}
                onChangeText={(text) =>
                  setFormData({ ...formData, title: text })
                }
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <ThemedText style={styles.inputLabel}>Date *</ThemedText>
                <DateInput
                  value={formData.date}
                  onChange={(text) => setFormData({ ...formData, date: text })}
                  theme={theme}
                  placeholder="YYYY-MM-DD"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <ThemedText style={styles.inputLabel}>Time</ThemedText>
                <TimeInput
                  value={formData.time}
                  onChange={(text) => setFormData({ ...formData, time: text })}
                  theme={theme}
                  placeholder="e.g., 2:00 PM"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Location</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { color: theme.text, borderColor: theme.border },
                ]}
                placeholder="Enter program location"
                placeholderTextColor={theme.text + "60"}
                value={formData.location}
                onChangeText={(text) =>
                  setFormData({ ...formData, location: text })
                }
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Organizer</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { color: theme.text, borderColor: theme.border },
                ]}
                placeholder="Enter organizer name"
                placeholderTextColor={theme.text + "60"}
                value={formData.organizer}
                onChangeText={(text) =>
                  setFormData({ ...formData, organizer: text })
                }
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Description</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { color: theme.text, borderColor: theme.border },
                ]}
                placeholder="Enter program description"
                placeholderTextColor={theme.text + "60"}
                value={formData.description}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={resetForm}
              >
                <ThemedText style={styles.cancelButtonText}>
                  Clear Form
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.submitButton]}
                onPress={handleAddProgram}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="save" size={18} color="#fff" />
                    <ThemedText style={styles.submitButtonText}>
                      Add Program
                    </ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      <FooterNav />

      {/* Custom Alert */}
      <CustomAlert
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        autoClose={true}
        onConfirm={handleAlertConfirm}
        onCancel={hideAlert}
      />
    </ThemedView>
  );
};

export default AddProgram;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: isWeb ? "8%" : 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    marginBottom: 32,
    alignItems: "center",
  },
  title: {
    fontSize: isWeb ? 32 : 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: isWeb ? 16 : 14,
    opacity: 0.7,
    textAlign: "center",
  },
  form: {
    gap: 20,
    paddingBottom: 20,
  },
  row: {
    flexDirection: "row",
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: Colors.uiBackground,
    minHeight: 48, // Consistent height for alignment
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: Colors.border + "40",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    opacity: 0.7,
  },
  submitButton: {
    backgroundColor: Colors.blueAccent,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomSpacer: {
    height: 40,
  },
});
