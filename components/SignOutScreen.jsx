import React, { useEffect } from "react";
import { View, StyleSheet, ActivityIndicator, Modal } from "react-native";
import { Colors } from "../constants/Colors";
import ThemedView from "./ThemedView";
import ThemedText from "./ThemedText";

const SigningOutScreen = ({ onSignOutComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onSignOutComplete();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onSignOutComplete]);

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View style={styles.container}>
        <ThemedView style={styles.content}>
          <ActivityIndicator size="large" color={Colors.blueAccent} />
          {/* <ThemedText style={styles.title}>Signing Out</ThemedText> */}
          <ThemedText style={styles.subtitle}>signing you out...</ThemedText>
        </ThemedView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  content: {
    alignItems: "center",
    padding: 40,
    borderRadius: 20,
    margin: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
    lineHeight: 22,
  },
});

export default SigningOutScreen;
