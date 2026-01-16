import React, { useState, useContext } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Dimensions,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import FooterNav from "../components/FooterNav";
import { Colors } from "../constants/Colors";
import { ThemeContext } from "../context/ThemeContext";

const { width } = Dimensions.get("window");
const isWeb = Platform.OS === "web";

const Programs = () => {
  const router = useRouter();
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;

  const handleBack = () => {
    router.back();
  };

  const navigateToAddProgram = () => {
    router.push("/addprogram");
  };

  const navigateToViewPrograms = () => {
    router.push("/viewprograms");
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={styles.subtitle}>
            Manage union programs and events
          </ThemedText>
        </View>

        {/* Program Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabCard, { borderColor: theme.border }]}
            onPress={navigateToAddProgram}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconContainer,
                // { backgroundColor: Colors.greenAccent + "20" },
              ]}
            >
              <MaterialIcons
                name="add-circle"
                size={48}
                color={Colors.greenAccent}
              />
            </View>
            <ThemedText style={styles.tabTitle}>Add Program</ThemedText>
            <ThemedText style={styles.tabDescription}>
              Create and schedule new programs
            </ThemedText>
            <MaterialIcons
              name="arrow-forward"
              size={24}
              color={theme.text}
              style={{ opacity: 0.5, marginTop: 8 }}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabCard, { borderColor: theme.border }]}
            onPress={navigateToViewPrograms}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconContainer,
                // { backgroundColor: Colors.blueAccent + "20" },
              ]}
            >
              <MaterialIcons
                name="list-alt"
                size={48}
                color={Colors.blueAccent}
              />
            </View>
            <ThemedText style={styles.tabTitle}>View Programs</ThemedText>
            <ThemedText style={styles.tabDescription}>
              See all scheduled programs
            </ThemedText>
            <MaterialIcons
              name="arrow-forward"
              size={24}
              color={theme.text}
              style={{ opacity: 0.5, marginTop: 8 }}
            />
          </TouchableOpacity>
        </View>
      </View>
      <FooterNav />
    </ThemedView>
  );
};

export default Programs;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: isWeb ? "8%" : 20,
    paddingTop: 24,
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
    marginBottom: 40,
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
  tabsContainer: {
    gap: 20,
  },
  tabCard: {
    backgroundColor: Colors.uiBackground,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  tabTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  tabDescription: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: "center",
  },
});
