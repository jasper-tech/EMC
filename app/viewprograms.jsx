import React, { useState, useEffect, useContext, useMemo } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import FooterNav from "../components/FooterNav";
import { CustomAlert } from "../components/CustomAlert";
import { Colors } from "../constants/Colors";
import { ThemeContext } from "../context/ThemeContext";
import {
  collection,
  query,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { checkPermission } from "../Utils/permissionsHelper";

const { width } = Dimensions.get("window");
const isWeb = Platform.OS === "web";

// Platform-specific Date Input Component for editing
const DateInputEdit = ({ value, onChange, theme, isWeb }) => {
  if (isWeb) {
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
          padding: "8px 12px",
          fontSize: 14,
          backgroundColor: Colors.uiBackground,
          color: theme.text,
          width: "100%",
          fontFamily: "inherit",
          boxSizing: "border-box",
        }}
      />
    );
  }

  return (
    <TextInput
      style={[
        styles.editInput,
        { color: theme.text, borderColor: theme.border },
      ]}
      placeholder="YYYY-MM-DD"
      placeholderTextColor={theme.text + "60"}
      value={value}
      onChangeText={onChange}
    />
  );
};

// Platform-specific Time Input Component for editing
const TimeInputEdit = ({ value, onChange, theme, isWeb }) => {
  if (isWeb) {
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
          padding: "8px 12px",
          fontSize: 14,
          backgroundColor: Colors.uiBackground,
          color: theme.text,
          width: "100%",
          fontFamily: "inherit",
          boxSizing: "border-box",
        }}
      />
    );
  }

  return (
    <TextInput
      style={[
        styles.editInput,
        { color: theme.text, borderColor: theme.border },
      ]}
      placeholder="e.g., 2:00 PM"
      placeholderTextColor={theme.text + "60"}
      value={value}
      onChangeText={onChange}
    />
  );
};

