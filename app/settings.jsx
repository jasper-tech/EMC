// app/settings.jsx
import React, { useState } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import FooterNav from "../components/FooterNav";
import { Colors } from "../constants/Colors";

const { width } = Dimensions.get("window");
const isWeb = Platform.OS === "web";

const Settings = () => {
  const tabs = [
    {
      id: "report",
      title: "Report a Bug",
      icon: "bug-report",
      description: "Report any issues or problems you encounter",
      screen: "/reportbug",
    },
    {
      id: "issues",
      title: "View Reported Issues",
      icon: "list-alt",
      description: "View bugs reported by users",
      screen: "/viewissues",
    },
    {
      id: "about",
      title: "About & Disclaimer",
      icon: "info",
      description: "App information and copyright",
    },
  ];

  const handleTabPress = (tab) => {
    if (tab.screen) {
      router.push(tab.screen);
    } else if (tab.id === "about") {
      Alert.alert(
        "About & Disclaimer",
        "This app was created by Sandy Afeawo under jasper-tech on GitHub and is to be used by Divine Victory Teshie EPSU for the management of their union.\n\nAll rights reserved.\n\nVersion: 1.0.0\n\nDisclaimer: This app is provided as-is without any warranties. The developers are not responsible for any data loss or issues arising from app usage."
      );
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}></View>

        {/* Vertical Tabs Container */}
        <View style={styles.tabsContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabCard]}
              onPress={() => handleTabPress(tab)}
              activeOpacity={0.8}
            >
              <View style={styles.tabContent}>
                <View style={styles.tabLeft}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: tab.color + "20" },
                    ]}
                  >
                    <MaterialIcons
                      name={tab.icon}
                      size={24}
                      color={tab.color}
                    />
                  </View>
                  <View style={styles.tabTextContainer}>
                    <ThemedText style={styles.tabTitle}>{tab.title}</ThemedText>
                    <ThemedText style={styles.tabDescription}>
                      {tab.description}
                    </ThemedText>
                  </View>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={24}
                  color={Colors.text}
                  style={styles.tabArrow}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Copyright Section */}
        <View style={styles.copyrightWrapper}>
          <View style={styles.copyrightContainer}>
            <View style={styles.copyrightHeader}>
              <MaterialIcons name="copyright" size={16} color={Colors.text} />
              <ThemedText style={styles.copyrightText}>
                {new Date().getFullYear()} Jasper-Tech
              </ThemedText>
            </View>

            <View style={styles.versionContainer}>
              <MaterialIcons
                name="code"
                size={12}
                color={Colors.gray}
                style={styles.versionIcon}
              />
              <ThemedText style={styles.versionText}>Version 1.0.0</ThemedText>
            </View>
            <View style={styles.divider} />
            <View style={styles.developerInfo}>
              <MaterialIcons
                name="developer-mode"
                size={14}
                color={Colors.blueAccent}
              />
              <ThemedText style={styles.developerText}>
                Developed by Sandy Afeawo
              </ThemedText>
            </View>
          </View>
        </View>
      </View>

      <FooterNav />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: isWeb ? "8%" : 20,
    paddingTop: 24,
  },
  header: {
    marginBottom: 32,
    alignItems: "center",
  },
  title: {
    fontSize: isWeb ? 32 : 28,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: isWeb ? 16 : 14,
    opacity: 0.7,
    textAlign: "center",
  },
  tabsContainer: {
    flex: 1,
    marginBottom: 24,
  },
  tabCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tabLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  tabTextContainer: {
    flex: 1,
  },
  tabTitle: {
    fontSize: isWeb ? 18 : 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  tabDescription: {
    fontSize: isWeb ? 14 : 12,
    opacity: 0.7,
    lineHeight: 18,
  },
  tabArrow: {
    opacity: 0.6,
  },
  copyrightWrapper: {
    marginTop: "auto",
    paddingBottom: 20,
  },
  copyrightContainer: {
    padding: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  copyrightHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 6,
  },
  copyrightText: {
    fontSize: isWeb ? 15 : 13,
    fontWeight: "bold",
    opacity: 0.9,
  },
  disclaimerText: {
    fontSize: isWeb ? 13 : 11,
    textAlign: "center",
    opacity: 0.7,
    lineHeight: 16,
    marginBottom: 12,
  },
  versionContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  versionIcon: {
    opacity: 0.7,
  },
  versionText: {
    fontSize: isWeb ? 12 : 10,
    opacity: 0.7,
  },
  divider: {
    height: 1,
    width: "80%",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginVertical: 8,
  },
  developerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  developerText: {
    fontSize: isWeb ? 12 : 10,
    opacity: 0.6,
  },
});

export default Settings;
