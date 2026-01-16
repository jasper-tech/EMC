import React from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import FooterNav from "../components/FooterNav";
import SidePanel from "../components/SidePanel";
import { Colors } from "../constants/Colors";

const { width } = Dimensions.get("window");
const isWeb = Platform.OS === "web";

const Disclaimer = () => {
  const [isSidePanelOpen, setIsSidePanelOpen] = React.useState(false);

  const disclaimerSections = [
    {
      title: "About This App",
      content:
        "This app was created by Sandy Afeawo under jasper-tech on GitHub and is to be used by Divine Victory Teshie EPSU for the management of their union.",
    },
    // {
    //   title: "Intellectual Property",
    //   content:
    //     "All rights reserved. The app, its source code, and all associated materials are protected by copyright laws.",
    // },
    // {
    //   title: "Disclaimer of Warranty",
    //   content:
    //     "This app is provided 'as-is' without any warranties of any kind, either expressed or implied. The developers do not guarantee that the app will be error-free or uninterrupted.",
    // },
    // {
    //   title: "Limitation of Liability",
    //   content:
    //     "The developers shall not be held liable for any direct, indirect, incidental, special, or consequential damages arising from the use or inability to use this app.",
    // },
    // {
    //   title: "Data Responsibility",
    //   content:
    //     "Users are responsible for their data entered into the app. The developers are not responsible for any data loss, corruption, or unauthorized access.",
    // },
    // {
    //   title: "Terms of Use",
    //   content:
    //     "By using this app, you agree to use it only for legitimate union management purposes and in compliance with all applicable laws and regulations.",
    // },
  ];

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
              App information and legal notices
            </ThemedText>
          </View>

          {/* Disclaimer Sections */}
          <View style={styles.sectionsContainer}>
            {disclaimerSections.map((section, index) => (
              <View key={index} style={styles.section}>
                <View style={styles.sectionHeader}>
                  {/* <View style={styles.sectionNumber}>
                    <ThemedText style={styles.sectionNumberText}>
                      {index + 1}
                    </ThemedText>
                  </View> */}
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

          {/* App Info */}
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <MaterialIcons name="code" size={20} color={Colors.text} />
              <ThemedText style={styles.infoText}>Version: 1.0.0</ThemedText>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons
                name="developer-mode"
                size={20}
                color={Colors.text}
              />
              <ThemedText style={styles.infoText}>
                Developer: Sandy Afeawo
              </ThemedText>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="copyright" size={20} color={Colors.text} />
              <ThemedText style={styles.infoText}>
                Copyright © {new Date().getFullYear()} Jasper-Tech
              </ThemedText>
            </View>
          </View>

          {/* Acceptance Note */}
          <View style={styles.acceptanceContainer}>
            <MaterialIcons
              name="check-circle"
              size={24}
              color={Colors.greenAccent}
            />
            <ThemedText style={styles.acceptanceText}>
              By continuing to use this app, you acknowledge that you have read
              and understand this disclaimer
            </ThemedText>
          </View>

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      {/* Footer with hamburger menu */}
      <FooterNav onMenuPress={() => setIsSidePanelOpen(true)} />

      {/* Side Panel */}
      <SidePanel
        isOpen={isSidePanelOpen}
        onClose={() => setIsSidePanelOpen(false)}
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
    textAlign: "center",
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
  sectionsContainer: {
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
    backgroundColor: Colors.purpleAccent,
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
  infoContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoText: {
    fontSize: isWeb ? 15 : 14,
    opacity: 0.9,
  },
  acceptanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderRadius: 12,
    padding: 20,
    gap: 12,
  },
  acceptanceText: {
    fontSize: isWeb ? 15 : 14,
    flex: 1,
    opacity: 0.9,
  },
  bottomSpacer: {
    height: 100,
  },
});

export default Disclaimer;
