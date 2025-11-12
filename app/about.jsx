import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Animated,
} from "react-native";
import React, { useRef } from "react";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import FooterNav from "../components/FooterNav";
import { Colors } from "../constants/Colors";

const About = () => {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
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

  const paymentTiles = [
    {
      id: 1,
      title: "Collect Payments",
      route: "/collect-payments",
      color: Colors.greenAccent,
    },
    {
      id: 2,
      title: "Track Payments",
      route: "/track-payments",
      color: Colors.blueAccent,
    },
  ];

  const navigationItems = [
    {
      id: 1,
      title: "Members",
      description: "View and manage union members",
      route: "/members",
      badge: "Manage",
    },
    {
      id: 2,
      title: "Finances",
      description: "Track payments and financial reports",
      route: "/finances",
      badge: "Track",
    },
    {
      id: 3,
      title: "Students Union",
      description: "Union information and activities",
      route: "/union-info",
      badge: "Info",
    },
    {
      id: 4,
      title: "Events & News",
      description: "Upcoming events and announcements",
      route: "/events",
      badge: "Latest",
    },
  ];

  const handleTilePress = (route) => {
    router.push(route);
  };

  const handleItemPress = (route) => {
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
          <View style={styles.tilesGrid}>
            {paymentTiles.map((tile) => (
              <TouchableOpacity
                key={tile.id}
                style={[styles.tile, { backgroundColor: tile.color + "15" }]}
                onPress={() => handleTilePress(tile.route)}
                activeOpacity={0.7}
              >
                <View style={styles.tileContent}>
                  <ThemedText style={styles.tileTitle}>{tile.title}</ThemedText>
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
                    <View style={styles.badge}>
                      <ThemedText style={styles.badgeText}>
                        {item.badge}
                      </ThemedText>
                    </View>
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
      <FooterNav />
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
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 12,
    backgroundColor: Colors.border + "40",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 0.5,
    opacity: 0.7,
  },
  chevron: {
    opacity: 0.5,
    marginLeft: 12,
  },
});
