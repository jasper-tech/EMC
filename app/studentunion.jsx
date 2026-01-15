// app/studentsunion.jsx
import React, { useState, useEffect } from "react";
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
import SidePanel from "../components/SidePanel";
import { Colors } from "../constants/Colors";

const { width, height } = Dimensions.get("window");
const isWeb = Platform.OS === "web";

const StudentsUnion = () => {
  const [screenWidth, setScreenWidth] = useState(width);
  const [screenHeight, setScreenHeight] = useState(height);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);

  useEffect(() => {
    const updateDimensions = () => {
      setScreenWidth(Dimensions.get("window").width);
      setScreenHeight(Dimensions.get("window").height);
    };

    Dimensions.addEventListener("change", updateDimensions);

    return () => {
      Dimensions.removeEventListener?.("change", updateDimensions);
    };
  }, []);

  // For native mobile: Always use 2x2 grid
  // For web: Determine layout based on screen size
  const isNativeMobile = !isWeb;

  // Web responsive calculations
  const isWebSmallScreen = isWeb && screenWidth < 768;
  const isWebMediumScreen = isWeb && screenWidth >= 768 && screenWidth < 1024;
  const isWebLargeScreen = isWeb && screenWidth >= 1024;

  // For native mobile: fixed 2x2 grid
  // For web: responsive layout
  const getCardWidth = () => {
    if (isNativeMobile) {
      // Native mobile: 2x2 grid calculation
      return (screenWidth - 60) / 2; // 20 padding on each side + 20 gap = 60
    } else if (isWebSmallScreen) {
      // Web mobile: single column
      return screenWidth - 40;
    } else if (isWebMediumScreen) {
      // Web tablet: 2 columns
      return (screenWidth - 60) / 2;
    } else {
      // Web desktop: fixed max width
      return Math.min(screenWidth * 0.22, 200);
    }
  };

  const getCardHeight = () => {
    const cardWidth = getCardWidth();
    if (isNativeMobile) {
      return cardWidth * 1.2; // Native mobile aspect ratio
    } else if (isWebSmallScreen) {
      return cardWidth * 0.8; // Web mobile: wider aspect ratio
    } else {
      return cardWidth * 1.2; // Web tablet/desktop
    }
  };

  const getGridStyle = () => {
    if (isNativeMobile) {
      return "grid-2x2"; // Native mobile always 2x2
    } else if (isWebSmallScreen) {
      return "grid-1x4"; // Web mobile: single column
    } else {
      return "grid-2x2"; // Web tablet/desktop: 2 columns
    }
  };

  const getFontSize = (baseSize) => {
    if (isNativeMobile) {
      return baseSize; // Native mobile uses base size
    } else if (isWebSmallScreen) {
      return baseSize * 0.9; // Web mobile slightly smaller
    } else if (isWebMediumScreen) {
      return baseSize; // Web tablet
    } else {
      return baseSize; // Web desktop
    }
  };

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

  const cardWidth = getCardWidth();
  const cardHeight = getCardHeight();
  const gridStyle = getGridStyle();

  // Native mobile: Always 2x2 grid (2 rows of 2 columns)
  // Web small: Single column (4 rows of 1 column)
  // Web medium/large: 2x2 grid
  const renderGrid = () => {
    if (gridStyle === "grid-1x4") {
      // Single column for web mobile
      return (
        <View style={styles.singleColumnContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabCard,
                styles.singleColumnCard,
                {
                  width: cardWidth,
                  height: cardHeight,
                  marginBottom: 16,
                },
              ]}
              onPress={() => navigateToDetail(tab.id)}
              activeOpacity={0.8}
            >
              <View style={styles.tabIconContainer}>
                <MaterialIcons
                  name={tab.icon}
                  size={36}
                  color={Colors.malbec}
                />
              </View>
              <ThemedText
                style={[styles.tabTitle, { fontSize: getFontSize(16) }]}
              >
                {tab.title}
              </ThemedText>
              <ThemedText style={styles.tabArrow}>→</ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      );
    } else {
      // 2x2 grid for native mobile and web tablet/desktop
      return (
        <View style={styles.gridContainer}>
          {/* First Row */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[
                styles.tabCard,
                styles.gridCard,
                {
                  width: cardWidth,
                  height: cardHeight,
                  marginRight: isNativeMobile ? 20 : 10,
                },
              ]}
              onPress={() => navigateToDetail(tabs[0].id)}
              activeOpacity={0.8}
            >
              <View style={styles.tabIconContainer}>
                <MaterialIcons
                  name={tabs[0].icon}
                  size={isNativeMobile ? 40 : isWeb ? 48 : 40}
                  color={Colors.malbec}
                />
              </View>
              <ThemedText
                style={[
                  styles.tabTitle,
                  { fontSize: getFontSize(isNativeMobile ? 14 : 18) },
                ]}
              >
                {tabs[0].title}
              </ThemedText>
              <ThemedText style={styles.tabArrow}>→</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabCard,
                styles.gridCard,
                {
                  width: cardWidth,
                  height: cardHeight,
                  marginLeft: isNativeMobile ? 20 : 10,
                },
              ]}
              onPress={() => navigateToDetail(tabs[1].id)}
              activeOpacity={0.8}
            >
              <View style={styles.tabIconContainer}>
                <MaterialIcons
                  name={tabs[1].icon}
                  size={isNativeMobile ? 40 : isWeb ? 48 : 40}
                  color={Colors.malbec}
                />
              </View>
              <ThemedText
                style={[
                  styles.tabTitle,
                  { fontSize: getFontSize(isNativeMobile ? 14 : 18) },
                ]}
              >
                {tabs[1].title}
              </ThemedText>
              <ThemedText style={styles.tabArrow}>→</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Second Row */}
          <View
            style={[styles.tabsRow, { marginTop: isNativeMobile ? 20 : 30 }]}
          >
            <TouchableOpacity
              style={[
                styles.tabCard,
                styles.gridCard,
                {
                  width: cardWidth,
                  height: cardHeight,
                  marginRight: isNativeMobile ? 20 : 10,
                },
              ]}
              onPress={() => navigateToDetail(tabs[2].id)}
              activeOpacity={0.8}
            >
              <View style={styles.tabIconContainer}>
                <MaterialIcons
                  name={tabs[2].icon}
                  size={isNativeMobile ? 40 : isWeb ? 48 : 40}
                  color={Colors.malbec}
                />
              </View>
              <ThemedText
                style={[
                  styles.tabTitle,
                  { fontSize: getFontSize(isNativeMobile ? 14 : 18) },
                ]}
              >
                {tabs[2].title}
              </ThemedText>
              <ThemedText style={styles.tabArrow}>→</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabCard,
                styles.gridCard,
                {
                  width: cardWidth,
                  height: cardHeight,
                  marginLeft: isNativeMobile ? 20 : 10,
                },
              ]}
              onPress={() => navigateToDetail(tabs[3].id)}
              activeOpacity={0.8}
            >
              <View style={styles.tabIconContainer}>
                <MaterialIcons
                  name={tabs[3].icon}
                  size={isNativeMobile ? 40 : isWeb ? 48 : 40}
                  color={Colors.malbec}
                />
              </View>
              <ThemedText
                style={[
                  styles.tabTitle,
                  { fontSize: getFontSize(isNativeMobile ? 14 : 18) },
                ]}
              >
                {tabs[3].title}
              </ThemedText>
              <ThemedText style={styles.tabArrow}>→</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
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
            <ThemedText
              style={[
                styles.subtitle,
                { fontSize: getFontSize(isWeb ? 18 : 16) },
              ]}
            >
              Code of Conduct
            </ThemedText>
          </View>

          {/* Render the appropriate grid */}
          {renderGrid()}

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      {/* Footer with hamburger menu */}
      <FooterNav onMenuPress={() => setIsSidePanelOpen(true)} />

      {/* Side Panel */}
      <SidePanel
        isOpen={isSidePanelOpen}
        onClose={() => setIsSidePanelOpen(false)}
      />
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
    paddingBottom: 20,
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
    opacity: 0.7,
    textAlign: "center",
  },
  // Grid layout for native mobile and web tablet/desktop
  gridContainer: {
    width: "100%",
    maxWidth: 800,
    alignItems: "center",
  },
  tabsRow: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
  },
  // Single column layout for web mobile
  singleColumnContainer: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    paddingHorizontal: 10,
  },
  singleColumnCard: {
    width: "100%",
    maxWidth: 400,
  },
  gridCard: {
    // Default grid card styles
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
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  tabArrow: {
    position: "absolute",
    bottom: 12,
    right: 12,
    fontSize: 16,
    fontWeight: "bold",
    opacity: 0.7,
  },
  bottomSpacer: {
    height: 100,
  },
});
