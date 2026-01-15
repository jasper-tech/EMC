// app/studentsunion/epsuvc.jsx
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

const EPSUVC = () => {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.centerContainer}>
          <View style={styles.verseCard}>
            <ThemedText style={styles.verseText}>
              "If it is possible, as far as it depends on you, live at peace
              with everyone."
            </ThemedText>
            <ThemedText style={styles.reference}>
              — Romans 12:18 (NIV)
            </ThemedText>
          </View>

          <View style={styles.themeCard}>
            <ThemedText style={styles.themeText}>AT PEACE WITH ALL</ThemedText>
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
  scrollView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    minHeight: height,
  },
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
    gap: 24,
  },
  verseCard: {
    width: "100%",
    maxWidth: 600,
    padding: isWeb ? 40 : 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.malbec,
    backgroundColor: "rgba(123, 3, 35, 0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    alignSelf: "center",
  },
  verseText: {
    fontSize: isWeb ? 20 : 18,
    lineHeight: isWeb ? 32 : 28,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 16,
  },
  reference: {
    fontSize: isWeb ? 16 : 14,
    textAlign: "center",
    fontWeight: "600",
    color: Colors.malbec,
  },
  themeCard: {
    width: "100%",
    maxWidth: 600,
    padding: isWeb ? 32 : 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.malbec,
    backgroundColor: "rgba(123, 3, 35, 0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    alignSelf: "center",
  },
  themeText: {
    fontSize: isWeb ? 24 : 20,
    lineHeight: isWeb ? 32 : 28,
    textAlign: "center",
    fontWeight: "bold",
    color: Colors.malbec,
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

export default EPSUVC;
