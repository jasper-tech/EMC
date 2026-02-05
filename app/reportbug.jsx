// app/reportbug.jsx
import React, { useState } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import FooterNav from "../components/FooterNav";
import { Colors } from "../constants/Colors";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

const { width } = Dimensions.get("window");
const isWeb = Platform.OS === "web";

const ReportBug = () => {
  const { user } = useAuth();
  const [bugDescription, setBugDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitBug = async () => {
    if (!bugDescription.trim()) {
      Alert.alert("Error", "Please describe the bug");
      return;
    }

    if (!user) {
      Alert.alert("Error", "You must be logged in to report a bug");
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
      Alert.alert("Success", "Bug report submitted successfully!");
    } catch (error) {
      console.error("Error submitting bug report:", error);
      Alert.alert("Error", "Failed to submit bug report");
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
              style={styles.textInput}
              multiline
              numberOfLines={8}
              value={bugDescription}
              onChangeText={setBugDescription}
              textAlignVertical="top"
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
  },
  title: {
    fontSize: isWeb ? 32 : 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: isWeb ? 16 : 14,
    opacity: 0.7,
  },
  reportContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 24,
  },
  sectionTitle: {
    fontSize: isWeb ? 22 : 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: isWeb ? 16 : 14,
    opacity: 0.8,
    marginBottom: 20,
    lineHeight: 20,
  },
  textInput: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    padding: 16,
    fontSize: isWeb ? 16 : 14,
    color: Colors.text,
    marginBottom: 20,
    minHeight: 180,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  tipsContainer: {
    backgroundColor: "rgba(255, 193, 7, 0.1)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  tipsText: {
    fontSize: isWeb ? 14 : 13,
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 8,
    color: Colors.blueAccent,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  tipBullet: {
    fontSize: 14,
    marginRight: 8,
    color: Colors.blueAccent,
  },
  tipText: {
    fontSize: isWeb ? 14 : 12,
    flex: 1,
    opacity: 0.9,
  },
  submitButton: {
    backgroundColor: Colors.redAccent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.gray,
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: isWeb ? 16 : 14,
    fontWeight: "bold",
  },
  noteContainer: {
    flexDirection: "row",
    alignItems: "center",
    // backgroundColor: "rgba(33, 150, 243, 0.1)",
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  noteText: {
    fontSize: isWeb ? 14 : 12,
    flex: 1,
    opacity: 0.9,
    color: Colors.orangeAccent,
  },
  bottomSpacer: {
    height: 100,
  },
});

export default ReportBug;
