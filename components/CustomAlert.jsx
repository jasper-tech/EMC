import React, { useState, useEffect } from "react";
import { View, Modal, Animated, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";
import ThemedText from "../components/ThemedText";
import ThemedView from "../components/ThemedView";

const CustomAlert = ({ visible, type, onClose }) => {
  const [scaleAnim] = useState(new Animated.Value(0));
  const [showCheck, setShowCheck] = useState(false);
  const [displayAlert, setDisplayAlert] = useState(false);

  useEffect(() => {
    if (visible) {
      setDisplayAlert(true);
      setShowCheck(false);
      scaleAnim.setValue(0);

      // Scale in animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
      // If success, show loading then checkmark
      if (type === "success") {
        const timer = setTimeout(() => {
          setShowCheck(true);

          // Auto close after showing success
          const closeTimer = setTimeout(() => {
            scaleAnim.setValue(0);
            setDisplayAlert(false);
            onClose();
          }, 1500);

          return () => clearTimeout(closeTimer);
        }, 800);

        return () => clearTimeout(timer);
      } else if (type === "failed") {
        // For failed, auto close after 2.5 seconds
        const timer = setTimeout(() => {
          scaleAnim.setValue(0);
          setDisplayAlert(false);
          onClose();
        }, 2500);

        return () => clearTimeout(timer);
      }
    }
  }, [visible, type, scaleAnim, onClose]);

  if (!displayAlert) return null;

  const getIconConfig = () => {
    if (type === "success") {
      if (showCheck) {
        return {
          icon: "check-circle",
          color: Colors.greenAccent,
          message: "Success!",
        };
      }
      return {
        icon: "hourglass-empty",
        color: Colors.blueAccent,
        message: "Processing...",
      };
    }
    return {
      icon: "error",
      color: Colors.redAccent,
      message: "Failed",
    };
  };

  const { icon, color, message } = getIconConfig();

  return (
    <Modal transparent visible={displayAlert} animationType="none">
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.alertContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <ThemedView style={styles.alertContent}>
            <View
              style={[styles.iconContainer, { backgroundColor: color + "20" }]}
            >
              <MaterialIcons name={icon} size={48} color={color} />
            </View>

            <ThemedText style={styles.messageText}>{message}</ThemedText>
          </ThemedView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertContainer: {
    width: 160,
    borderRadius: 20,
    overflow: "hidden",
  },
  alertContent: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  messageText: {
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.9,
  },
});

export default CustomAlert;
