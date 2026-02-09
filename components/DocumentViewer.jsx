import React, { useState, useContext } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
  Share,
  Alert,
  Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import ThemedText from "./ThemedText";
import ConfirmationModal from "./ConfirmationModal";
import { Colors } from "../constants/Colors";
import { ThemeContext } from "../context/ThemeContext";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { auth, db } from "../firebase";
import { doc, deleteDoc, updateDoc } from "firebase/firestore";

const DocumentViewer = ({
  document,
  visible,
  onClose,
  onDownloadPDF,
  onEdit,
  onDelete,
  refreshDocuments,
  onShowSuccessAlert,
  onShowErrorAlert,
}) => {
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;

  const [downloading, setDownloading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [saving, setSaving] = useState(false);

  const currentUser = auth.currentUser;
  const isCreator =
    currentUser &&
    (document?.authorEmail === currentUser.email ||
      document?.authorId === currentUser.uid);

  const parseContent = (content) => {
    if (!content) return null;

    const lines = content.split("\n");
    return lines.map((line, index) => {
      if (!line.trim()) {
        return <View key={index} style={styles.emptyLine} />;
      }

      // Headings
      if (line.startsWith("# ")) {
        return (
          <ThemedText
            key={index}
            style={[styles.heading1, { color: theme.primary }]}
          >
            {line.substring(2)}
          </ThemedText>
        );
      } else if (line.startsWith("## ")) {
        return (
          <ThemedText
            key={index}
            style={[styles.heading2, { color: theme.primary }]}
          >
            {line.substring(3)}
          </ThemedText>
        );
      }
      // Bold
      else if (line.includes("**")) {
        const parts = line.split("**");
        return (
          <ThemedText key={index} style={styles.contentLine}>
            {parts.map((part, i) =>
              i % 2 === 1 ? (
                <ThemedText key={`bold-${i}`} style={styles.boldText}>
                  {part}
                </ThemedText>
              ) : (
                part
              )
            )}
          </ThemedText>
        );
      }
      // Italic
      else if (line.includes("*") && !line.startsWith("* ")) {
        const parts = line.split("*");
        return (
          <ThemedText key={index} style={styles.contentLine}>
            {parts.map((part, i) =>
              i % 2 === 1 ? (
                <ThemedText key={`italic-${i}`} style={styles.italicText}>
                  {part}
                </ThemedText>
              ) : (
                part
              )
            )}
          </ThemedText>
        );
      }
      // Underline
      else if (line.includes("__")) {
        const parts = line.split("__");
        return (
          <ThemedText key={index} style={styles.contentLine}>
            {parts.map((part, i) =>
              i % 2 === 1 ? (
                <ThemedText key={`underline-${i}`} style={styles.underlineText}>
                  {part}
                </ThemedText>
              ) : (
                part
              )
            )}
          </ThemedText>
        );
      }
      // Bullet points
      else if (line.startsWith("• ")) {
        return (
          <View key={index} style={styles.bulletLine}>
            <ThemedText style={[styles.bullet, { color: theme.text }]}>
              •
            </ThemedText>
            <ThemedText style={styles.bulletText}>
              {line.substring(2)}
            </ThemedText>
          </View>
        );
      }
      // Numbered list
      else if (/^\d+\.\s/.test(line)) {
        const match = line.match(/^(\d+)\.\s(.+)$/);
        return (
          <View key={index} style={styles.numberedLine}>
            <ThemedText style={[styles.number, { color: theme.text }]}>
              {match[1]}.
            </ThemedText>
            <ThemedText style={styles.numberedText}>{match[2]}</ThemedText>
          </View>
        );
      }
      // Quote
      else if (line.startsWith("> ")) {
        return (
          <View
            key={index}
            style={[
              styles.quoteContainer,
              { borderLeftColor: theme.primary + "80" },
            ]}
          >
            <ThemedText style={styles.quote}>{line.substring(2)}</ThemedText>
          </View>
        );
      }
      // Regular text
      return (
        <ThemedText key={index} style={styles.contentLine}>
          {line}
        </ThemedText>
      );
    });
  };

  const generatePDF = async () => {
    setDownloading(true);
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${document.title}</title>
          <style>
            body { 
              font-family: 'Arial', sans-serif; 
              padding: 40px;
              line-height: 1.6;
              color: #333;
              background: #fff;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              border-bottom: 2px solid #2196F3;
              padding-bottom: 20px;
            }
            .title {
              font-size: 28px;
              font-weight: bold;
              color: #2196F3;
              margin-bottom: 10px;
            }
            .meta {
              color: #666;
              font-size: 14px;
              margin-bottom: 5px;
            }
            .content {
              font-size: 16px;
              color: #333;
            }
            .bold { font-weight: bold; }
            .italic { font-style: italic; }
            .underline { text-decoration: underline; }
            .bullet-list { padding-left: 20px; }
            .number-list { padding-left: 20px; }
            .heading1 { 
              font-size: 24px; 
              font-weight: bold;
              margin-top: 30px;
              margin-bottom: 15px;
              color: #2196F3;
            }
            .heading2 { 
              font-size: 20px; 
              font-weight: bold;
              margin-top: 25px;
              margin-bottom: 12px;
              color: #2196F3;
            }
            .quote {
              border-left: 4px solid #ccc;
              padding-left: 20px;
              margin: 20px 0;
              font-style: italic;
              color: #666;
            }
            .separator {
              border-top: 1px solid #eee;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${document.title}</div>
            <div class="meta">Type: ${
              document.type === "minutes" ? "Meeting Minutes" : "Announcement"
            }</div>
            <div class="meta">Author: ${
              document.authorName || document.authorEmail
            }</div>
            <div class="meta">Date: ${new Date(
              document.timestamp
            ).toLocaleString()}</div>
          </div>
          <div class="separator"></div>
          <div class="content">
            ${document.content
              .replace(/\n/g, "<br>")
              .replace(/\*\*(.*?)\*\*/g, '<span class="bold">$1</span>')
              .replace(/\*(.*?)\*/g, '<span class="italic">$1</span>')
              .replace(/__(.*?)__/g, '<span class="underline">$1</span>')
              .replace(/^# (.*)$/gm, '<div class="heading1">$1</div>')
              .replace(/^## (.*)$/gm, '<div class="heading2">$1</div>')
              .replace(/^• (.*)$/gm, "<div>• $1</div>")
              .replace(/^> (.*)$/gm, '<div class="quote">$1</div>')}
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });

      if (Platform.OS === "ios") {
        await Sharing.shareAsync(uri);
      } else if (Platform.OS === "android") {
        await Share.share({
          url: uri,
          title: `${document.title}.pdf`,
        });
      } else {
        // For web
        const link = document.createElement("a");
        link.href = uri;
        link.download = `${document.title.replace(/[^a-z0-9]/gi, "_")}.pdf`;
        link.click();
      }

      if (onDownloadPDF) {
        onDownloadPDF();
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      Alert.alert("Error", "Failed to generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(document);
      onClose();
    } else {
      setEditedContent(document.content);
      setEditing(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!editedContent.trim()) {
      Alert.alert("Error", "Content cannot be empty");
      return;
    }

    setSaving(true);
    try {
      const docRef = doc(db, "writings", document.id);
      await updateDoc(docRef, {
        content: editedContent,
        lastEdited: new Date(),
        editedBy: currentUser.email,
      });

      setEditing(false);
      if (refreshDocuments) {
        refreshDocuments();
      }
      Alert.alert("Success", "Document updated successfully");
    } catch (error) {
      console.error("Error updating document:", error);
      Alert.alert("Error", "Failed to update document");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
    setShowActions(false);
  };

  const confirmDelete = async () => {
    try {
      const docRef = doc(db, "writings", document.id);
      await deleteDoc(docRef);

      if (onDelete) {
        onDelete(document.id);
      }
      if (refreshDocuments) {
        refreshDocuments();
      }

      setShowDeleteConfirm(false);
      onClose();

      if (onShowSuccessAlert) {
        onShowSuccessAlert("Document deleted successfully!");
      }
    } catch (error) {
      console.error("Error deleting document:", error);

      if (onShowErrorAlert) {
        onShowErrorAlert("Failed to delete document");
      }
    }
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    try {
      return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  if (!visible || !document) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={[styles.modalOverlay, { backgroundColor: "rgba(0, 0, 0, 0.7)" }]}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                backgroundColor:
                  document.type === "minutes"
                    ? Colors.greenAccent
                    : Colors.orangeAccent,
                borderBottomColor: theme.border,
              },
            ]}
          >
            <View style={styles.headerContent}>
              <View
                style={[
                  styles.iconContainer,
                  //   {
                  //     backgroundColor:
                  //       document.type === "minutes"
                  //         ? theme.primary + "30"
                  //         : Colors.orangeAccent + "30",
                  //   },
                ]}
              >
                <MaterialIcons
                  name={
                    document.type === "minutes" ? "description" : "campaign"
                  }
                  size={28}
                  color={
                    document.type === "minutes"
                      ? theme.primary
                      : Colors.orangeAccent
                  }
                />
              </View>
              <View style={styles.headerText}>
                <ThemedText style={[styles.title, { color: theme.text }]}>
                  {document.title}
                </ThemedText>
                <View style={styles.metaInfo}>
                  <View style={styles.metaRow}>
                    <MaterialIcons name="person" size={14} color={theme.text} />
                    <ThemedText
                      style={[styles.metaText, { color: theme.text }]}
                    >
                      {document.authorName || document.authorEmail}
                    </ThemedText>
                  </View>
                  <View style={styles.metaRow}>
                    <MaterialIcons
                      name="schedule"
                      size={14}
                      color={theme.text}
                    />
                    <ThemedText
                      style={[styles.metaText, { color: theme.text }]}
                    >
                      {formatDate(document.timestamp)}
                    </ThemedText>
                    {document.lastEdited && (
                      <>
                        <ThemedText
                          style={[
                            styles.metaText,
                            { color: theme.text, marginLeft: 8 },
                          ]}
                        >
                          •
                        </ThemedText>
                        <MaterialIcons
                          name="edit"
                          size={12}
                          color={theme.text}
                        />
                        <ThemedText
                          style={[styles.metaText, { color: theme.text }]}
                        >
                          Edited: {formatDate(document.lastEdited)}
                        </ThemedText>
                      </>
                    )}
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.headerActions}>
              {isCreator && (
                <TouchableOpacity
                  style={styles.actionMenuButton}
                  onPress={() => setShowActions(!showActions)}
                >
                  <MaterialIcons
                    name="more-vert"
                    size={24}
                    color={theme.text + "80"}
                  />
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <MaterialIcons
                  name="close"
                  size={24}
                  color={theme.text + "80"}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Menu */}
          {showActions && isCreator && (
            <View
              style={[
                styles.actionMenu,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <TouchableOpacity
                style={styles.actionMenuItem}
                onPress={handleEdit}
              >
                <MaterialIcons name="edit" size={18} color={theme.text} />
                <ThemedText
                  style={[styles.actionMenuItemText, { color: theme.text }]}
                >
                  Edit
                </ThemedText>
              </TouchableOpacity>

              <View
                style={[
                  styles.actionMenuDivider,
                  { backgroundColor: theme.border },
                ]}
              />

              <TouchableOpacity
                style={[styles.actionMenuItem, styles.deleteAction]}
                onPress={handleDelete}
              >
                <MaterialIcons
                  name="delete"
                  size={18}
                  color={Colors.redAccent}
                />
                <ThemedText
                  style={[
                    styles.actionMenuItemText,
                    { color: Colors.redAccent },
                  ]}
                >
                  Delete
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}

          {/* Edit Mode */}
          {editing ? (
            <View style={styles.editContainer}>
              <ScrollView style={styles.editScrollView}>
                <ThemedText style={[styles.editLabel, { color: theme.text }]}>
                  Edit Content:
                </ThemedText>
                <View
                  style={[
                    styles.editInputContainer,
                    { backgroundColor: theme.inputBackground },
                  ]}
                >
                  <ScrollView style={styles.editInputScroll}>
                    <ThemedText
                      style={[styles.editInput, { color: theme.text }]}
                    >
                      {editedContent}
                    </ThemedText>
                  </ScrollView>
                </View>

                <View style={styles.editButtons}>
                  <TouchableOpacity
                    style={[
                      styles.editButton,
                      styles.cancelButton,
                      { borderColor: theme.border },
                    ]}
                    onPress={() => {
                      setEditing(false);
                      setShowActions(false);
                    }}
                  >
                    <ThemedText
                      style={[styles.editButtonText, { color: theme.text }]}
                    >
                      Cancel
                    </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.editButton,
                      styles.saveButton,
                      { backgroundColor: theme.primary },
                    ]}
                    onPress={handleSaveEdit}
                    disabled={saving}
                  >
                    {saving ? (
                      <MaterialIcons
                        name="hourglass-empty"
                        size={18}
                        color="#fff"
                      />
                    ) : (
                      <MaterialIcons name="save" size={18} color="#fff" />
                    )}
                    <ThemedText style={styles.saveButtonText}>
                      {saving ? "Saving..." : "Save Changes"}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          ) : (
            /* Content View Mode */
            <>
              {/* Content */}
              <ScrollView
                style={[
                  styles.contentContainer,
                  { backgroundColor: theme.background },
                ]}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.content}>
                  {parseContent(document.content)}
                </View>
              </ScrollView>

              {/* Footer Actions */}
              <View
                style={[
                  styles.footer,
                  { borderTopColor: theme.border, backgroundColor: theme.card },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.pdfButton,
                    { backgroundColor: Colors.redAccent },
                  ]}
                  onPress={generatePDF}
                  disabled={downloading}
                >
                  {downloading ? (
                    <MaterialIcons
                      name="hourglass-empty"
                      size={20}
                      color="#fff"
                    />
                  ) : (
                    <MaterialIcons
                      name="picture-as-pdf"
                      size={20}
                      color="#fff"
                    />
                  )}
                  <ThemedText style={styles.actionButtonText}>
                    {downloading ? "Generating..." : "Download PDF"}
                  </ThemedText>
                </TouchableOpacity>

                {/* <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.shareButton,
                    { backgroundColor: theme.primary },
                  ]}
                  onPress={() => {
                    Share.share({
                      title: document.title,
                      message: `${
                        document.title
                      }\n\n${document.content.substring(0, 200)}...\n\nType: ${
                        document.type === "minutes"
                          ? "Meeting Minutes"
                          : "Announcement"
                      }\nAuthor: ${
                        document.authorName || document.authorEmail
                      }`,
                    });
                  }}
                >
                  <MaterialIcons name="share" size={20} color="#fff" />
                  <ThemedText style={styles.actionButtonText}>Share</ThemedText>
                </TouchableOpacity> */}
              </View>
            </>
          )}
        </View>
        <ConfirmationModal
          visible={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={confirmDelete}
          type="danger"
          title="Delete Document"
          message="Are you sure you want to delete this document? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContainer: {
    width: Platform.OS === "web" ? "80%" : "95%",
    maxWidth: 800,
    height: Platform.OS === "web" ? "85%" : "90%",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  metaInfo: {
    gap: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionMenuButton: {
    padding: 4,
  },
  closeButton: {
    padding: 4,
  },
  actionMenu: {
    position: "absolute",
    top: 70,
    right: 20,
    minWidth: 140,
    borderRadius: 8,
    borderWidth: 1,
    zIndex: 1001,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  deleteAction: {
    borderTopWidth: 0,
  },
  actionMenuItemText: {
    fontSize: 14,
    fontWeight: "500",
  },
  actionMenuDivider: {
    height: 1,
    width: "100%",
  },
  contentContainer: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  emptyLine: {
    height: 16,
  },
  contentLine: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  heading1: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 12,
  },
  heading2: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 10,
  },
  boldText: {
    fontWeight: "bold",
  },
  italicText: {
    fontStyle: "italic",
  },
  underlineText: {
    textDecorationLine: "underline",
  },
  bulletLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  bullet: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 4,
  },
  bulletText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  numberedLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  number: {
    fontSize: 16,
    marginRight: 8,
    fontWeight: "bold",
    minWidth: 24,
  },
  numberedText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  quoteContainer: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    marginVertical: 12,
  },
  quote: {
    fontStyle: "italic",
    opacity: 0.8,
    fontSize: 15,
    lineHeight: 22,
  },
  editContainer: {
    flex: 1,
    padding: 20,
  },
  editScrollView: {
    flex: 1,
  },
  editLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  editInputContainer: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    marginBottom: 20,
    minHeight: 300,
  },
  editInputScroll: {
    padding: 16,
  },
  editInput: {
    fontSize: 16,
    lineHeight: 24,
  },
  editButtons: {
    flexDirection: "row",
    gap: 12,
  },
  editButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {
    flexDirection: "row",
    gap: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default DocumentViewer;
