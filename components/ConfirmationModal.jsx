import React, { useContext } from "react";
import { View, Modal, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";
import ThemedText from "./ThemedText";
import { ThemeContext } from "../context/ThemeContext";

const ConfirmationModal = ({
  visible,
  onClose,
  onConfirm,
  type = "danger",
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isLoading = false,
}) => {
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;

  const getAlertConfig = () => {
    switch (type) {
      case "danger":
        return {
          icon: "warning",
          iconColor: Colors.redAccent,
          bgColor: Colors.redAccent + "20",
          borderColor: Colors.redAccent,
          buttonBg: Colors.redAccent,
        };
      case "success":
        return {
          icon: "check-circle",
          iconColor: Colors.greenAccent,
          bgColor: Colors.greenAccent + "20",
          borderColor: Colors.greenAccent,
          buttonBg: Colors.greenAccent,
        };
      case "info":
        return {
          icon: "info",
          iconColor: Colors.blueAccent,
          bgColor: Colors.blueAccent + "20",
          borderColor: Colors.blueAccent,
          buttonBg: Colors.blueAccent,
        };
      default:
        return {
          icon: "info",
          iconColor: Colors.blueAccent,
          bgColor: Colors.blueAccent + "20",
          borderColor: Colors.blueAccent,
          buttonBg: Colors.blueAccent,
        };
    }
  };

  const alertConfig = getAlertConfig();

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.navBackground,
              borderColor: alertConfig.borderColor,
            },
          ]}
        >
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: alertConfig.bgColor },
            ]}
          >
            <MaterialIcons
              name={alertConfig.icon}
              size={40}
              color={alertConfig.iconColor}
            />
          </View>

          <ThemedText style={styles.title}>{title}</ThemedText>

          <ThemedText style={styles.message}>{message}</ThemedText>

          <View style={styles.buttons}>
            {cancelText && (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                disabled={isLoading}
              >
                <ThemedText style={styles.cancelButtonText}>
                  {cancelText}
                </ThemedText>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, { backgroundColor: alertConfig.buttonBg }]}
              onPress={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <MaterialIcons name="hourglass-empty" size={20} color="#fff" />
              ) : (
                <ThemedText style={styles.buttonText}>{confirmText}</ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
    opacity: 0.9,
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  cancelButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ConfirmationModal;
