import { StyleSheet, View } from "react-native";
import React from "react";
import { Link } from "expo-router";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import FooterNav from "../components/FooterNav";

const About = () => {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          About EMC Union
        </ThemedText>
        <ThemedText style={styles.text}>
          This is the EP Students Union management application. Here you can
          manage members, track dues, and generate reports.
        </ThemedText>
      </View>
      <FooterNav />
    </ThemedView>
  );
};

export default About;

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
    marginBottom: 20,
  },
  text: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
});
