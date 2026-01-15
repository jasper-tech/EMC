import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  ScrollView,
  ImageBackground,
} from "react-native";
import React, { useState, useEffect } from "react";
import { router } from "expo-router";
import { Colors } from "../constants/Colors";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import FooterNav from "../components/FooterNav";
import BibleVerses from "../components/BibleVerses";
import { useAuth } from "../context/AuthContext";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import SidePanel from "../components/SidePanel";

const { width, height } = Dimensions.get("window");
const isWeb = Platform.OS === "web";

const CARD_WIDTH = isWeb ? Math.min(width * 0.42, 350) : (width - 48) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.1;

const tabBackgrounds = {
  members: require("../assets/dashboardtabpics/unionmembers.jpg"),
  finances: require("../assets/dashboardtabpics/finances.jpg"),
  studentsUnion: require("../assets/dashboardtabpics/epsulogo.jpg"),
  notifications: require("../assets/dashboardtabpics/notification.jpg"),
};

const TabCard = ({
  title,
  onPress,
  color,
  badge,
  backgroundImage,
  isHovered,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={styles.tabWrapper}
    >
      <ThemedView style={styles.tabCard}>
        <ImageBackground
          source={backgroundImage}
          style={styles.backgroundImage}
          imageStyle={styles.backgroundImageStyle}
          resizeMode="cover"
        >
          {/* Dark overlay for better text visibility */}
          <View style={styles.imageOverlay} />

          {/* Content */}
          <View style={styles.tabContent}>
            <ThemedText style={styles.tabTitle}>{title}</ThemedText>

            <View
              style={[
                styles.forwardArrow,
                isHovered || !isWeb
                  ? styles.forwardArrowVisible
                  : styles.forwardArrowHidden,
              ]}
            >
              <ThemedText style={styles.forwardArrowText}>→</ThemedText>
            </View>
          </View>

          {/* Badge */}
          {badge > 0 && (
            <View style={[styles.badge, { backgroundColor: color }]}>
              <ThemedText style={styles.badgeText}>
                {badge > 99 ? "99+" : badge}
              </ThemedText>
            </View>
          )}
        </ImageBackground>
      </ThemedView>
    </TouchableOpacity>
  );
};

const Dashboard = () => {
  const { user, pendingVerification, loading: authLoading } = useAuth();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [hoveredTab, setHoveredTab] = useState(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const currentUserId = user?.uid;

  // Subscribe to unread notifications count
  useEffect(() => {
    if (!currentUserId) return;

    const notificationsRef = collection(db, "notifications");
    const q = query(notificationsRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const unreadCount = snapshot.docs.filter((doc) => {
          const data = doc.data();
          return !data.readBy || !data.readBy.includes(currentUserId);
        }).length;
        setUnreadNotifications(unreadCount);
      },
      (error) => {
        if (error.code !== "permission-denied") {
          console.error("Error fetching notifications:", error);
        }
      }
    );

    return () => unsubscribe();
  }, [currentUserId]);

  // Redirect if not authenticated or not verified
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        console.log("No user, redirecting to login");
        router.replace("/");
        return;
      }

      if (pendingVerification) {
        console.log("User not verified, redirecting to verification");
        router.replace("/verification-required");
        return;
      }

      console.log("User verified, allowing dashboard access");
    }
  }, [user, pendingVerification, authLoading]);

  const tabs = [
    {
      id: "members",
      title: "Members",
      color: Colors.blueAccent,
      route: "/members",
      badge: 0,
      backgroundImage: tabBackgrounds.members,
    },
    {
      id: "finances",
      title: "Finances",
      color: Colors.greenAccent,
      route: "/finances",
      badge: 0,
      backgroundImage: tabBackgrounds.finances,
    },
    {
      id: "students-union",
      title: "Students Union",
      color: Colors.purpleAccent,
      route: "/studentunion",
      badge: 0,
      backgroundImage: tabBackgrounds.studentsUnion,
    },
    {
      id: "notifications",
      title: "Notifications",
      color: Colors.redAccent,
      route: "/notifications",
      badge: unreadNotifications,
      backgroundImage: tabBackgrounds.notifications,
    },
  ];

  const handleTabPress = (route) => {
    router.push(route);
  };

  const renderTabCard = ({ item, index }) => (
    <View
      onMouseEnter={isWeb ? () => setHoveredTab(item.id) : undefined}
      onMouseLeave={isWeb ? () => setHoveredTab(null) : undefined}
      style={[
        styles.tabItemContainer,
        index % 2 === 0 ? styles.leftCard : styles.rightCard,
      ]}
    >
      <TabCard
        title={item.title}
        color={item.color}
        badge={item.badge}
        backgroundImage={item.backgroundImage}
        onPress={() => handleTabPress(item.route)}
        isHovered={hoveredTab === item.id}
      />
    </View>
  );

  // Show loading while checking auth status or if redirecting
  if (authLoading || !user || pendingVerification) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.blueAccent} />
        <ThemedText style={styles.loadingText}>
          {authLoading
            ? "Checking authentication..."
            : pendingVerification
            ? "Redirecting to verification..."
            : "Loading dashboard..."}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        bounces={true}
      >
        <ThemedView style={styles.content}>
          <ThemedView style={styles.header}>
            <ThemedText style={styles.subtitle}>
              What would you like to do today?
            </ThemedText>
          </ThemedView>
          <ThemedView style={styles.tabsGridContainer}>
            <ThemedView style={styles.tabsGrid}>
              {/* First row */}
              <ThemedView style={styles.tabsRow}>
                <ThemedView style={styles.tabCell}>
                  {renderTabCard({ item: tabs[0], index: 0 })}
                </ThemedView>
                <ThemedView style={styles.tabCell}>
                  {renderTabCard({ item: tabs[1], index: 1 })}
                </ThemedView>
              </ThemedView>
              {/* Second row */}
              <ThemedView style={styles.tabsRow}>
                <ThemedView style={styles.tabCell}>
                  {renderTabCard({ item: tabs[2], index: 2 })}
                </ThemedView>
                <ThemedView style={styles.tabCell}>
                  {renderTabCard({ item: tabs[3], index: 3 })}
                </ThemedView>
              </ThemedView>
            </ThemedView>
          </ThemedView>
          <BibleVerses />

          <ThemedView style={styles.bottomSpacer} />
        </ThemedView>
      </ScrollView>

      {/* Footer with hamburger menu functionality */}
      <FooterNav onMenuPress={() => setIsSidePanelOpen(true)} />

      {/* Side Panel */}
      <SidePanel
        isOpen={isSidePanelOpen}
        onClose={() => setIsSidePanelOpen(false)}
      />
    </ThemedView>
  );
};

