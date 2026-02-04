import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Modal,
  Animated,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";
import ThemedText from "./ThemedText";
import ThemedView from "./ThemedView";
import { ThemeContext } from "../context/ThemeContext";

export const CustomAlert = ({
  visible,
  type,
  title,
  message,
  confirmText = "OK",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  isLoading = false,
  autoClose = false,
  dismissOnBackdrop = true, // New prop to control backdrop dismissal
}) => {
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;
  const [scaleAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [showCheck, setShowCheck] = useState(false);
  const [displayAlert, setDisplayAlert] = useState(false);
  const [timer, setTimer] = useState(null);

  // Clear any existing timers
  useEffect(() => {
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [timer]);

  useEffect(() => {
    if (visible) {
      setDisplayAlert(true);
      setShowCheck(false);
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);

      // Fade in backdrop
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();

      // Scale in animation for alert
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

      // Auto close for success/failed without buttons
      if (autoClose && (type === "success" || type === "failed")) {
        if (type === "success") {
          const successTimer = setTimeout(() => {
            setShowCheck(true);
            const closeTimer = setTimeout(() => {
              handleClose();
              if (onConfirm) onConfirm();
            }, 1500);
            setTimer(closeTimer);
          }, 800);
          setTimer(successTimer);
        } else if (type === "failed") {
          const failTimer = setTimeout(() => {
            handleClose();
            if (onConfirm) onConfirm();
          }, 2500);
          setTimer(failTimer);
        }
      }
    } else {
      handleClose();
    }
  }, [visible, type, autoClose]);

  const handleClose = () => {
    // Clear any pending timers
    if (timer) {
      clearTimeout(timer);
      setTimer(null);
    }

    // Fade out backdrop
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start();

    // Scale out animation for alert
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setDisplayAlert(false);
    });
  };

  const handleBackdropPress = () => {
    if (dismissOnBackdrop && !isLoading) {
      handleClose();
      if (onCancel) {
        onCancel();
      }
    }
  };

  const handleAlertPress = (event) => {
    // Prevent backdrop press when clicking on alert content
    event.stopPropagation();
  };

  if (!displayAlert) return null;

  const getAlertConfig = () => {
    switch (type) {
      case "success":
        return {
          icon: showCheck ? "check-circle" : "hourglass-empty",
          iconColor: showCheck ? Colors.greenAccent : Colors.blueAccent,
          bgColor: showCheck
            ? Colors.greenAccent + "20"
            : Colors.blueAccent + "20",
          borderColor: Colors.greenAccent,
        };
      case "danger":
        return {
          icon: "warning",
          iconColor: Colors.redAccent,
          bgColor: Colors.redAccent + "20",
          borderColor: Colors.redAccent,
        };
      case "failed":
        return {
          icon: "error",
          iconColor: Colors.redAccent,
          bgColor: Colors.redAccent + "20",
          borderColor: Colors.redAccent,
        };
      case "info":
        return {
          icon: "info",
          iconColor: Colors.blueAccent,
          bgColor: Colors.blueAccent + "20",
          borderColor: Colors.blueAccent,
        };
      default:
        return {
          icon: "info",
          iconColor: Colors.blueAccent,
          bgColor: Colors.blueAccent + "20",
          borderColor: Colors.blueAccent,
        };
    }
  };

  const alertConfig = getAlertConfig();

  return (
    <Modal
      transparent
      visible={displayAlert}
      animationType="none"
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleBackdropPress}
        disabled={!dismissOnBackdrop || isLoading}
      >
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: fadeAnim,
            },
          ]}
        />

        <TouchableOpacity
          style={styles.alertWrapper}
          activeOpacity={1}
          onPress={handleAlertPress}
        >
          <Animated.View
            style={[
              styles.alertContainer,
              {
                transform: [{ scale: scaleAnim }],
                backgroundColor: theme.navBackground,
                borderColor: alertConfig.borderColor,
              },
            ]}
          >
            <View style={styles.alertContent}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: alertConfig.bgColor },
                ]}
              >
                <MaterialIcons
                  name={alertConfig.icon}
                  size={48}
                  color={alertConfig.iconColor}
                />
              </View>

              {title && (
                <ThemedText style={styles.titleText}>{title}</ThemedText>
              )}

              <ThemedText style={styles.messageText}>{message}</ThemedText>

              {/* Buttons for confirmation alerts */}
              {!autoClose && (
                <View style={styles.buttonContainer}>
                  {cancelText && (
                    <TouchableOpacity
                      style={[styles.button, styles.cancelButton]}
                      onPress={onCancel}
                      disabled={isLoading}
                    >
                      <ThemedText style={styles.cancelButtonText}>
                        {cancelText}
                      </ThemedText>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.button,
                      { backgroundColor: alertConfig.iconColor },
                    ]}
                    onPress={onConfirm}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Animated.View>
                        <MaterialIcons
                          name="hourglass-empty"
                          size={20}
                          color="#fff"
                        />
                      </Animated.View>
                    ) : (
                      <ThemedText style={styles.buttonText}>
                        {confirmText}
                      </ThemedText>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Close button for auto-close alerts */}
              {autoClose && (
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                  disabled={isLoading}
                >
                  <ThemedText style={styles.closeButtonText}>
                    Tap here to close
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  alertWrapper: {
    width: "100%",
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  alertContainer: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 2,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  alertContent: {
    padding: 24,
    alignItems: "center",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  titleText: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  messageText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
    opacity: 0.9,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
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
  closeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    padding: 8,
    gap: 6,
  },
  closeButtonText: {
    fontSize: 12,
    opacity: 0.7,
    fontStyle: "italic",
  },
});

export default CustomAlert;
