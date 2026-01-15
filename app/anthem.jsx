import React from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Dimensions,
  Platform,
} from "react-native";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import FooterNav from "../components/FooterNav";
import { Colors } from "../constants/Colors";

const { width, height } = Dimensions.get("window");
const isWeb = Platform.OS === "web";

const AnthemPage = () => {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.centerContainer}>
          <View style={styles.anthemCard}>
            <ThemedText style={styles.boldText}>
              "Living to please and serve God is my foremost duty as a member of
              EPSU.
            </ThemedText>

            <ThemedText style={styles.anthemText}>
              I promise to live solely by His word and present Him to others
              through a decent way of life. And to avail myself whenever duty
              calls to always do away with unwholesome habits that retard
              growth. Lord! Help me to present my body as a living sacrifice to
              You and
            </ThemedText>

            <ThemedText style={styles.boldText}>
              always live at peace with all"
            </ThemedText>
          </View>

          <View style={styles.citationContainer}>
            <ThemedText style={styles.citationLabel}>Source:</ThemedText>
            <ThemedText style={styles.citationText}>
              EPSU Constitution
            </ThemedText>
          </View>
        </View>
      </View>

      <FooterNav />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  content: {
    flex: 1,
    paddingHorizontal: isWeb ? "10%" : 20,
    paddingTop: 24,
    paddingBottom: 40,
    justifyContent: "center",
  },
  centerContainer: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  anthemCard: {
    width: "100%",
    maxWidth: 600,
    padding: isWeb ? 40 : 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.malbec,
    backgroundColor: "rgba(123, 3, 35, 0.05)",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    alignSelf: "center",
  },
  boldText: {
    fontSize: isWeb ? 20 : 18,
    lineHeight: isWeb ? 32 : 28,
    textAlign: "center",
    fontWeight: "bold",
    marginBottom: 16,
    fontStyle: "italic",
  },
  anthemText: {
    fontSize: isWeb ? 18 : 16,
    lineHeight: isWeb ? 28 : 24,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 16,
  },
  citationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
  },
  citationLabel: {
    fontSize: isWeb ? 14 : 12,
    fontWeight: "600",
    marginRight: 8,
    opacity: 0.8,
  },
  citationText: {
    fontSize: isWeb ? 14 : 12,
    fontStyle: "italic",
  },
});

export default AnthemPage;
