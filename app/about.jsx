import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Animated,
  ActivityIndicator,
} from "react-native";
import React, { useRef, useState, useEffect } from "react";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import FooterNav from "../components/FooterNav";
import SidePanel from "../components/SidePanel";
import { Colors } from "../constants/Colors";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { getAllPermissions } from "../Utils/permissionsHelper";
import CustomAlert from "../components/CustomAlert";

const About = () => {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);

  // Permission states
  const [isAdmin, setIsAdmin] = useState(false);
  const [userPermissions, setUserPermissions] = useState({
    addEditMembers: false,
    collectPayments: false,
    addDues: false,
    addContribution: false,
    addMisc: false,
    addBudget: false,
    makeWithdrawal: false,
    addEvents: false,
    addMinutesReports: false,
  });
  const [loading, setLoading] = useState(true);

  // Alert states
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState("info");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  // Fetch user permissions on mount
  useEffect(() => {
    const fetchUserPermissions = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const userRole = userData.role || "member";
            setIsAdmin(userData.role === "admin" || userData.isAdmin === true);

            // Load permissions for the user
            const permissions = await getAllPermissions(userRole);
            setUserPermissions(permissions);
          }
        }
      } catch (error) {
        console.error("Error fetching user permissions:", error);
        // Set default permissions on error
        setUserPermissions({
          addEditMembers: false,
          collectPayments: false,
          addDues: false,
          addContribution: false,
          addMisc: false,
          addBudget: false,
          makeWithdrawal: false,
          addEvents: false,
          addMinutesReports: false,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserPermissions();
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const showAlert = (title, message, type = "info") => {
    setAlertType(type);
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  // Check if user has permission to collect payments
  const canCollectPayments = () => {
    return isAdmin || userPermissions.collectPayments;
  };

  const allPaymentTiles = [
    {
      id: 1,
      title: "Collect Payments",
      route: "/collect-payments",
      color: Colors.greenAccent,
      requiresPermission: true,
      permissionKey: "collectPayments",
    },
    {
      id: 2,
      title: "Track Payments",
      route: "/track-payments",
      color: Colors.blueAccent,
      requiresPermission: false,
    },
  ];

  // Filter payment tiles based on permissions
  const paymentTiles = allPaymentTiles.filter((tile) => {
    if (!tile.requiresPermission) return true;
    return canCollectPayments();
  });

  const navigationItems = [
    {
      id: 1,
      title: "Members",
      description: "View and manage union members",
      route: "/members",
      icon: "people",
    },
    {
      id: 2,
      title: "Finances",
      description: "View Money Available",
      route: "/finances",
      icon: "wallet",
    },
    {
      id: 3,
      title: "Students Union",
      description: "Union info and code of conduct",
      route: "/studentunion",
      icon: "information-circle",
    },
    {
      id: 4,
      title: "Events & Birthdays",
      description: "Upcoming events and birthdays",
      route: "/events",
      icon: "calendar",
    },
    {
      id: 5,
      title: "Jotter",
      description: "Write Minutes and Reports",
      route: "/jotter",
      icon: "document-text",
    },
  ];

  const handleTilePress = (tile) => {
    // Check permission before navigation
    if (tile.requiresPermission && !canCollectPayments()) {
      showAlert(
        "Permission Denied",
        "You don't have permission to collect payments. Please contact an administrator.",
        "danger"
      );
      return;
    }
    router.push(tile.route);
  };

  const handleItemPress = (route) => {
    router.push(route);
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.blueAccent} />
          <ThemedText style={styles.loadingText}>Loading...</ThemedText>
        </View>
        <FooterNav onMenuPress={() => setIsSidePanelOpen(true)} />
      </ThemedView>
    );
  }

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
        {/* Payment Tiles Section */}
        <Animated.View
          style={[
            styles.tilesContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {paymentTiles.length > 0 ? (
            <View style={styles.tilesGrid}>
              {paymentTiles.map((tile) => (
                <TouchableOpacity
                  key={tile.id}
                  style={[styles.tile, { backgroundColor: tile.color + "15" }]}
                  onPress={() => handleTilePress(tile)}
                  activeOpacity={0.7}
                >
                  <View style={styles.tileContent}>
                    <ThemedText style={styles.tileTitle}>
                      {tile.title}
                    </ThemedText>
                    <Ionicons
                      name="arrow-forward-circle"
                      size={32}
                      color={tile.color}
                      style={styles.tileIcon}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.noPermissionContainer}>
              <Ionicons
                name="lock-closed"
                size={48}
                color={Colors.gray}
                style={{ opacity: 0.5 }}
              />
              <ThemedText style={styles.noPermissionText}>
                No payment actions available
              </ThemedText>
              <ThemedText style={styles.noPermissionSubtext}>
                Contact an administrator for access
              </ThemedText>
            </View>
          )}
        </Animated.View>

        {/* Navigation List Section */}
        <Animated.View
          style={[
            styles.listContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.list}>
            {navigationItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.listItem,
                  index === navigationItems.length - 1 && styles.lastListItem,
                ]}
                onPress={() => handleItemPress(item.route)}
                activeOpacity={0.7}
              >
                <View style={styles.itemContent}>
                  <View style={styles.titleRow}>
                    <ThemedText style={styles.itemTitle}>
                      {item.title}
                    </ThemedText>
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={Colors.text}
                      style={styles.iconBadge}
                    />
                  </View>
                  <ThemedText style={styles.itemDescription}>
                    {item.description}
                  </ThemedText>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={Colors.blueAccent}
                  style={styles.chevron}
                />
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Footer with hamburger menu functionality */}
      <FooterNav onMenuPress={() => setIsSidePanelOpen(true)} />

      {/* Side Panel */}
      <SidePanel
        isOpen={isSidePanelOpen}
        onClose={() => setIsSidePanelOpen(false)}
      />

      {/* Alert */}
      <CustomAlert
        visible={alertVisible}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        autoClose={false}
        onConfirm={() => setAlertVisible(false)}
      />
    </ThemedView>
  );
};

export default About;

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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.6,
  },
  tilesContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  tilesGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  tile: {
    flex: 1,
    height: 120,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  tileContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  tileTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  tileIcon: {
    alignSelf: "flex-end",
  },
  noPermissionContainer: {
    backgroundColor: Colors.uiBackground,
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  noPermissionText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
    opacity: 0.7,
  },
  noPermissionSubtext: {
    fontSize: 13,
    marginTop: 4,
    opacity: 0.5,
  },
  listContainer: {
    paddingHorizontal: 24,
  },
  list: {
    backgroundColor: Colors.uiBackground,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    overflow: "hidden",
    marginHorizontal: 8,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + "20",
    minHeight: 80,
  },
  lastListItem: {
    borderBottomWidth: 0,
  },
  itemContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
  },
  itemDescription: {
    fontSize: 14,
    opacity: 0.6,
    lineHeight: 18,
  },
  iconBadge: {
    opacity: 0.7,
    marginLeft: 12,
  },
  chevron: {
    opacity: 0.5,
    marginLeft: 12,
  },
});
