// app/studentsunion.jsx
import React from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import FooterNav from "../components/FooterNav";
import { Colors } from "../constants/Colors";

const { width } = Dimensions.get("window");
const isWeb = Platform.OS === "web";

// Calculate responsive card width for mobile 2x2 grid
const CARD_WIDTH = isWeb ? width * 0.22 : (width - 60) / 2; // 20 padding + 20 gap = 40
const CARD_HEIGHT = CARD_WIDTH * 1.2;

const StudentsUnion = () => {
  const tabs = [
    {
      id: "mission",
      title: "Mission Statement",
      icon: "flag",
    },
    {
      id: "vision",
      title: "Vision Statement",
      icon: "remove-red-eye",
    },
    {
      id: "epsuvc",
      title: "EPSU Verse & Theme",
      icon: "menu-book",
    },
    {
      id: "anthem",
      title: "EPSU Anthem",
      icon: "music-note",
    },
  ];

  const navigateToDetail = (tabId) => {
    router.push(tabId);
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <ThemedText style={styles.subtitle}>Code of Conduct</ThemedText>
          </View>

          {/* Tabs Grid  */}
          <View style={styles.tabsGrid}>
            {/* First Row */}
            <View style={styles.tabsRow}>
              <TouchableOpacity
                style={[
                  styles.tabCard,
                  {
                    width: CARD_WIDTH,
                    height: CARD_HEIGHT,
                  },
                ]}
                onPress={() => navigateToDetail(tabs[0].id)}
                activeOpacity={0.8}
              >
                <View style={styles.tabIconContainer}>
                  <MaterialIcons
                    name={tabs[0].icon}
                    size={isWeb ? 48 : 40}
                    color={Colors.malbec}
                  />
                </View>
                <ThemedText style={styles.tabTitle}>{tabs[0].title}</ThemedText>
                <ThemedText style={styles.tabArrow}>→</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabCard,
                  {
                    width: CARD_WIDTH,
                    height: CARD_HEIGHT,
                  },
                ]}
                onPress={() => navigateToDetail(tabs[1].id)}
                activeOpacity={0.8}
              >
                <View style={styles.tabIconContainer}>
                  <MaterialIcons
                    name={tabs[1].icon}
                    size={isWeb ? 48 : 40}
                    color={Colors.malbec}
                  />
                </View>
                <ThemedText style={styles.tabTitle}>{tabs[1].title}</ThemedText>
                <ThemedText style={styles.tabArrow}>→</ThemedText>
              </TouchableOpacity>
            </View>

            {/* Second Row */}
            <View style={styles.tabsRow}>
              <TouchableOpacity
                style={[
                  styles.tabCard,
                  {
                    width: CARD_WIDTH,
                    height: CARD_HEIGHT,
                  },
                ]}
                onPress={() => navigateToDetail(tabs[2].id)}
                activeOpacity={0.8}
              >
                <View style={styles.tabIconContainer}>
                  <MaterialIcons
                    name={tabs[2].icon}
                    size={isWeb ? 48 : 40}
                    color={Colors.malbec}
                  />
                </View>
                <ThemedText style={styles.tabTitle}>{tabs[2].title}</ThemedText>
                <ThemedText style={styles.tabArrow}>→</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabCard,
                  {
                    width: CARD_WIDTH,
                    height: CARD_HEIGHT,
                  },
                ]}
                onPress={() => navigateToDetail(tabs[3].id)}
                activeOpacity={0.8}
              >
                <View style={styles.tabIconContainer}>
                  <MaterialIcons
                    name={tabs[3].icon}
                    size={isWeb ? 48 : 40}
                    color={Colors.malbec}
                  />
                </View>
                <ThemedText style={styles.tabTitle}>{tabs[3].title}</ThemedText>
                <ThemedText style={styles.tabArrow}>→</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      <FooterNav />
    </ThemedView>
  );
};

export default StudentsUnion;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    alignItems: "center",
  },
  header: {
    marginBottom: 40,
    alignItems: "center",
    width: "100%",
  },
  subtitle: {
    fontSize: isWeb ? 18 : 16,
    opacity: 0.7,
    textAlign: "center",
  },
  tabsGrid: {
    width: "100%",
    maxWidth: 800,
    gap: isWeb ? 30 : 20,
  },
  tabsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: isWeb ? 30 : 20,
    marginBottom: isWeb ? 30 : 20,
  },
  tabCard: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    position: "relative",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  tabIconContainer: {
    marginBottom: 12,
  },
  tabTitle: {
    fontSize: isWeb ? 18 : 14,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  tabArrow: {
    position: "absolute",
    bottom: 12,
    right: 12,
    fontSize: isWeb ? 18 : 16,
    fontWeight: "bold",
    opacity: 0.7,
  },
  bottomSpacer: {
    height: 100,
  },
});