const ViewPrograms = () => {
  const router = useRouter();
  const [programs, setPrograms] = useState([]);
  const [filteredPrograms, setFilteredPrograms] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;
  const [showActionsFor, setShowActionsFor] = useState(null);
  const [editingProgramId, setEditingProgramId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Permission states
  const [canManagePrograms, setCanManagePrograms] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loadingPermissions, setLoadingPermissions] = useState(true);

  // Alert state
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: "success",
    title: "",
    message: "",
  });

  const [deleteConfirmation, setDeleteConfirmation] = useState({
    visible: false,
    programId: null,
    programTitle: "",
  });

  // Check user permissions on mount
  useEffect(() => {
    const checkUserPermissions = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setLoadingPermissions(false);
          return;
        }

        // Get user document to retrieve role
        const userRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
          setLoadingPermissions(false);
          return;
        }

        const userData = userDoc.data();
        const role = userData.role || "member";
        setUserRole(role);

        // Check if user is admin or has permission to add events
        const isAdmin = role?.toLowerCase() === "admin";
        const hasPermission = await checkPermission(role, "addEvents");

        setCanManagePrograms(isAdmin || hasPermission);
      } catch (error) {
        console.error("Error checking user permissions:", error);
      } finally {
        setLoadingPermissions(false);
      }
    };

    checkUserPermissions();
  }, []);

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

  useEffect(() => {
    const programsRef = collection(db, "programs");
    const q = query(programsRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const programsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        // Sort by date (newest first)
        const sortedPrograms = programsList.sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );
        setPrograms(sortedPrograms);
        setFilteredPrograms(sortedPrograms);
        setLoadingPrograms(false);
      },
      (error) => {
        console.error("Error fetching programs:", error);
        setLoadingPrograms(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filter programs based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredPrograms(programs);
    } else {
      const filtered = programs.filter((program) => {
        const searchLower = searchQuery.toLowerCase();
        return (
          program.title?.toLowerCase().includes(searchLower) ||
          program.location?.toLowerCase().includes(searchLower) ||
          program.organizer?.toLowerCase().includes(searchLower) ||
          program.description?.toLowerCase().includes(searchLower) ||
          program.date?.includes(searchQuery) ||
          program.time?.toLowerCase().includes(searchLower)
        );
      });
      setFilteredPrograms(filtered);
    }
  }, [searchQuery, programs]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  const handleEditClick = (program) => {
    if (!canManagePrograms) {
      showAlert(
        "failed",
        "Access Denied",
        "You don't have permission to edit programs. Please contact an administrator."
      );
      return;
    }

    setEditingProgramId(program.id);
    setEditFormData({
      title: program.title || "",
      date: program.date || "",
      time: program.time || "",
      location: program.location || "",
      organizer: program.organizer || "",
      description: program.description || "",
    });
    setShowActionsFor(null); // Close actions menu
  };

  const handleSaveEdit = async (programId) => {
    // Validation
    if (!editFormData.title.trim()) {
      showAlert("failed", "Validation Error", "Please enter program title");
      return;
    }

    if (!editFormData.date.trim()) {
      showAlert("failed", "Validation Error", "Please enter program date");
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(editFormData.date)) {
      showAlert(
        "failed",
        "Invalid Date Format",
        "Please enter date in YYYY-MM-DD format"
      );
      return;
    }

    try {
      setSavingEdit(true);
      const programRef = doc(db, "programs", programId);

      await updateDoc(programRef, {
        ...editFormData,
        updatedAt: new Date(),
      });

      // Update local state
      setPrograms(
        programs.map((program) =>
          program.id === programId ? { ...program, ...editFormData } : program
        )
      );

      setEditingProgramId(null);
      setEditFormData({});
      showAlert("success", "Success!", "Program has been updated successfully");
    } catch (error) {
      console.error("Error updating program:", error);
      showAlert(
        "failed",
        "Error",
        "Failed to update program. Please try again."
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingProgramId(null);
    setEditFormData({});
  };

  const handleDeleteRequest = (programId, programTitle) => {
    if (!canManagePrograms) {
      showAlert(
        "failed",
        "Access Denied",
        "You don't have permission to delete programs. Please contact an administrator."
      );
      return;
    }

    setDeleteConfirmation({
      visible: true,
      programId,
      programTitle,
    });
    setShowActionsFor(null); // Close actions menu
  };

  const handleDeleteConfirm = async () => {
    try {
      const { programId } = deleteConfirmation;
      await deleteDoc(doc(db, "programs", programId));

      // Remove from local state
      setPrograms(programs.filter((program) => program.id !== programId));

      // Hide confirmation dialog
      setDeleteConfirmation({
        visible: false,
        programId: null,
        programTitle: "",
      });

      showAlert("success", "Success!", "Program deleted successfully");
    } catch (error) {
      console.error("Error deleting program:", error);
      showAlert(
        "failed",
        "Error",
        "Failed to delete program. Please try again."
      );
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmation({
      visible: false,
      programId: null,
      programTitle: "",
    });
  };

  const toggleActions = (programId) => {
    setShowActionsFor(showActionsFor === programId ? null : programId);
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
          {/* Search Bar */}
          <View
            style={[
              styles.searchContainer,
              { backgroundColor: theme.uiBackground },
            ]}
          >
            <MaterialIcons name="search" size={20} color={Colors.blueAccent} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search programs by title, location, organizer..."
              placeholderTextColor={theme.text + "60"}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery !== "" && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <MaterialIcons
                  name="close-circle"
                  size={20}
                  color={theme.text}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Programs Count */}
          <View style={styles.programCountContainer}>
            <ThemedText style={styles.programCountText}>
              {filteredPrograms.length} program
              {filteredPrograms.length !== 1 ? "s" : ""} found
            </ThemedText>
          </View>

          {/* Programs List */}
          {loadingPrograms || loadingPermissions ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.text} />
              <ThemedText style={styles.loadingText}>
                Loading programs...
              </ThemedText>
            </View>
          ) : filteredPrograms.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons
                name="event-busy"
                size={64}
                color={theme.text}
                style={{ opacity: 0.3 }}
              />
              <ThemedText style={styles.emptyText}>
                {searchQuery
                  ? "No programs found"
                  : "No programs scheduled yet"}
              </ThemedText>
              {searchQuery ? (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setSearchQuery("")}
                >
                  <ThemedText style={styles.clearButtonText}>
                    Clear Search
                  </ThemedText>
                </TouchableOpacity>
              ) : (
                canManagePrograms && (
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => router.push("/addprogram")}
                  >
                    <MaterialIcons name="add" size={20} color="#fff" />
                    <ThemedText style={styles.addButtonText}>
                      Add First Program
                    </ThemedText>
                  </TouchableOpacity>
                )
              )}
            </View>
          ) : (
            <View style={styles.programsList}>
              {filteredPrograms.map((program) => (
                <View
                  key={program.id}
                  style={[styles.programCard, { borderColor: theme.border }]}
                >
                  {editingProgramId === program.id ? (
                    // EDIT MODE
                    <View style={styles.editForm}>
                      {/* Edit Header */}
                      <View style={styles.editHeader}>
                        <ThemedText style={styles.editModeLabel}>
                          Editing Program
                        </ThemedText>
                        <View style={styles.editButtons}>
                          <TouchableOpacity
                            style={[styles.editActionButton, styles.saveButton]}
                            onPress={() => handleSaveEdit(program.id)}
                            disabled={savingEdit}
                          >
                            {savingEdit ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <>
                                <MaterialIcons
                                  name="check"
                                  size={16}
                                  color="#fff"
                                />
                                <ThemedText style={styles.saveButtonText}>
                                  Save
                                </ThemedText>
                              </>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.editActionButton,
                              styles.cancelEditButton,
                            ]}
                            onPress={handleCancelEdit}
                          >
                            <MaterialIcons
                              name="close"
                              size={16}
                              color={Colors.redAccent}
                            />
                            <ThemedText style={styles.cancelEditButtonText}>
                              Cancel
                            </ThemedText>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Edit Form Fields */}
                      <View style={styles.editFormGroup}>
                        <ThemedText style={styles.editLabel}>
                          Title *
                        </ThemedText>
                        <TextInput
                          style={[
                            styles.editInput,
                            { color: theme.text, borderColor: theme.border },
                          ]}
                          value={editFormData.title}
                          onChangeText={(text) =>
                            setEditFormData({ ...editFormData, title: text })
                          }
                        />
                      </View>

                      <View style={styles.editRow}>
                        <View style={[styles.editFormGroup, { flex: 1 }]}>
                          <ThemedText style={styles.editLabel}>
                            Date *
                          </ThemedText>
                          <DateInputEdit
                            value={editFormData.date}
                            onChange={(text) =>
                              setEditFormData({ ...editFormData, date: text })
                            }
                            theme={theme}
                            isWeb={isWeb}
                          />
                        </View>
                        <View style={[styles.editFormGroup, { flex: 1 }]}>
                          <ThemedText style={styles.editLabel}>Time</ThemedText>
                          <TimeInputEdit
                            value={editFormData.time}
                            onChange={(text) =>
                              setEditFormData({ ...editFormData, time: text })
                            }
                            theme={theme}
                            isWeb={isWeb}
                          />
                        </View>
                      </View>

                      <View style={styles.editFormGroup}>
                        <ThemedText style={styles.editLabel}>
                          Location
                        </ThemedText>
                        <TextInput
                          style={[
                            styles.editInput,
                            { color: theme.text, borderColor: theme.border },
                          ]}
                          value={editFormData.location}
                          onChangeText={(text) =>
                            setEditFormData({ ...editFormData, location: text })
                          }
                        />
                      </View>

                      <View style={styles.editFormGroup}>
                        <ThemedText style={styles.editLabel}>
                          Organizer
                        </ThemedText>
                        <TextInput
                          style={[
                            styles.editInput,
                            { color: theme.text, borderColor: theme.border },
                          ]}
                          value={editFormData.organizer}
                          onChangeText={(text) =>
                            setEditFormData({
                              ...editFormData,
                              organizer: text,
                            })
                          }
                        />
                      </View>

                      <View style={styles.editFormGroup}>
                        <ThemedText style={styles.editLabel}>
                          Description
                        </ThemedText>
                        <TextInput
                          style={[
                            styles.editInput,
                            styles.editTextArea,
                            { color: theme.text, borderColor: theme.border },
                          ]}
                          value={editFormData.description}
                          onChangeText={(text) =>
                            setEditFormData({
                              ...editFormData,
                              description: text,
                            })
                          }
                          multiline
                          numberOfLines={3}
                          textAlignVertical="top"
                        />
                      </View>
                    </View>
                  ) : (
                    // VIEW MODE
                    <>
                      <View style={styles.programHeader}>
                        <View style={styles.dateBadge}>
                          <MaterialIcons
                            name="calendar-today"
                            size={14}
                            color="#fff"
                          />
                          <ThemedText style={styles.dateBadgeText}>
                            {formatDate(program.date)}
                          </ThemedText>
                        </View>

                        <View style={styles.headerRight}>
                          {program.time && (
                            <ThemedText style={styles.timeText}>
                              {program.time}
                            </ThemedText>
                          )}

                          {/* Actions Button (Three Dots) - Only show with permission */}
                          {canManagePrograms && (
                            <TouchableOpacity
                              style={styles.actionsButton}
                              onPress={() => toggleActions(program.id)}
                              hitSlop={{
                                top: 10,
                                bottom: 10,
                                left: 10,
                                right: 10,
                              }}
                            >
                              <MaterialIcons
                                name="more-vert"
                                size={24}
                                color={theme.text}
                                style={{ opacity: 0.6 }}
                              />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>

                      {/* Actions Menu (Edit/Delete) */}
                      {showActionsFor === program.id && canManagePrograms && (
                        <View
                          style={[
                            styles.actionsMenu,
                            { backgroundColor: theme.uiBackground },
                          ]}
                        >
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleEditClick(program)}
                          >
                            <MaterialIcons
                              name="edit"
                              size={18}
                              color={Colors.blueAccent}
                            />
                            <ThemedText
                              style={[
                                styles.actionText,
                                { color: Colors.blueAccent },
                              ]}
                            >
                              Edit
                            </ThemedText>
                          </TouchableOpacity>

                          <View style={styles.actionDivider} />

                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() =>
                              handleDeleteRequest(program.id, program.title)
                            }
                          >
                            <MaterialIcons
                              name="delete"
                              size={18}
                              color={Colors.redAccent}
                            />
                            <ThemedText
                              style={[
                                styles.actionText,
                                { color: Colors.redAccent },
                              ]}
                            >
                              Delete
                            </ThemedText>
                          </TouchableOpacity>
                        </View>
                      )}

                      <ThemedText style={styles.programTitle}>
                        {program.title}
                      </ThemedText>

                      {program.location && (
                        <View style={styles.detailRow}>
                          <MaterialIcons
                            name="location-on"
                            size={16}
                            color={theme.text}
                            style={{ opacity: 0.6 }}
                          />
                          <ThemedText style={styles.detailText}>
                            {program.location}
                          </ThemedText>
                        </View>
                      )}

                      {program.organizer && (
                        <View style={styles.detailRow}>
                          <MaterialIcons
                            name="person"
                            size={16}
                            color={theme.text}
                            style={{ opacity: 0.6 }}
                          />
                          <ThemedText style={styles.detailText}>
                            Organized by: {program.organizer}
                          </ThemedText>
                        </View>
                      )}

                      {program.description && (
                        <ThemedText style={styles.description}>
                          {program.description}
                        </ThemedText>
                      )}
                    </>
                  )}
                </View>
              ))}
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      <FooterNav />

      {/* Custom Alert for success/error messages */}
      <CustomAlert
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        autoClose={true}
        onConfirm={hideAlert}
        onCancel={hideAlert}
      />

      {/* Delete Confirmation Alert */}
      <CustomAlert
        visible={deleteConfirmation.visible}
        type="danger"
        title="Delete Program"
        message={`Are you sure you want to delete "${deleteConfirmation.programTitle}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        autoClose={false}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        dismissOnBackdrop={false}
      />
    </ThemedView>
  );
};

export default ViewPrograms;

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
  // Search Bar Styles
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  programCountContainer: {
    marginBottom: 16,
    alignItems: "flex-end",
  },
  programCountText: {
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.7,
  },
  clearButton: {
    backgroundColor: Colors.blueAccent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  clearButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  // Existing styles remain the same
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
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    opacity: 0.7,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
    opacity: 0.5,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.blueAccent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  programsList: {
    flex: 1,
  },
  programCard: {
    backgroundColor: Colors.uiBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    position: "relative",
  },
  programHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.blueAccent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  dateBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  timeText: {
    fontSize: 14,
    opacity: 0.7,
  },
  actionsButton: {
    padding: 4,
  },
  actionsMenu: {
    position: "absolute",
    top: 50,
    right: 20,
    borderRadius: 8,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 120,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  actionDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
    marginVertical: 4,
  },
  programTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    marginTop: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    opacity: 0.8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.7,
    marginTop: 8,
  },
  // Edit Mode Styles
  editForm: {
    gap: 16,
  },
  editHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  editModeLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.blueAccent,
  },
  editButtons: {
    flexDirection: "row",
    gap: 8,
  },
  editActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  saveButton: {
    backgroundColor: Colors.blueAccent,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  cancelEditButton: {
    backgroundColor: Colors.border + "40",
  },
  cancelEditButtonText: {
    color: Colors.redAccent,
    fontSize: 14,
    fontWeight: "600",
  },
  editFormGroup: {
    gap: 6,
  },
  editRow: {
    flexDirection: "row",
    gap: 12,
  },
  editLabel: {
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: Colors.uiBackground,
    minHeight: 40,
  },
  editTextArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  bottomSpacer: {
    height: 40,
  },
});
