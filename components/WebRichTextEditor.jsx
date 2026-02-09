import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Platform,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import ThemedText from "./ThemedText";
import { Colors } from "../constants/Colors";

const WebRichTextEditor = ({ content, onChange, theme }) => {
  const editorRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (Platform.OS === "web" && editorRef.current) {
      const editor = editorRef.current;

      // Set up contentEditable
      editor.contentEditable = true;
      editor.style.outline = "none";
      editor.style.minHeight = "250px";

      // Set initial content
      editor.innerHTML = content.replace(/\n/g, "<br>");

      // Handle input events
      const handleInput = () => {
        onChange(editor.innerText);
      };

      editor.addEventListener("input", handleInput);

      return () => {
        editor.removeEventListener("input", handleInput);
      };
    }
  }, []);

  const execCommand = (command, value = null) => {
    if (Platform.OS === "web" && editorRef.current) {
      document.execCommand(command, false, value);
      editorRef.current.focus();
      // Update content after formatting
      setTimeout(() => {
        onChange(editorRef.current.innerText);
      }, 0);
    }
  };

  const ToolbarButton = ({ icon, label, command, value }) => (
    <TouchableOpacity
      style={styles.toolButton}
      onPress={() => execCommand(command, value)}
      accessibilityLabel={label}
    >
      <MaterialIcons name={icon} size={20} color={theme.text} />
    </TouchableOpacity>
  );

  if (Platform.OS !== "web") {
    // Fallback for mobile
    return null; // Or use the original TextInput-based editor
  }

  return (
    <View style={styles.container}>
      {/* Formatting Toolbar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.toolbar}
      >
        <View style={styles.toolbarButtons}>
          <ToolbarButton icon="format-bold" label="Bold" command="bold" />
          <ToolbarButton icon="format-italic" label="Italic" command="italic" />
          <ToolbarButton
            icon="format-underlined"
            label="Underline"
            command="underline"
          />

          <View style={styles.toolbarDivider} />

          <ToolbarButton
            icon="format-list-bulleted"
            label="Bullet List"
            command="insertUnorderedList"
          />
          <ToolbarButton
            icon="format-list-numbered"
            label="Numbered List"
            command="insertOrderedList"
          />

          <View style={styles.toolbarDivider} />

          <ToolbarButton
            icon="title"
            label="Heading 1"
            command="formatBlock"
            value="<h1>"
          />
          <ToolbarButton
            icon="text-fields"
            label="Heading 2"
            command="formatBlock"
            value="<h2>"
          />

          <View style={styles.toolbarDivider} />

          <ToolbarButton
            icon="format-quote"
            label="Quote"
            command="formatBlock"
            value="<blockquote>"
          />

          <TouchableOpacity
            style={styles.toolButton}
            onPress={() => execCommand("insertHTML", "<br><br>")}
          >
            <MaterialIcons name="space-bar" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ContentEditable Editor */}
      <View
        ref={editorRef}
        style={[
          styles.editor,
          {
            backgroundColor:
              theme.inputBackground || "rgba(255, 255, 255, 0.08)",
            borderColor: isFocused
              ? Colors.blueAccent
              : theme.inputBorder || "rgba(255, 255, 255, 0.1)",
            color: theme.text,
          },
        ]}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        // Initial content will be set via useEffect
      />
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
  editor: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    minHeight: 250,
    lineHeight: 24,
  },
});

export default WebRichTextEditor;
