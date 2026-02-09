import React, { useContext } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import ThemedText from "./ThemedText";
import { Colors } from "../constants/Colors";
import { ThemeContext } from "../context/ThemeContext";

const AnnouncementModal = ({ announcement, visible, onClose }) => {
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;

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
            style={[styles.heading1, { color: theme.text }]}
          >
            {line.substring(2)}
          </ThemedText>
        );
      } else if (line.startsWith("## ")) {
        return (
          <ThemedText
            key={index}
            style={[styles.heading2, { color: theme.text }]}
          >
            {line.substring(3)}
          </ThemedText>
        );
      }
      // Bold
      else if (line.includes("**")) {
        const parts = line.split("**");
        return (
          <ThemedText
            key={index}
            style={[styles.contentLine, { color: theme.text }]}
          >
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
          <ThemedText
            key={index}
            style={[styles.contentLine, { color: theme.text }]}
          >
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
          <ThemedText
            key={index}
            style={[styles.contentLine, { color: theme.text }]}
          >
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
            <ThemedText style={[styles.bulletText, { color: theme.text }]}>
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
            <ThemedText style={[styles.numberedText, { color: theme.text }]}>
              {match[2]}
            </ThemedText>
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
              { borderLeftColor: Colors.orangeAccent + "80" },
            ]}
          >
            <ThemedText style={[styles.quote, { color: theme.text }]}>
              {line.substring(2)}
            </ThemedText>
          </View>
        );
      }
      // Regular text
      return (
        <ThemedText
          key={index}
          style={[styles.contentLine, { color: theme.text }]}
        >
          {line}
        </ThemedText>
      );
    });
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

  if (!visible || !announcement) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                backgroundColor: Colors.orangeAccent,
                borderBottomColor: Colors.orangeAccent + "80",
              },
            ]}
          >
            <View style={styles.headerContent}>
              <View style={styles.iconContainer}>
                <MaterialIcons name="campaign" size={32} color="#fff" />
              </View>
              <View style={styles.headerText}>
                <ThemedText style={styles.announcementLabel}>
                  ANNOUNCEMENT
                </ThemedText>
                <ThemedText style={[styles.title, { color: "#fff" }]}>
                  {announcement.title}
                </ThemedText>
                <View style={styles.metaInfo}>
                  <View style={styles.metaRow}>
                    <MaterialIcons name="person" size={12} color="#fff" />
                    <ThemedText style={[styles.metaText, { color: "#fff" }]}>
                      {announcement.authorName || announcement.authorEmail}
                    </ThemedText>
                  </View>
                  <View style={styles.metaRow}>
                    <MaterialIcons name="schedule" size={12} color="#fff" />
                    <ThemedText style={[styles.metaText, { color: "#fff" }]}>
                      {formatDate(announcement.timestamp)}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={[
              styles.contentContainer,
              { backgroundColor: theme.background },
            ]}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.content}>
              {parseContent(announcement.content)}
            </View>
          </ScrollView>

          {/* Footer */}
          <View
            style={[
              styles.footer,
              { borderTopColor: theme.border, backgroundColor: theme.card },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: Colors.orangeAccent },
              ]}
              onPress={onClose}
            >
              <MaterialIcons name="check" size={20} color="#fff" />
              <ThemedText style={styles.actionButtonText}>Got it!</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContainer: {
    width: Platform.OS === "web" ? "80%" : "95%",
    maxWidth: 700,
    height: Platform.OS === "web" ? "80%" : "85%",
    borderRadius: 20,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  announcementLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 1.5,
    opacity: 0.9,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  metaInfo: {
    gap: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 11,
    opacity: 0.9,
  },
  closeButton: {
    padding: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 20,
  },
  contentContainer: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  emptyLine: {
    height: 16,
  },
  contentLine: {
    fontSize: 16,
    lineHeight: 26,
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
    marginTop: 5,
  },
  bulletText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 26,
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
    lineHeight: 26,
  },
  quoteContainer: {
    borderLeftWidth: 4,
    paddingLeft: 16,
    marginVertical: 12,
  },
  quote: {
    fontStyle: "italic",
    opacity: 0.8,
    fontSize: 15,
    lineHeight: 24,
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default AnnouncementModal;
