// app/reportbug.jsx
import React, { useState, useContext } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import FooterNav from "../components/FooterNav";
import CustomAlert from "../components/CustomAlert";
import { Colors } from "../constants/Colors";
import { ThemeContext } from "../context/ThemeContext";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

const { width } = Dimensions.get("window");
const isWeb = Platform.OS === "web";

const ReportBug = () => {
  const { user } = useAuth();
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;

  const [bugDescription, setBugDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Alert states
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmitBug = async () => {
    if (!bugDescription.trim()) {
      setErrorMessage("Please describe the bug");
      setShowErrorAlert(true);
      return;
    }

    if (!user) {
      setErrorMessage("You must be logged in to report a bug");
      setShowErrorAlert(true);
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, "bugReports"), {
        userId: user.uid,
        userEmail: user.email || "Anonymous",
        description: bugDescription.trim(),
        timestamp: new Date(),
        status: "pending",
        resolved: false,
      });

      setBugDescription("");
      setShowSuccessAlert(true);
    } catch (error) {
      console.error("Error submitting bug report:", error);
      setErrorMessage("Failed to submit bug report");
      setShowErrorAlert(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.content}>
          {/* Bug Report Form */}
          <View style={styles.reportContainer}>
            <ThemedText style={styles.sectionTitle}>
              Describe the Issue
            </ThemedText>
            <ThemedText style={styles.sectionDescription}>
              Please be as detailed as possible. Include steps to reproduce,
              what you expected to happen, and what actually happened.
            </ThemedText>

            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor:
                    theme.inputBackground || "rgba(255, 255, 255, 0.08)",
                  borderColor: theme.inputBorder || "rgba(255, 255, 255, 0.1)",
                  color: theme.text,
                },
              ]}
              multiline
              numberOfLines={8}
              value={bugDescription}
              onChangeText={setBugDescription}
              textAlignVertical="top"
              placeholder="Describe the bug you encountered..."
              placeholderTextColor={
                scheme === "dark"
                  ? "rgba(255, 255, 255, 0.4)"
                  : "rgba(0, 0, 0, 0.4)"
              }
            />

            <View style={styles.tipsContainer}>
              <MaterialIcons
                name="lightbulb"
                size={20}
                color={Colors.blueAccent}
              />
              <ThemedText style={styles.tipsText}>
                Tips for better bug reports:
              </ThemedText>
              <View style={styles.tipItem}>
                <ThemedText style={styles.tipBullet}>•</ThemedText>
                <ThemedText style={styles.tipText}>
                  Include steps to reproduce
                </ThemedText>
              </View>
              <View style={styles.tipItem}>
                <ThemedText style={styles.tipBullet}>•</ThemedText>
                <ThemedText style={styles.tipText}>
                  Mention your device and OS version
                </ThemedText>
              </View>
              <View style={styles.tipItem}>
                <ThemedText style={styles.tipBullet}>•</ThemedText>
                <ThemedText style={styles.tipText}>
                  Be clear as to what you expected vs. what happened
                </ThemedText>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                submitting && styles.submitButtonDisabled,
                !bugDescription.trim() && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmitBug}
              disabled={submitting || !bugDescription.trim()}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <ThemedText style={styles.submitButtonText}>
                  Submit Bug Report
                </ThemedText>
              )}
            </TouchableOpacity>

            <View style={styles.noteContainer}>
              <MaterialIcons
                name="info"
                size={16}
                color={Colors.orangeAccent}
              />
              <ThemedText style={styles.noteText}>
                Bug reports are stored anonymously and help improve the app for
                everyone. You'll be notified when the issue is resolved.
              </ThemedText>
            </View>
          </View>

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      <FooterNav />

      {/* Success Alert */}
      <CustomAlert
        visible={showSuccessAlert}
        type="success"
        title="Success!"
        message="Bug report submitted successfully!"
        autoClose={true}
        onConfirm={() => setShowSuccessAlert(false)}
      />

      {/* Error Alert */}
      <CustomAlert
        visible={showErrorAlert}
        type="failed"
        title="Error"
        message={errorMessage}
        confirmText="OK"
        onConfirm={() => setShowErrorAlert(false)}
      />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: isWeb ? Math.max(width * 0.08, 40) : 16,
    paddingTop: isWeb ? 32 : 20,
    paddingBottom: 40,
    maxWidth: isWeb ? 1000 : "100%",
    alignSelf: "center",
    width: "100%",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: isWeb ? 28 : 20,
    gap: 8,
  },
  backButtonText: {
    fontSize: isWeb ? 18 : 16,
    fontWeight: "600",
  },
  header: {
    marginBottom: isWeb ? 36 : 28,
  },
  title: {
    fontSize: isWeb ? 32 : 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: isWeb ? 16 : 14,
    opacity: 0.7,
  },
  reportContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: isWeb ? 20 : 16,
    padding: isWeb ? 28 : 20,
  },
  sectionTitle: {
    fontSize: isWeb ? 24 : 20,
    fontWeight: "bold",
    marginBottom: isWeb ? 10 : 8,
  },
  sectionDescription: {
    fontSize: isWeb ? 16 : 14,
    opacity: 0.8,
    marginBottom: isWeb ? 24 : 20,
    lineHeight: isWeb ? 24 : 20,
  },
  textInput: {
    borderRadius: isWeb ? 14 : 12,
    padding: isWeb ? 18 : 16,
    fontSize: isWeb ? 16 : 14,
    marginBottom: isWeb ? 24 : 20,
    minHeight: isWeb ? 200 : 180,
    borderWidth: 1,
    lineHeight: isWeb ? 24 : 20,
  },
  tipsContainer: {
    backgroundColor: "rgba(255, 193, 7, 0.1)",
    borderRadius: isWeb ? 14 : 12,
    padding: isWeb ? 18 : 16,
    marginBottom: isWeb ? 24 : 20,
  },
  tipsText: {
    fontSize: isWeb ? 15 : 13,
    fontWeight: "600",
    marginTop: 8,
    marginBottom: isWeb ? 10 : 8,
    color: Colors.blueAccent,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: isWeb ? 6 : 4,
  },
  tipBullet: {
    fontSize: isWeb ? 16 : 14,
    marginRight: 8,
    color: Colors.blueAccent,
  },
  tipText: {
    fontSize: isWeb ? 15 : 12,
    flex: 1,
    opacity: 0.9,
  },
  submitButton: {
    backgroundColor: Colors.redAccent,
    borderRadius: isWeb ? 14 : 12,
    paddingVertical: isWeb ? 18 : 16,
    alignItems: "center",
    marginBottom: isWeb ? 18 : 16,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.gray,
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: isWeb ? 17 : 14,
    fontWeight: "bold",
  },
  noteContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: isWeb ? 14 : 12,
    borderRadius: isWeb ? 10 : 8,
    gap: 8,
  },
  noteText: {
    fontSize: isWeb ? 14 : 12,
    flex: 1,
    opacity: 0.9,
    color: Colors.orangeAccent,
  },
  bottomSpacer: {
    height: isWeb ? 120 : 100,
  },
});

export default ReportBug;