export default Dashboard;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: "transparent",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    opacity: 0.7,
  },
  content: {
    flex: 1,
    paddingHorizontal: isWeb ? "5%" : 16,
    paddingTop: 24,
    paddingBottom: 40,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  header: {
    marginBottom: isWeb ? 40 : 30,
    alignItems: "center",
    width: "100%",
    maxWidth: 800,
  },
  welcomeText: {
    fontSize: isWeb ? 36 : 30,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: isWeb ? 20 : 16,
    opacity: 0.7,
    textAlign: "center",
  },
  tabsGridContainer: {
    width: "100%",
    alignItems: "center",
  },
  tabsGrid: {
    width: "100%",
    maxWidth: 800,
    gap: isWeb ? 30 : 16,
  },
  tabsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: isWeb ? 30 : 16,
  },
  tabCell: {
    flex: 1,
    minWidth: CARD_WIDTH,
    maxWidth: CARD_WIDTH,
  },
  tabItemContainer: {
    width: "100%",
    height: CARD_HEIGHT,
  },
  leftCard: {
    marginRight: isWeb ? 8 : 4,
  },
  rightCard: {
    marginLeft: isWeb ? 8 : 4,
  },
  tabWrapper: {
    width: "100%",
    height: "100%",
  },
  tabCard: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  backgroundImage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
  },
  backgroundImageStyle: {
    borderRadius: 16,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(23, 23, 23, 0.4)",
    borderRadius: 16,
  },
  tabContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    width: "100%",
  },
  tabTitle: {
    fontSize: isWeb ? 24 : 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
    marginBottom: isWeb ? 12 : 8,
  },
  forwardArrow: {
    paddingHorizontal: isWeb ? 18 : 14,
    paddingVertical: isWeb ? 8 : 6,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  forwardArrowVisible: {
    opacity: 1,
    transform: [{ scale: 1 }],
  },
  forwardArrowHidden: {
    opacity: 0,
    transform: [{ scale: 0.8 }],
  },
  forwardArrowText: {
    fontSize: isWeb ? 20 : 16,
    fontWeight: "bold",
    color: "#000",
  },
  badge: {
    position: "absolute",
    top: 12,
    right: 12,
    minWidth: isWeb ? 32 : 28,
    height: isWeb ? 32 : 28,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: isWeb ? 10 : 8,
    backgroundColor: Colors.redAccent,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    color: "#fff",
    fontSize: isWeb ? 13 : 11,
    fontWeight: "bold",
  },
  bottomSpacer: {
    height: 120,
  },
});
