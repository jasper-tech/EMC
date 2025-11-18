import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Animated,
} from "react-native";
import React, { useRef, useContext } from "react";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import FooterNav from "../components/FooterNav";
import { Colors } from "../constants/Colors";
import { ThemeContext } from "../context/ThemeContext";

const ReportsDashboard = () => {
  const insets = useSafeAreaInsets();
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const reportTabs = [
    {
      id: 1,
      title: "Yearly Reports",
      description: "Comprehensive annual financial reports and analytics",
      route: "/yearly-reports",
      stats: "2022-2024",
    },
    {
      id: 2,
      title: "Financial Logs",
      description: "Detailed transaction history and financial records",
      route: "/financial-logs",
      stats: "All Records",
    },
    {
      id: 3,
      title: "Generate Reports",
      description: "Create and export custom report files",
      route: "/generate-reports",
      stats: "PDF/Excel",
    },
  ];

  const handleTabPress = (route) => {
    router.push(route);
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Tabs Section */}
        <Animated.View
          style={[
            styles.tabsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.tabsGrid}>
            {reportTabs.map((tab, index) => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tab,
                  { borderColor: theme.text + "20" }, // Added border using theme.text
                ]}
                onPress={() => handleTabPress(tab.route)}
                activeOpacity={0.7}
              >
                <View style={styles.tabContent}>
                  {/* Icon and Stats Row */}
                  <View style={styles.tabHeader}>
                    <View style={styles.tabIcon}>
                      <MaterialIcons
                        name={tab.icon}
                        size={32}
                        color={Colors.blueAccent}
                      />
                    </View>
                    <ThemedView style={styles.statsBadge}>
                      <ThemedText style={styles.statsText}>
                        {tab.stats}
                      </ThemedText>
                    </ThemedView>
                  </View>

                  {/* Title and Description */}
                  <View style={styles.tabText}>
                    <ThemedText style={styles.tabTitle}>{tab.title}</ThemedText>
                    <ThemedText style={styles.tabDescription}>
                      {tab.description}
                    </ThemedText>
                  </View>

                  {/* Arrow Icon */}
                  <View style={styles.tabFooter}>
                    <Ionicons
                      name="arrow-forward-circle"
                      size={32}
                      color={Colors.blueAccent}
                      style={styles.arrowIcon}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
      <FooterNav />
    </ThemedView>
  );
};

export default ReportsDashboard;

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
  tabsContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
    marginTop: 20,
  },
  tabsGrid: {
    gap: 16,
  },
  tab: {
    backgroundColor: Colors.uiBackground,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    minHeight: 120,
    borderWidth: 1, // Added border width
  },
  tabContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  tabHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },

  statsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.border + "40",
  },
  statsText: {
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 0.5,
    opacity: 0.7,
  },
  tabText: {
    flex: 1,
    marginBottom: 16,
  },
  tabTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 6,
  },
  tabDescription: {
    fontSize: 14,
    opacity: 0.6,
    lineHeight: 18,
  },
  tabFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  arrowIcon: {
    opacity: 0.8,
  },
});
