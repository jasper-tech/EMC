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
  const [expandedRole, setExpandedRole] = useState(null);

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

  const permissionCategories = [
    { key: "addEditMembers", label: "Add/Edit Members", icon: "people" },
    { key: "collectPayments", label: "Collect Payments", icon: "cash" },
    { key: "addDues", label: "Add Dues", icon: "receipt" },
    { key: "addContribution", label: "Add Contribution", icon: "add-circle" },
    { key: "addMisc", label: "Misc/Others", icon: "list" },
    { key: "addBudget", label: "Add Budget - Deposit", icon: "wallet" },
    { key: "makeWithdrawal", label: "Make Withdrawal", icon: "arrow-up" },
    { key: "addEvents", label: "Add Events", icon: "calendar" },
    {
      key: "addMinutesReports",
      label: "Add Minutes & Reports",
      icon: "document-text",
    },
  ];

  // Default permissions template for each role
  const getDefaultPermissions = () => {
    const defaultPermissions = {};
    roleOptions.forEach((role) => {
      defaultPermissions[role.value] = {};
      permissionCategories.forEach((perm) => {
        defaultPermissions[role.value][perm.key] = 0; // 0 = disabled, 1 = enabled
      });
    });
    return defaultPermissions;
  };

  const showAlert = (title, message, type = "info") => {
    setAlertType(type);
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
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

          // Check if data is old format (simple numbers) or new format (objects)
          const isOldFormat = Object.values(data).some(
            (val) => typeof val === "number"
          );

          if (isOldFormat) {
            // Migrate old format to new format
            const migratedData = getDefaultPermissions();

            // Convert old permissions to new structure
            Object.keys(data).forEach((roleKey) => {
              if (roleOptions.find((r) => r.value === roleKey)) {
                permissionCategories.forEach((perm) => {
                  if (perm.key === "addEditMembers") {
                    // Map old single permission to addEditMembers
                    migratedData[roleKey][perm.key] = data[roleKey];
                  } else {
                    migratedData[roleKey][perm.key] = 0; // Default to disabled for other permissions
                  }
                });
              }
            });

            setPermissions(migratedData);
            // Save migrated data back to Firestore
            await setDoc(permissionsRef, migratedData, { merge: true });
          } else {
            // Already new format, ensure all roles and permissions exist
            const loadedPermissions = { ...data };
            roleOptions.forEach((role) => {
              if (!loadedPermissions[role.value]) {
                loadedPermissions[role.value] = {};
              }
              permissionCategories.forEach((perm) => {
                if (loadedPermissions[role.value][perm.key] === undefined) {
                  loadedPermissions[role.value][perm.key] = 0;
                }
              });
            });
            setPermissions(loadedPermissions);
          }
        } else {
          // Create default permissions document
          const defaultPermissions = getDefaultPermissions();
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
          const defaultPermissions = getDefaultPermissions();
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

  const togglePermission = (roleValue, permissionKey) => {
    const currentValue = permissions[roleValue]?.[permissionKey] || 0;
    const newValue = currentValue === 1 ? 0 : 1;

    setPermissions((prev) => ({
      ...prev,
      [roleValue]: {
        ...prev[roleValue],
        [permissionKey]: newValue,
      },
    }));
    setHasUnsavedChanges(true);
  };

  const enableAllPermissionsForRole = (roleValue) => {
    const updatedPermissions = { ...permissions[roleValue] };
    Object.keys(updatedPermissions).forEach((key) => {
      updatedPermissions[key] = 1;
    });

    setPermissions((prev) => ({
      ...prev,
      [roleValue]: updatedPermissions,
    }));
    setHasUnsavedChanges(true);
  };

  const disableAllPermissionsForRole = (roleValue) => {
    const updatedPermissions = { ...permissions[roleValue] };
    Object.keys(updatedPermissions).forEach((key) => {
      updatedPermissions[key] = 0;
    });

    setPermissions((prev) => ({
      ...prev,
      [roleValue]: updatedPermissions,
    }));
    setHasUnsavedChanges(true);
  };

  const enableAllRoles = () => {
    const updatedPermissions = { ...permissions };
    roleOptions.forEach((role) => {
      if (updatedPermissions[role.value]) {
        Object.keys(updatedPermissions[role.value]).forEach((key) => {
          updatedPermissions[role.value][key] = 1;
        });
      }
    });
    setPermissions(updatedPermissions);
    setHasUnsavedChanges(true);
  };

  const disableAllRoles = () => {
    const updatedPermissions = { ...permissions };
    roleOptions.forEach((role) => {
      if (updatedPermissions[role.value]) {
        Object.keys(updatedPermissions[role.value]).forEach((key) => {
          updatedPermissions[role.value][key] = 0;
        });
      }
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
        { merge: true }
      );

      setHasUnsavedChanges(false);
      showAlert("Success", "Permissions saved successfully! ", "success");
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
    const message =
      "Are you sure you want to reset all permissions to disabled for all roles?";

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

  const getEnabledPermissionsCount = (roleValue) => {
    if (!permissions[roleValue]) return 0;
    return Object.values(permissions[roleValue]).filter((val) => val === 1)
      .length;
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
              {/* <ThemedText style={styles.headerTitle}>
                Role Permissions
              </ThemedText> */}
              <ThemedText style={styles.headerSubtitle}>
                Configure specific permissions
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
              <ThemedText style={styles.quickButtonText}>
                Enable All Roles
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickButton, styles.disableAllButton]}
              onPress={disableAllRoles}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={18} color="#fff" />
              <ThemedText style={styles.quickButtonText}>
                Disable All Roles
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickButton, styles.resetButton]}
              onPress={resetToDefault}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={18} color="#fff" />
              <ThemedText style={styles.quickButtonText}>Reset All</ThemedText>
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
            <ThemedText style={styles.legendTitle}>
              Permissions Legend
            </ThemedText>
          </View>
          <View style={styles.legendGrid}>
            <View style={styles.legendItem}>
              <View style={[styles.statusDot, styles.enabledDot]} />
              <ThemedText style={styles.legendItemText}>
                ON - Permission granted
              </ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.statusDot, styles.disabledDot]} />
              <ThemedText style={styles.legendItemText}>
                OFF - Permission denied
              </ThemedText>
            </View>
          </View>
        </View> */}

        {/* Roles List */}
        {roleOptions.map((role) => {
          const rolePerms = permissions[role.value] || {};
          const isExpanded = expandedRole === role.value;
          const enabledCount = getEnabledPermissionsCount(role.value);
          const totalCount = permissionCategories.length;

          return (
            <View
              key={role.value}
              style={[styles.roleCard, { backgroundColor: theme.card }]}
            >
              <TouchableOpacity
                style={styles.roleHeader}
                onPress={() => setExpandedRole(isExpanded ? null : role.value)}
                activeOpacity={0.7}
              >
                <View style={styles.roleHeaderContent}>
                  <View style={styles.roleInfo}>
                    <ThemedText style={styles.roleName}>
                      {role.label}
                    </ThemedText>
                    <ThemedText style={styles.roleStatus}>
                      {enabledCount}/{totalCount} permissions enabled
                    </ThemedText>
                  </View>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={theme.text}
                  />
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.permissionsContainer}>
                  {/* Role-specific quick actions */}
                  <View style={styles.permissionQuickActions}>
                    <TouchableOpacity
                      style={styles.permissionQuickButton}
                      onPress={() => enableAllPermissionsForRole(role.value)}
                    >
                      <ThemedText style={styles.permissionQuickButtonText}>
                        Enable All
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.permissionQuickButton}
                      onPress={() => disableAllPermissionsForRole(role.value)}
                    >
                      <ThemedText style={styles.permissionQuickButtonText}>
                        Disable All
                      </ThemedText>
                    </TouchableOpacity>
                  </View>

                  {/* Permission toggles */}
                  {permissionCategories.map((permission) => (
                    <View key={permission.key} style={styles.permissionRow}>
                      <View style={styles.permissionInfo}>
                        <Ionicons
                          name={permission.icon}
                          size={20}
                          color={
                            rolePerms[permission.key] === 1
                              ? Colors.greenAccent
                              : Colors.gray
                          }
                          style={{ marginRight: 10 }}
                        />
                        <ThemedText style={styles.permissionLabel}>
                          {permission.label}
                        </ThemedText>
                      </View>
                      <Switch
                        value={rolePerms[permission.key] === 1}
                        onValueChange={() =>
                          togglePermission(role.value, permission.key)
                        }
                        disabled={!isInitialized}
                        trackColor={{
                          false: Colors.border,
                          true: Colors.greenAccent,
                        }}
                        thumbColor={
                          rolePerms[permission.key] === 1 ? "#fff" : "#f4f3f4"
                        }
                        ios_backgroundColor={Colors.border}
                      />
                    </View>
                  ))}
                </View>
              )}
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
        message="Are you sure you want to reset all permissions to disabled for all roles?"
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
  roleHeader: {
    // Remove the marginBottom condition
  },
  roleHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  permissionsContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border + "20",
  },
  permissionQuickActions: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  permissionQuickButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: Colors.blueAccent + "20",
    alignItems: "center",
  },
  permissionQuickButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.blueAccent,
  },
  permissionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + "10",
  },
  permissionInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  permissionLabel: {
    fontSize: 14,
    flex: 1,
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
