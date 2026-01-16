// app/events.jsx
import React, { useState, useContext } from "react";
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
import { ThemeContext } from "../context/ThemeContext";

const { width, height } = Dimensions.get("window");
const isWeb = Platform.OS === "web";

const Events = () => {
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;

  const tabs = [
    {
      id: "programs",
      title: "Programs",
      description: "Upcoming events and union programs",
      icon: "calendar-month",
      route: "/programs",
    },
    {
      id: "birthdays",
      title: "Birthdays",
      description: "Celebrate member birthdays",
      icon: "cake",
      route: "/birthdays",
    },
  ];

  const handleTabPress = (route) => {
    router.push(route);
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText style={styles.subtitle}>
              Union activities and celebrations
            </ThemedText>
          </View>

          {/* Tabs Container */}
          <View style={styles.tabsContainer}>
            {tabs.map((tab, index) => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tabCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    marginBottom: index === tabs.length - 1 ? 0 : 24,
                  },
                ]}
                onPress={() => handleTabPress(tab.route)}
                activeOpacity={0.8}
              >
                <View style={styles.tabContent}>
                  <View style={styles.tabLeft}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: theme.uiBackground },
                      ]}
                    >
                      <MaterialIcons
                        name={tab.icon}
                        size={32}
                        color={theme.text}
                      />
                    </View>
                    <View style={styles.tabTextContainer}>
                      <ThemedText style={styles.tabTitle}>
                        {tab.title}
                      </ThemedText>
                      <ThemedText style={styles.tabDescription}>
                        {tab.description}
                      </ThemedText>
                    </View>
                  </View>
                  <MaterialIcons
                    name="chevron-right"
                    size={24}
                    color={theme.text}
                    style={[styles.tabArrow, { opacity: 0.5 }]}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Empty Space at bottom for better scrolling */}
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

export default Events;

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
    paddingHorizontal: isWeb ? "8%" : 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 48,
    alignItems: "center",
  },
  subtitle: {
    fontSize: isWeb ? 18 : 16,
    opacity: 0.7,
    textAlign: "center",
  },
  tabsContainer: {
    marginBottom: 32,
  },
  tabCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tabLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabTextContainer: {
    flex: 1,
  },
  tabTitle: {
    fontSize: isWeb ? 22 : 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  tabDescription: {
    fontSize: isWeb ? 16 : 14,
    opacity: 0.7,
    lineHeight: 22,
  },
  tabArrow: {
    marginLeft: 16,
  },
  bottomSpacer: {
    height: 60,
  },
});
