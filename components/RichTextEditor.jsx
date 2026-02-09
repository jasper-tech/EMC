import React, { useState, useRef } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  TextInput,
  Platform,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import ThemedText from "./ThemedText";
import { Colors } from "../constants/Colors";
import { ThemeContext } from "../context/ThemeContext";
import { useContext } from "react";

const RichTextEditor = ({ content, onChange, theme, scheme }) => {
  const inputRef = useRef(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const handleSelectionChange = (event) => {
    setSelection({
      start: event.nativeEvent.selection.start,
      end: event.nativeEvent.selection.end,
    });
  };

  const setCursorPosition = (position) => {
    if (Platform.OS === "web") {
      // For web, we need to use DOM methods
      if (
        inputRef.current &&
        inputRef.current._internalFiberInstanceHandleDEV
      ) {
        // Access the DOM element
        const element =
          inputRef.current._internalFiberInstanceHandleDEV.stateNode;
        if (element && element.setSelectionRange) {
          element.setSelectionRange(position, position);
          element.focus();
        }
      }
    } else {
      // For mobile platforms
      if (inputRef.current && inputRef.current.setNativeProps) {
        inputRef.current.setNativeProps({
          selection: { start: position, end: position },
        });
      }
    }
  };

  const applyFormatting = (formatType) => {
    if (selection.start === selection.end) {
      // No text selected - apply formatting at cursor position with placeholder
      const placeholder =
        formatType === "bullet"
          ? "• Item"
          : formatType === "number"
          ? "1. Item"
          : formatType === "h1"
          ? "# Heading"
          : formatType === "h2"
          ? "## Subheading"
          : formatType === "quote"
          ? "> Quote"
          : "";

      if (placeholder) {
        const newContent =
          content.substring(0, selection.start) +
          placeholder +
          content.substring(selection.start);

        onChange(newContent);

        // Move cursor to end of placeholder
        const newPosition = selection.start + placeholder.length;
        setTimeout(() => {
          setCursorPosition(newPosition);
        }, 10);
      }
      return;
    }

    const selectedText = content.substring(selection.start, selection.end);
    let formattedText = "";
    let prefix = "";
    let suffix = "";

    switch (formatType) {
      case "bold":
        prefix = "**";
        suffix = "**";
        break;
      case "italic":
        prefix = "*";
        suffix = "*";
        break;
      case "underline":
        prefix = "__";
        suffix = "__";
        break;
      case "bullet":
        // Add bullet to each selected line
        const lines = selectedText.split("\n");
        formattedText = lines
          .map((line) => (line.trim() ? `• ${line}` : line))
          .join("\n");
        break;
      case "number":
        // Add numbering to each selected line
        const numberedLines = selectedText.split("\n");
        let lineCount = 1;
        formattedText = numberedLines
          .map((line) => {
            if (line.trim()) {
              const result = `${lineCount}. ${line}`;
              lineCount++;
              return result;
            }
            return line;
          })
          .join("\n");
        break;
      case "h1":
        // Add heading to each selected line
        const h1Lines = selectedText.split("\n");
        formattedText = h1Lines
          .map((line) => (line.trim() ? `# ${line}` : line))
          .join("\n");
        break;
      case "h2":
        // Add subheading to each selected line
        const h2Lines = selectedText.split("\n");
        formattedText = h2Lines
          .map((line) => (line.trim() ? `## ${line}` : line))
          .join("\n");
        break;
      case "quote":
        // Add quote to each selected line
        const quoteLines = selectedText.split("\n");
        formattedText = quoteLines
          .map((line) => (line.trim() ? `> ${line}` : line))
          .join("\n");
        break;
      default:
        return;
    }

    if (!formattedText) {
      formattedText = `${prefix}${selectedText}${suffix}`;
    }

    const newContent =
      content.substring(0, selection.start) +
      formattedText +
      content.substring(selection.end);

    onChange(newContent);

    // Adjust cursor position
    const newPosition = selection.start + formattedText.length;
    setTimeout(() => {
      setCursorPosition(newPosition);
    }, 10);
  };

  const insertLineBreak = () => {
    const newContent =
      content.substring(0, selection.start) +
      "\n\n" +
      content.substring(selection.start);

    onChange(newContent);

    // Move cursor after line break
    const newPosition = selection.start + 2;
    setTimeout(() => {
      setCursorPosition(newPosition);
    }, 10);
  };

  const ToolbarButton = ({ icon, label, onPress, active = false }) => (
    <TouchableOpacity
      style={[styles.toolButton, active && styles.activeToolButton]}
      onPress={onPress}
      accessibilityLabel={label}
    >
      <MaterialIcons
        name={icon}
        size={20}
        color={active ? "#fff" : theme.text}
      />
    </TouchableOpacity>
  );

  // Alternative approach for web selection - using state to force re-render
  const handleFormatClick = (formatType) => {
    // For web, we need to ensure the input has focus before applying formatting
    if (Platform.OS === "web" && inputRef.current) {
      // Focus the input
      inputRef.current.focus();
    }

    // Small delay to ensure focus is established
    setTimeout(() => {
      applyFormatting(formatType);
    }, 50);
  };

  return (
    <View style={styles.container}>
      {/* Formatting Toolbar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.toolbar}
      >
        <View style={styles.toolbarButtons}>
          <ToolbarButton
            icon="format-bold"
            label="Bold"
            onPress={() => handleFormatClick("bold")}
          />
          <ToolbarButton
            icon="format-italic"
            label="Italic"
            onPress={() => handleFormatClick("italic")}
          />
          <ToolbarButton
            icon="format-underlined"
            label="Underline"
            onPress={() => handleFormatClick("underline")}
          />

          <View style={styles.toolbarDivider} />

          <ToolbarButton
            icon="format-list-bulleted"
            label="Bullet List"
            onPress={() => handleFormatClick("bullet")}
          />
          <ToolbarButton
            icon="format-list-numbered"
            label="Numbered List"
            onPress={() => handleFormatClick("number")}
          />

          <View style={styles.toolbarDivider} />

          <ToolbarButton
            icon="title"
            label="Heading 1"
            onPress={() => handleFormatClick("h1")}
          />
          <ToolbarButton
            icon="text-fields"
            label="Heading 2"
            onPress={() => handleFormatClick("h2")}
          />

          <View style={styles.toolbarDivider} />

          <ToolbarButton
            icon="format-quote"
            label="Quote"
            onPress={() => handleFormatClick("quote")}
          />
          <ToolbarButton
            icon="space-bar"
            label="Line Break"
            onPress={insertLineBreak}
          />
        </View>
      </ScrollView>

      {/* Editor Input */}
      <TextInput
        ref={inputRef}
        style={[
          styles.editorInput,
          {
            backgroundColor:
              theme.inputBackground || "rgba(255, 255, 255, 0.08)",
            borderColor: theme.inputBorder || "rgba(255, 255, 255, 0.1)",
            color: theme.text,
          },
        ]}
        multiline
        numberOfLines={15}
        value={content}
        onChangeText={onChange}
        onSelectionChange={handleSelectionChange}
        textAlignVertical="top"
        placeholder="Write your content here... (Tip: Select text then click formatting buttons)"
        placeholderTextColor={
          scheme === "dark" ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.4)"
        }
        // Web-specific props
        {...(Platform.OS === "web" && {
          onMouseUp: handleSelectionChange,
          onKeyUp: handleSelectionChange,
        })}
      />

      {/* Formatting Help */}
      <View style={styles.helpContainer}>
        <ThemedText style={styles.helpText}>
          Tip: Select text then click formatting buttons. For lists and
          headings, you can also click the button to insert at cursor position.
        </ThemedText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  toolbar: {
    marginBottom: 12,
  },
  toolbarButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 16,
  },
  toolbarDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginHorizontal: 4,
  },
  toolButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  activeToolButton: {
    backgroundColor: Colors.blueAccent,
    borderColor: Colors.blueAccent,
  },
  editorInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    minHeight: 250,
    lineHeight: 24,
    fontFamily: Platform.OS === "web" ? "monospace" : "System",
  },
  helpContainer: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  helpText: {
    fontSize: 12,
    opacity: 0.6,
    fontStyle: "italic",
  },
});

export default RichTextEditor;
