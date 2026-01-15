// app/tandc.jsx
import React from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import FooterNav from "../components/FooterNav";
import { Colors } from "../constants/Colors";

const { width } = Dimensions.get("window");
const isWeb = Platform.OS === "web";

const TermsAndConditions = () => {
  const sections = [
    {
      title: "Acceptance of Terms",
      content:
        "By accessing and using this app, you accept and agree to be bound by these Terms & Conditions. If you do not agree, please do not use the app.",
    },
    {
      title: "User Responsibilities",
      content:
        "You agree to:\n1. Use the app only for legitimate union management purposes\n2. Maintain the confidentiality of your login credentials\n3. Report any security concerns immediately\n4. Respect the privacy of other union members\n5. Not engage in any illegal activities using the app",
    },
    {
      title: "Data Privacy",
      content:
        "We collect and store only necessary data for app functionality. Your data is protected with industry-standard security measures. We do not sell or share your personal information with third parties.",
    },
    {
      title: "Prohibited Activities",
      content:
        "You may not:\n• Share your account with others\n• Attempt to hack or exploit the app\n• Upload malicious content\n• Use the app for commercial purposes without permission\n• Violate any applicable laws",
    },
    {
      title: "Account Suspension",
      content:
        "We reserve the right to suspend or terminate accounts that violate these terms. Suspended users will lose access to all app features.",
    },
    {
      title: "Disclaimer of Warranty",
      content:
        "This app is provided 'as-is' without any warranties. We do not guarantee uninterrupted or error-free operation. The developers are not liable for any data loss or issues arising from app usage.",
    },
    {
      title: "Limitation of Liability",
      content:
        "To the maximum extent permitted by law, the developers shall not be liable for any indirect, incidental, special, or consequential damages arising from the use of this app.",
    },
    {
      title: "Modification of Terms",
      content:
        "We reserve the right to modify these terms at any time. Continued use of the app after changes constitutes acceptance of the new terms.",
    },
    {
      title: "Governing Law",
      content:
        "These terms are governed by the laws of Ghana. Any disputes shall be resolved in the appropriate courts of Ghana.",
    },
    {
      title: "Contact Information",
      content:
        "For questions about these terms, contact the union administration or the app developer at the provided contact channels.",
    },
  ];

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.text} />
            <ThemedText style={styles.backButtonText}>
              Back to Settings
            </ThemedText>
          </TouchableOpacity>

          <View style={styles.header}>
            <MaterialIcons name="gavel" size={48} color={Colors.greenAccent} />
            <ThemedText style={styles.title}>Terms & Conditions</ThemedText>
            <ThemedText style={styles.subtitle}>
              Last updated: {new Date().toLocaleDateString()}
            </ThemedText>
          </View>

          <View style={styles.noticeContainer}>
            <MaterialIcons
              name="warning"
              size={24}
              color={Colors.yellowAccent}
            />
            <ThemedText style={styles.noticeText}>
              Please read these terms carefully before using the app.
            </ThemedText>
          </View>

          <View style={styles.termsContainer}>
            {sections.map((section, index) => (
              <View key={index} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionNumber}>
                    <ThemedText style={styles.sectionNumberText}>
                      {index + 1}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.sectionTitle}>
                    {section.title}
                  </ThemedText>
                </View>
                <ThemedText style={styles.sectionContent}>
                  {section.content}
                </ThemedText>
              </View>
            ))}
          </View>

          <View style={styles.acknowledgmentContainer}>
            <ThemedText style={styles.acknowledgmentTitle}>
              Acknowledgment
            </ThemedText>
            <ThemedText style={styles.acknowledgmentText}>
              By using this app, you acknowledge that you have read, understood,
              and agree to be bound by these Terms & Conditions.
            </ThemedText>
          </View>

          <View style={styles.copyrightContainer}>
            <ThemedText style={styles.copyrightText}>
              © {new Date().getFullYear()} Jasper-Tech
            </ThemedText>
            <ThemedText style={styles.disclaimerText}>
              This app is developed for Divine Victory Teshie EPSU
            </ThemedText>
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
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: isWeb ? 32 : 28,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: isWeb ? 16 : 14,
    opacity: 0.7,
  },
  noticeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 193, 7, 0.1)",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  noticeText: {
    fontSize: isWeb ? 16 : 14,
    flex: 1,
    fontWeight: "500",
  },
  termsContainer: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  sectionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.greenAccent,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionNumberText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: isWeb ? 18 : 16,
    fontWeight: "bold",
    flex: 1,
  },
  sectionContent: {
    fontSize: isWeb ? 15 : 14,
    lineHeight: 22,
    opacity: 0.9,
  },
  acknowledgmentContainer: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
    alignItems: "center",
  },
  acknowledgmentTitle: {
    fontSize: isWeb ? 20 : 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: Colors.greenAccent,
  },
  acknowledgmentText: {
    fontSize: isWeb ? 16 : 14,
    textAlign: "center",
    lineHeight: 22,
  },
  copyrightContainer: {
    padding: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    alignItems: "center",
  },
  copyrightText: {
    fontSize: isWeb ? 16 : 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: isWeb ? 14 : 12,
    opacity: 0.8,
    textAlign: "center",
  },
  bottomSpacer: {
    height: 100,
  },
});

export default TermsAndConditions;
