import React, { useState, useEffect, useContext, useRef } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  Dimensions,
  Keyboard,
} from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import FooterNav from "../components/FooterNav";
import CustomAlert from "../components/CustomAlert";
import { Colors } from "../constants/Colors";
import { ThemeContext } from "../context/ThemeContext";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { getAllPermissions } from "../Utils/permissionsHelper";
import RichTextEditor from "../components/RichTextEditor";
import WebRichTextEditor from "../components/WebRichTextEditor";
import DocumentViewer from "../components/DocumentViewer";

const { width } = Dimensions.get("window");
const isWeb = Platform.OS === "web";

const Jotter = () => {
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;

  // Permission states
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");

  // Tab states
  const [activeTab, setActiveTab] = useState("write");

  // Write tab states
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [documentType, setDocumentType] = useState("minutes");
  const [submitting, setSubmitting] = useState(false);
  const [editingDocId, setEditingDocId] = useState(null);

  // View tab states
  const [viewType, setViewType] = useState("minutes");
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showDocModal, setShowDocModal] = useState(false);

  // Alert states
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          setUserEmail(currentUser.email || "Anonymous");

          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const userRole = userData.role || "member";
            const isAdmin =
              userData.role === "admin" || userData.isAdmin === true;

            // Get user name
            setUserName(
              userData.name ||
                currentUser.displayName ||
                currentUser.email?.split("@")[0] ||
                "User"
            );

            // Load permissions
            const permissions = await getAllPermissions(userRole);
            setHasPermission(isAdmin || permissions.addMinutesReports);
          }
        }
      } catch (error) {
        console.error("Error checking permissions:", error);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermissions();
  }, []);

  // Fetch documents when view tab is active
  useEffect(() => {
    if (activeTab === "view" && hasPermission) {
      fetchDocuments();
    }
  }, [activeTab, viewType, hasPermission]);

  const fetchDocuments = () => {
    setLoadingDocs(true);
    try {
      const writingsRef = collection(db, "writings");
      const q = query(writingsRef, orderBy("timestamp", "desc"));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              timestamp: data.timestamp?.toDate() || new Date(),
              lastEdited: data.lastEdited?.toDate() || null,
            };
          })
          .filter((doc) => doc.type === viewType);

        setDocuments(docs);
        setLoadingDocs(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Error fetching documents:", error);
      setErrorMessage("Failed to fetch documents");
      setShowErrorAlert(true);
      setLoadingDocs(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      setErrorMessage("Please enter both title and content");
      setShowErrorAlert(true);
      return;
    }

    setSubmitting(true);
    try {
      if (editingDocId) {
        const docRef = doc(db, "writings", editingDocId);
        await updateDoc(docRef, {
          title: title.trim(),
          content: content.trim(),
          type: documentType,
          lastEdited: new Date(),
          editedBy: userEmail,
        });
      } else {
        // CREATE new document
        await addDoc(collection(db, "writings"), {
          title: title.trim(),
          content: content.trim(),
          type: documentType,
          authorEmail: userEmail,
          authorName: userName,
          authorId: auth.currentUser?.uid,
          timestamp: new Date(),
        });
      }

      setTitle("");
      setContent("");
      setEditingDocId(null);
      setShowSuccessAlert(true);
      Keyboard.dismiss();

      setTimeout(() => {
        setActiveTab("view");
      }, 1500);
    } catch (error) {
      console.error("Error submitting document:", error);
      setErrorMessage("Failed to save document");
      setShowErrorAlert(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePDFDownload = () => {
    setShowSuccessAlert(true);
    setTimeout(() => {
      setShowSuccessAlert(false);
    }, 3000);
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.blueAccent} />
          <ThemedText style={styles.loadingText}>Loading...</ThemedText>
        </View>
        <FooterNav />
      </ThemedView>
    );
  }

  if (!hasPermission) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.content}>
            <View style={styles.noPermissionContainer}>
              {/* <MaterialIcons
                name="lock"
                size={64}
                color={Colors.redAccent}
                style={{ opacity: 0.6 }}
              />
              <ThemedText style={styles.noPermissionTitle}>
                Access Denied
              </ThemedText> */}
              <ThemedText style={styles.noPermissionText}>
                You don't have permission to write minutes or announcements.
              </ThemedText>
              <ThemedText style={styles.noPermissionSubtext}>
                Please contact an administrator for access.
              </ThemedText>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <MaterialIcons name="arrow-back" size={20} color="#fff" />
                <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
        <FooterNav />
      </ThemedView>
    );
  }

  return (
    <ThemedView
      style={[
        styles.container,
        documentType === "announcement" &&
          activeTab === "write" &&
          styles.announcementMode,
      ]}
    >
      {/* Tab Headers */}
      <View
        style={[
          styles.tabHeader,
          documentType === "announcement" &&
            activeTab === "write" &&
            styles.announcementTabHeader,
        ]}
      >
        <TouchableOpacity
          style={[styles.tab, activeTab === "write" && styles.activeTab]}
          onPress={() => setActiveTab("write")}
        >
          <MaterialIcons
            name="edit"
            size={20}
            color={activeTab === "write" ? Colors.blueAccent : Colors.gray}
          />
          <ThemedText
            style={[
              styles.tabText,
              activeTab === "write" && styles.activeTabText,
            ]}
          >
            Write
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "view" && styles.activeTab]}
          onPress={() => setActiveTab("view")}
        >
          <MaterialIcons
            name="visibility"
            size={20}
            color={activeTab === "view" ? Colors.blueAccent : Colors.gray}
          />
          <ThemedText
            style={[
              styles.tabText,
              activeTab === "view" && styles.activeTabText,
            ]}
          >
            View All
          </ThemedText>
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {activeTab === "write" ? (
            /* WRITE TAB */
            <View style={styles.writeContainer}>
              {/* Document Type Selector */}
              <View
                style={[
                  styles.typeSelector,
                  documentType === "announcement" &&
                    styles.announcementTypeSelector,
                ]}
              >
                <View style={styles.typeTabs}>
                  <TouchableOpacity
                    style={[
                      styles.typeTab,
                      documentType === "minutes" && styles.activeTypeTab,
                    ]}
                    onPress={() => setDocumentType("minutes")}
                  >
                    <MaterialIcons
                      name="description"
                      size={18}
                      color={documentType === "minutes" ? "#fff" : theme.text}
                    />
                    <ThemedText
                      style={[
                        styles.typeTabText,
                        documentType === "minutes" && styles.activeTypeTabText,
                      ]}
                    >
                      Minutes
                    </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.typeTab,
                      documentType === "announcement" && styles.announcementTab,
                      documentType === "announcement" && styles.activeTypeTab,
                    ]}
                    onPress={() => setDocumentType("announcement")}
                  >
                    <MaterialIcons
                      name="campaign"
                      size={18}
                      color={
                        documentType === "announcement"
                          ? "#fff"
                          : Colors.orangeAccent
                      }
                    />
                    <ThemedText
                      style={[
                        styles.typeTabText,
                        documentType === "announcement" &&
                          styles.activeTypeTabText,
                      ]}
                    >
                      Announcement
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Title Input */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Title</ThemedText>
                <TextInput
                  style={[
                    styles.titleInput,
                    {
                      backgroundColor:
                        theme.inputBackground || "rgba(255, 255, 255, 0.08)",
                      borderColor:
                        theme.inputBorder || "rgba(255, 255, 255, 0.1)",
                      color: theme.text,
                    },
                    documentType === "announcement" && styles.announcementInput,
                  ]}
                  value={title}
                  onChangeText={setTitle}
                  placeholder={
                    documentType === "minutes"
                      ? "Enter meeting title..."
                      : "Enter announcement title..."
                  }
                  placeholderTextColor={
                    scheme === "dark"
                      ? "rgba(255, 255, 255, 0.4)"
                      : "rgba(0, 0, 0, 0.4)"
                  }
                />
              </View>

              {Platform.OS === "web" ? (
                <WebRichTextEditor
                  content={content}
                  onChange={setContent}
                  theme={theme}
                />
              ) : (
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                  theme={theme}
                  scheme={scheme}
                />
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  documentType === "announcement" &&
                    styles.announcementSubmitButton,
                  (submitting || !title.trim() || !content.trim()) &&
                    styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={submitting || !title.trim() || !content.trim()}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="save" size={20} color="#fff" />
                    <ThemedText style={styles.submitButtonText}>
                      {documentType === "minutes"
                        ? "Save Minutes"
                        : "Publish Announcement"}
                    </ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* VIEW TAB */
            <View style={styles.viewContainer}>
              {/* Type Filter */}
              <View style={styles.filterContainer}>
                <ThemedText style={styles.filterLabel}>Show:</ThemedText>
                <View style={styles.filterTabs}>
                  <TouchableOpacity
                    style={[
                      styles.filterTab,
                      viewType === "minutes" && styles.activeFilterTab,
                    ]}
                    onPress={() => setViewType("minutes")}
                  >
                    <ThemedText
                      style={[
                        styles.filterTabText,
                        viewType === "minutes" && styles.activeFilterTabText,
                      ]}
                    >
                      Minutes
                    </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.filterTab,
                      viewType === "announcement" &&
                        styles.announcementFilterTab,
                      viewType === "announcement" && styles.activeFilterTab,
                    ]}
                    onPress={() => setViewType("announcement")}
                  >
                    <ThemedText
                      style={[
                        styles.filterTabText,
                        viewType === "announcement" &&
                          styles.activeFilterTabText,
                      ]}
                    >
                      Announcements
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Documents List */}
              {loadingDocs ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={Colors.blueAccent} />
                  <ThemedText style={styles.loadingText}>
                    Loading documents...
                  </ThemedText>
                </View>
              ) : documents.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <MaterialIcons
                    name="inbox"
                    size={48}
                    color={Colors.gray}
                    style={{ opacity: 0.5 }}
                  />
                  <ThemedText style={styles.emptyTitle}>
                    No {viewType === "minutes" ? "Minutes" : "Announcements"}{" "}
                    Yet
                  </ThemedText>
                  <ThemedText style={styles.emptyText}>
                    {viewType === "minutes"
                      ? "Start writing your first meeting minutes"
                      : "Create your first announcement"}
                  </ThemedText>
                  <TouchableOpacity
                    style={styles.createButton}
                    onPress={() => setActiveTab("write")}
                  >
                    <MaterialIcons name="add" size={20} color="#fff" />
                    <ThemedText style={styles.createButtonText}>
                      Create{" "}
                      {viewType === "minutes" ? "Minutes" : "Announcement"}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.documentsList}>
                  {documents.map((doc) => (
                    <TouchableOpacity
                      key={doc.id}
                      style={[
                        styles.documentCard,
                        doc.type === "announcement" && styles.announcementCard,
                      ]}
                      onPress={() => {
                        setSelectedDoc(doc);
                        setShowDocModal(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.documentHeader}>
                        <View style={styles.documentIconContainer}>
                          <MaterialIcons
                            name={
                              doc.type === "minutes"
                                ? "description"
                                : "campaign"
                            }
                            size={24}
                            color={
                              doc.type === "minutes"
                                ? Colors.blueAccent
                                : Colors.orangeAccent
                            }
                          />
                        </View>
                        <View style={styles.documentInfo}>
                          <View style={styles.documentTitleRow}>
                            <ThemedText style={styles.documentTitle}>
                              {doc.title}
                            </ThemedText>
                            {doc.type === "announcement" && (
                              <View style={styles.announcementBadge}>
                                <ThemedText
                                  style={styles.announcementBadgeText}
                                >
                                  Announcement
                                </ThemedText>
                              </View>
                            )}
                          </View>
                          <View style={styles.documentMeta}>
                            <View style={styles.metaRow}>
                              <MaterialIcons
                                name="person"
                                size={12}
                                color={Colors.gray}
                              />
                              <ThemedText style={styles.documentAuthor}>
                                {doc.authorName || doc.authorEmail}
                              </ThemedText>
                            </View>
                            <ThemedText style={styles.documentDot}>
                              •
                            </ThemedText>
                            <ThemedText style={styles.documentDate}>
                              {new Date(doc.timestamp).toLocaleDateString()}
                            </ThemedText>
                          </View>
                        </View>
                        <MaterialIcons
                          name="chevron-right"
                          size={24}
                          color={Colors.gray}
                          style={{ opacity: 0.5 }}
                        />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>
      <FooterNav />

      <DocumentViewer
        document={selectedDoc}
        visible={showDocModal}
        onClose={() => {
          setShowDocModal(false);
          setSelectedDoc(null);
        }}
        onDownloadPDF={handlePDFDownload}
        onEdit={(doc) => {
          setActiveTab("write");
          setDocumentType(doc.type);
          setTitle(doc.title);
          setContent(doc.content);
          setEditingDocId(doc.id);
          setShowDocModal(false);
        }}
        onDelete={(docId) => {
          setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
        }}
        refreshDocuments={fetchDocuments}
        onShowSuccessAlert={(message) => {
          setErrorMessage(message || "Document deleted successfully!");
          setShowSuccessAlert(true);
        }}
        onShowErrorAlert={(message) => {
          setErrorMessage(message || "Failed to delete document");
          setShowErrorAlert(true);
        }}
      />
      {/* Success Alert */}
      <CustomAlert
        visible={showSuccessAlert}
        type="success"
        title="Success!"
        message={`${
          selectedDoc?.type === "minutes" || !selectedDoc
            ? documentType === "minutes"
              ? "Minutes"
              : "Announcement"
            : selectedDoc.type === "minutes"
            ? "Minutes"
            : "Announcement"
        } ${selectedDoc ? "downloaded" : "saved"} successfully!`}
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
  //   announcementMode: {
  //     backgroundColor: Colors.orangeAccent + "08",
  //   },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: isWeb ? Math.max(width * 0.08, 40) : 16,
    paddingBottom: 40,
    maxWidth: isWeb ? 1000 : "100%",
    alignSelf: "center",
    width: "100%",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.6,
  },
  noPermissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  noPermissionTitle: {
    fontSize: isWeb ? 24 : 20,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 12,
  },
  noPermissionText: {
    fontSize: isWeb ? 16 : 14,
    textAlign: "center",
    marginBottom: 8,
    opacity: 0.8,
  },
  noPermissionSubtext: {
    fontSize: isWeb ? 14 : 12,
    textAlign: "center",
    opacity: 0.6,
    marginBottom: 24,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.blueAccent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  tabHeader: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: isWeb ? Math.max(width * 0.08, 40) : 16,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 8,
  },
  //   announcementTabHeader: {
  //     backgroundColor: Colors.orangeAccent + "15",
  //   },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  activeTab: {
    backgroundColor: "rgba(33, 150, 243, 0.15)",
  },
  tabText: {
    fontSize: isWeb ? 16 : 14,
    fontWeight: "600",
    opacity: 0.6,
  },
  activeTabText: {
    color: Colors.blueAccent,
    opacity: 1,
  },
  writeContainer: {
    paddingTop: 20,
  },
  typeSelector: {
    marginBottom: 24,
  },
  announcementTypeSelector: {
    backgroundColor: Colors.orangeAccent + "10",
    padding: 16,
    borderRadius: 12,
  },
  sectionLabel: {
    fontSize: isWeb ? 16 : 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  typeTabs: {
    flexDirection: "row",
    gap: 12,
  },
  typeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.1)",
    gap: 8,
  },
  announcementTab: {
    borderColor: Colors.orangeAccent + "30",
  },
  activeTypeTab: {
    backgroundColor: Colors.blueAccent,
    borderColor: Colors.blueAccent,
  },
  typeTabText: {
    fontSize: isWeb ? 15 : 13,
    fontWeight: "600",
  },
  activeTypeTabText: {
    color: "#fff",
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: isWeb ? 15 : 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  titleInput: {
    borderRadius: 12,
    padding: isWeb ? 16 : 14,
    fontSize: isWeb ? 16 : 14,
    borderWidth: 1,
  },
  announcementInput: {
    borderColor: Colors.orangeAccent + "50",
    backgroundColor: Colors.orangeAccent + "08",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.greenAccent,
    paddingVertical: isWeb ? 18 : 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  announcementSubmitButton: {
    backgroundColor: Colors.orangeAccent,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.gray,
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: isWeb ? 17 : 15,
    fontWeight: "bold",
  },
  viewContainer: {
    paddingTop: 20,
  },
  filterContainer: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: isWeb ? 16 : 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  filterTabs: {
    flexDirection: "row",
    gap: 12,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
  },
  announcementFilterTab: {
    borderColor: Colors.orangeAccent + "30",
  },
  activeFilterTab: {
    backgroundColor: Colors.blueAccent,
    borderColor: Colors.blueAccent,
  },
  filterTabText: {
    fontSize: isWeb ? 15 : 13,
    fontWeight: "600",
    opacity: 0.7,
  },
  activeFilterTabText: {
    color: "#fff",
    opacity: 1,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 16,
  },
  emptyTitle: {
    fontSize: isWeb ? 20 : 18,
    fontWeight: "bold",
    marginTop: 16,
  },
  emptyText: {
    fontSize: isWeb ? 15 : 14,
    opacity: 0.7,
    textAlign: "center",
    marginBottom: 8,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.blueAccent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 16,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  documentsList: {
    gap: 12,
  },
  documentCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 14,
    padding: isWeb ? 18 : 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  announcementCard: {
    backgroundColor: Colors.orangeAccent + "08",
    borderColor: Colors.orangeAccent + "20",
  },
  documentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  documentIconContainer: {
    padding: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 10,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 6,
  },
  documentTitle: {
    fontSize: isWeb ? 17 : 15,
    fontWeight: "bold",
  },
  announcementBadge: {
    backgroundColor: Colors.orangeAccent + "20",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  announcementBadgeText: {
    fontSize: 10,
    color: Colors.orangeAccent,
    fontWeight: "600",
  },
  documentMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  documentAuthor: {
    fontSize: isWeb ? 13 : 11,
    opacity: 0.7,
  },
  documentDot: {
    fontSize: 12,
    opacity: 0.5,
  },
  documentDate: {
    fontSize: isWeb ? 13 : 11,
    opacity: 0.7,
  },
  bottomSpacer: {
    height: isWeb ? 120 : 100,
  },
});

export default Jotter;
