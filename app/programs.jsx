import React, { useState, useContext, useEffect } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import FooterNav from "../components/FooterNav";
import { Colors } from "../constants/Colors";
import { ThemeContext } from "../context/ThemeContext";
import { checkPermission } from "../Utils/permissionsHelper";

const { width } = Dimensions.get("window");
const isWeb = Platform.OS === "web";

const Programs = () => {
  const router = useRouter();
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;

  const [canAddProgram, setCanAddProgram] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check user permissions on mount
  useEffect(() => {
    const checkUserPermissions = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setLoading(false);
          return;
        }

        // Get user document to retrieve role
        const userRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
          setLoading(false);
          return;
        }

        const userData = userDoc.data();
        const role = userData.role || "member";
        setUserRole(role);

        // Check if user is admin or has permission to add events
        const isAdmin = role?.toLowerCase() === "admin";
        const hasPermission = await checkPermission(role, "addEvents");

        setCanAddProgram(isAdmin || hasPermission);
      } catch (error) {
        console.error("Error checking user permissions:", error);
      } finally {
        setLoading(false);
      }
    };

    checkUserPermissions();
  }, []);

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

        {/* Loading State */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.blueAccent} />
            <ThemedText style={styles.loadingText}>
              Loading permissions...
            </ThemedText>
          </View>
        ) : (
          /* Program Tabs */
          <View style={styles.tabsContainer}>
            {/* Add Program Tab - Only visible with permission */}
            {canAddProgram && (
              <TouchableOpacity
                style={[styles.tabCard, { borderColor: theme.border }]}
                onPress={navigateToAddProgram}
                activeOpacity={0.7}
              >
                <View style={styles.iconContainer}>
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
            )}

            {/* View Programs Tab - Always visible */}
            <TouchableOpacity
              style={[styles.tabCard, { borderColor: theme.border }]}
              onPress={navigateToViewPrograms}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
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
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.6,
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
  infoCard: {
    backgroundColor: Colors.blueAccent + "10",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.blueAccent + "30",
  },
  infoText: {
    fontSize: 14,
    opacity: 0.8,
    textAlign: "center",
    lineHeight: 20,
  },
});
