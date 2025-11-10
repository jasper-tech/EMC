import { StyleSheet, View } from "react-native";
import React from "react";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import FooterNav from "../components/FooterNav";

const Reports = () => {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Reports
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Financial and membership reports will appear here
        </ThemedText>
      </View>
      <FooterNav />
    </ThemedView>
  );
};

export default Reports;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
  },
});
