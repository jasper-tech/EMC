import {
  StyleSheet,
  View,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import React, { useState, useEffect, useContext } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";
import { ThemeContext } from "../context/ThemeContext";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import CustomAlert from "../components/CustomAlert";
import ConfirmationModal from "../components/ConfirmationModal";

const Maintenance = () => {
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [permissions, setPermissions] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Alert states
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState("success");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);

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
    { label: "ALL ROLES", value: "all" }, // Special option for all roles
  ];

  const showAlert = (title, message, type = "info") => {
    setAlertType(type);
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  // Initialize default permissions
  const initializeDefaultPermissions = () => {
    const defaultPermissions = {};
    roleOptions.forEach((role) => {
      defaultPermissions[role.value] = 0; // 0 = disabled, 1 = enabled
    });
    return defaultPermissions;
  };

  // Check if current user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const userRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setIsAdmin(userData.role === "admin");

            if (userData.role !== "admin") {
              showAlert(
                "Access Denied",
                "Only administrators can access maintenance settings.",
                "danger"
              );
            }
          } else {
            setIsAdmin(false);
            showAlert(
              "Access Denied",
              "User profile not found. Please contact support.",
              "danger"
            );
          }
        } else {
          setIsAdmin(false);
          showAlert(
            "Access Denied",
            "You must be logged in to access this page.",
            "danger"
          );
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
        showAlert(
          "Error",
          "Failed to verify admin status. Please try again.",
          "failed"
        );
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  // Load existing permissions or create default ones
  useEffect(() => {
    const loadOrCreatePermissions = async () => {
      if (!isAdmin) return;

      try {
        const permissionsRef = doc(db, "settings", "rolePermissions");
        const permissionsDoc = await getDoc(permissionsRef);

        if (permissionsDoc.exists()) {
          const data = permissionsDoc.data();
          // Ensure all roles are present in the loaded data
          const loadedPermissions = { ...data };
          roleOptions.forEach((role) => {
            if (loadedPermissions[role.value] === undefined) {
              loadedPermissions[role.value] = 0;
            }
          });
          setPermissions(loadedPermissions);
        } else {
          // Create default permissions document
          const defaultPermissions = initializeDefaultPermissions();
          try {
            await setDoc(permissionsRef, {
              ...defaultPermissions,
              created: new Date().toISOString(),
              createdBy: auth.currentUser?.uid || "system",
            });
            setPermissions(defaultPermissions);
          } catch (createError) {
            console.error("Error creating permissions document:", createError);
            // If we can't create, use local defaults
            setPermissions(defaultPermissions);
            showAlert(
              "Warning",
              "Could not save default permissions to database. Using local defaults.",
              "warning"
            );
          }
        }
        setIsInitialized(true);
      } catch (error) {
        console.error("Error loading permissions:", error);

        // Check if it's a permission denied error
        if (error.code === "permission-denied") {
          showAlert(
            "Permission Error",
            "You don't have permission to access settings. Please contact the administrator.",
            "danger"
          );
        } else {
          // Use local defaults if we can't access the database
          const defaultPermissions = initializeDefaultPermissions();
          setPermissions(defaultPermissions);
          setIsInitialized(true);
          showAlert(
            "Warning",
            "Could not load permissions from database. Using local defaults.",
            "warning"
          );
        }
      }
    };

    loadOrCreatePermissions();
  }, [isAdmin]);

  const toggleRole = (roleValue) => {
    const currentValue = permissions[roleValue] || 0;
    const newValue = currentValue === 1 ? 0 : 1;

    setPermissions((prev) => ({
      ...prev,
      [roleValue]: newValue,
    }));
    setHasUnsavedChanges(true);
  };

  const enableAllRoles = () => {
    const updatedPermissions = {};
    roleOptions.forEach((role) => {
      updatedPermissions[role.value] = 1;
    });
    setPermissions(updatedPermissions);
    setHasUnsavedChanges(true);
  };

  const disableAllRoles = () => {
    const updatedPermissions = {};
    roleOptions.forEach((role) => {
      updatedPermissions[role.value] = 0;
    });
    setPermissions(updatedPermissions);
    setHasUnsavedChanges(true);
  };

  const savePermissions = async () => {
    if (!isAdmin) {
      showAlert(
        "Access Denied",
        "Only administrators can save permission changes.",
        "danger"
      );
      return;
    }

    setSaving(true);
    try {
      const permissionsRef = doc(db, "settings", "rolePermissions");
      await setDoc(
        permissionsRef,
        {
          ...permissions,
          lastUpdated: new Date().toISOString(),
          updatedBy: auth.currentUser.uid,
        },
        { merge: true } // Changed from merge: false to merge: true
      );

      setHasUnsavedChanges(false);
      showAlert(
        "Success",
        "Permissions saved successfully! Changes will take effect immediately.",
        "success"
      );
    } catch (error) {
      console.error("Error saving permissions:", error);
      let errorMessage = "Failed to save permissions. ";

      if (error.code === "permission-denied") {
        errorMessage += "You don't have permission to save settings.";
      } else if (error.code === "unavailable") {
        errorMessage += "Network error. Please check your connection.";
      } else {
        errorMessage += "Please try again.";
      }

      showAlert("Error", errorMessage, "failed");
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = () => {
    if (Platform.OS === "web") {
      setShowResetConfirm(true);
    } else {
      Alert.alert("Reset Permissions", message, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => disableAllRoles(),
        },
      ]);
      return;
    }
  };

  // Handle reset confirmation
  const handleResetConfirm = () => {
    disableAllRoles();
    setShowResetConfirm(false);
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.blueAccent} />
        <ThemedText style={styles.loadingText}>
          Loading maintenance settings...
        </ThemedText>
      </ThemedView>
    );
  }

  if (!isAdmin) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.accessDeniedContainer}>
          <Ionicons
            name="lock-closed"
            size={64}
            color={Colors.redAccent}
            style={{ opacity: 0.5 }}
          />
          <ThemedText style={styles.accessDeniedTitle}>
            Access Denied
          </ThemedText>
          <ThemedText style={styles.accessDeniedText}>
            Only administrators can access maintenance settings.
          </ThemedText>
        </View>
        <CustomAlert
          visible={alertVisible}
          type={alertType}
          title={alertTitle}
          message={alertMessage}
          autoClose={true}
          onConfirm={() => setAlertVisible(false)}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerTextContainer}>
              <ThemedText style={styles.headerSubtitle}>
                Toggle ON to allow access to Add/Edit buttons
              </ThemedText>
              {!isInitialized && (
                <ThemedText style={styles.initializingText}>
                  Initializing permissions...
                </ThemedText>
              )}
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickButton, styles.enableAllButton]}
              onPress={enableAllRoles}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <ThemedText style={styles.quickButtonText}>Enable All</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickButton, styles.disableAllButton]}
              onPress={disableAllRoles}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={18} color="#fff" />
              <ThemedText style={styles.quickButtonText}>
                Disable All
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickButton, styles.resetButton]}
              onPress={resetToDefault} // This should call resetToDefault
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={18} color="#fff" />
              <ThemedText style={styles.quickButtonText}>Reset</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                !hasUnsavedChanges && styles.saveButtonDisabled,
              ]}
              onPress={savePermissions}
              disabled={!hasUnsavedChanges || saving || !isInitialized}
              activeOpacity={0.7}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="save" size={18} color="#fff" />
                  <ThemedText style={styles.saveButtonText}>
                    {!isInitialized
                      ? "Initializing..."
                      : hasUnsavedChanges
                      ? "Save Changes"
                      : "No Changes"}
                  </ThemedText>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Legend */}
        {/* <View style={[styles.legendCard, { backgroundColor: theme.card }]}>
          <View style={styles.legendHeader}>
            <Ionicons
              name="information-circle"
              size={20}
              color={Colors.blueAccent}
            />
            <ThemedText style={styles.legendTitle}>Status Legend</ThemedText>
          </View>
          <View style={styles.legendGrid}>
            <View style={styles.legendItem}>
              <View style={[styles.statusDot, styles.enabledDot]} />
              <ThemedText style={styles.legendItemText}>
                ON - Can access Add/Edit buttons
              </ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.statusDot, styles.disabledDot]} />
              <ThemedText style={styles.legendItemText}>
                OFF - Cannot access Add/Edit buttons
              </ThemedText>
            </View>
          </View>
        </View> */}

        {/* Roles List */}
        {roleOptions.map((role, index) => {
          const isEnabled = permissions[role.value] === 1;

          return (
            <View
              key={role.value}
              style={[styles.roleCard, { backgroundColor: theme.card }]}
            >
              <View style={styles.roleContent}>
                <View style={styles.roleInfo}>
                  <ThemedText style={styles.roleName}>{role.label}</ThemedText>
                  <ThemedText style={styles.roleStatus}>
                    {!isInitialized
                      ? "Loading..."
                      : isEnabled
                      ? "Access Granted"
                      : "Access Denied"}
                  </ThemedText>
                </View>

                <Switch
                  value={isEnabled}
                  onValueChange={() => toggleRole(role.value)}
                  disabled={!isInitialized}
                  trackColor={{
                    false: Colors.border,
                    true: Colors.greenAccent,
                  }}
                  thumbColor={isEnabled ? "#fff" : "#f4f3f4"}
                  ios_backgroundColor={Colors.border}
                />
              </View>

              {/* Visual indicator */}
              <View
                style={[
                  styles.statusIndicator,
                  !isInitialized
                    ? { backgroundColor: Colors.border }
                    : isEnabled
                    ? { backgroundColor: Colors.greenAccent + "20" }
                    : { backgroundColor: Colors.redAccent + "20" },
                ]}
              >
                <Ionicons
                  name={
                    !isInitialized
                      ? "time-outline"
                      : isEnabled
                      ? "checkmark-circle"
                      : "close-circle"
                  }
                  size={16}
                  color={
                    !isInitialized
                      ? Colors.border
                      : isEnabled
                      ? Colors.greenAccent
                      : Colors.redAccent
                  }
                />
                <ThemedText
                  style={[
                    styles.statusText,
                    !isInitialized
                      ? { color: Colors.border }
                      : isEnabled
                      ? { color: Colors.greenAccent }
                      : { color: Colors.redAccent },
                  ]}
                >
                  {!isInitialized
                    ? "LOADING"
                    : isEnabled
                    ? "ENABLED"
                    : "DISABLED"}
                </ThemedText>
              </View>
            </View>
          );
        })}

        {/* Unsaved Changes Warning */}
        {hasUnsavedChanges && (
          <View
            style={[
              styles.warningCard,
              { backgroundColor: Colors.goldAccent + "20" },
            ]}
          >
            <Ionicons name="warning" size={20} color={Colors.goldAccent} />
            <ThemedText style={styles.warningText}>
              You have unsaved changes. Don't forget to save!
            </ThemedText>
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>

      <CustomAlert
        visible={alertVisible}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        autoClose={alertType === "success"}
        onConfirm={() => setAlertVisible(false)}
      />
      <ConfirmationModal
        visible={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetConfirm}
        type="danger"
        title="Reset Permissions"
        message="Are you sure you want to reset all roles to disabled?"
        confirmText="Reset"
        cancelText="Cancel"
      />
    </ThemedView>
  );
};

export default Maintenance;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.6,
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 16,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 16,
  },
  accessDeniedText: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
    lineHeight: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.6,
  },
  initializingText: {
    fontSize: 12,
    color: Colors.blueAccent,
    fontStyle: "italic",
    marginTop: 4,
  },
  quickActions: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  quickButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  enableAllButton: {
    backgroundColor: Colors.greenAccent,
  },
  disableAllButton: {
    backgroundColor: Colors.redAccent,
  },
  resetButton: {
    backgroundColor: Colors.blueAccent,
  },
  quickButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  actionButtons: {
    flexDirection: "row",
  },
  saveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.greenAccent,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.border,
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  legendCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  legendHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  legendGrid: {
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  enabledDot: {
    backgroundColor: Colors.greenAccent,
  },
  disabledDot: {
    backgroundColor: Colors.redAccent,
  },
  legendItemText: {
    fontSize: 13,
    opacity: 0.8,
  },
  roleCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  roleContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  roleStatus: {
    fontSize: 12,
    opacity: 0.6,
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.goldAccent + "30",
    marginTop: 16,
  },
  warningText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.goldAccent,
    flex: 1,
  },
});
