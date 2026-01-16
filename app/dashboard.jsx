import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  ScrollView,
  ImageBackground,
  Animated,
  Alert,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { router } from "expo-router";
import { Colors } from "../constants/Colors";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import FooterNav from "../components/FooterNav";
import BibleVerses from "../components/BibleVerses";
import { useAuth } from "../context/AuthContext";
import {
  collection,
  query,
  onSnapshot,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";
import SidePanel from "../components/SidePanel";
import { MaterialIcons } from "@expo/vector-icons";

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

// Upcoming Program Banner Component
const UpcomingProgramBanner = ({ program, isVisible, onClose, onPress }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isVisible) {
      // Pulsing animation for the info icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Slide in and fade in animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Fade out and slide up animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -50,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  if (!program || !isVisible) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  return (
    <Animated.View
      style={[
        styles.upcomingBanner,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Pulsing info icon - Rounded */}
      <Animated.View
        style={[
          styles.infoIconContainer,
          {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <MaterialIcons name="info" size={20} color={Colors.blueAccent} />
      </Animated.View>

      {/* Banner content */}
      <TouchableOpacity
        style={styles.bannerContent}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.bannerTextContainer}>
          <View style={styles.bannerHeader}>
            <ThemedText style={styles.bannerTitle}>Upcoming Program</ThemedText>
          </View>
          <ThemedText style={styles.programTitle} numberOfLines={1}>
            {program.title}
          </ThemedText>
          <View style={styles.programDetails}>
            {/* Date with themed text */}
            <View style={styles.detailItem}>
              <MaterialIcons name="calendar-today" size={14} color="#666" />
              <ThemedText style={styles.detailText}>
                {formatDate(program.date)}
              </ThemedText>
            </View>

            {/* Time with themed text */}
            {program.time && (
              <View style={styles.detailItem}>
                <MaterialIcons name="access-time" size={14} color="#666" />
                <ThemedText style={styles.detailText}>
                  {program.time}
                </ThemedText>
              </View>
            )}

            {/* Location with themed text */}
            {program.location && (
              <View style={styles.detailItem}>
                <MaterialIcons name="location-on" size={14} color="#666" />
                <ThemedText style={styles.detailText} numberOfLines={1}>
                  {program.location}
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="close" size={18} color="#666" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
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
  const [upcomingProgram, setUpcomingProgram] = useState(null);
  const [showUpcomingBanner, setShowUpcomingBanner] = useState(true);
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

  useEffect(() => {
    const programsRef = collection(db, "programs");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const q = query(
      programsRef,
      where("date", ">=", today.toISOString().split("T")[0]),
      orderBy("date", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const upcomingPrograms = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((program) => {
            const programDate = new Date(program.date);
            return programDate >= today;
          });

        // Get the earliest upcoming program
        if (upcomingPrograms.length > 0) {
          setUpcomingProgram(upcomingPrograms[0]);
          setShowUpcomingBanner(true);
        } else {
          setUpcomingProgram(null);
        }
      },
      (error) => {
        console.error("Error fetching upcoming programs:", error);
      }
    );

    return () => unsubscribe();
  }, []);

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

  const handleProgramBannerPress = () => {
    if (upcomingProgram) {
      router.push("/viewprograms");
    }
  };

  const handleCloseBanner = () => {
    setShowUpcomingBanner(false);
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
          {/* Upcoming Program Banner */}
          <UpcomingProgramBanner
            program={upcomingProgram}
            isVisible={showUpcomingBanner && !!upcomingProgram}
            onClose={handleCloseBanner}
            onPress={handleProgramBannerPress}
          />

          <ThemedView style={styles.header}>
            {/* <ThemedText style={styles.subtitle}>
              What would you like to do today?
            </ThemedText> */}
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
  subtitle: {
    fontSize: isWeb ? 20 : 16,
    opacity: 0.7,
    textAlign: "center",
  },
  // Upcoming Program Banner Styles
  upcomingBanner: {
    width: "100%",
    maxWidth: 800,
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.blueAccent + "30",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
  },
  infoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.blueAccent + "15",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
    borderWidth: 1,
    borderColor: Colors.blueAccent + "30",
  },
  bannerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 6,
  },
  bannerTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.blueAccent,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  programTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  programDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "center",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: Colors.blueAccent,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  // Existing styles remain the same
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
