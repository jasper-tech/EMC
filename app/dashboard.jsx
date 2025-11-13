import { StyleSheet, ScrollView, View, ActivityIndicator } from "react-native";
import React from "react";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { Colors } from "../constants/Colors";
import ThemedView from "../components/ThemedView";
import StatCard from "../components/StatCard";
import ThemedText from "../components/ThemedText";
import FooterNav from "../components/FooterNav";
import NotificationsCard from "../components/NotificationsCard";
import { useAuth } from "../context/AuthContext";
import RealTimeStats from "../components/RealTimeStats";

const Dashboard = () => {
  const { loading: authLoading } = useAuth();
  const { statsData, loading: statsLoading } = RealTimeStats();

  // Swipe gesture to open panel
  const swipeGesture = Gesture.Pan()
    .onEnd((event) => {
      // Only trigger if swiping from left edge (first 50px)
      // and swipe distance is > 100px
      if (event.translationX > 100 && event.velocityX > 0) {
        // This will be handled by AppWrapper's gesture detector
      }
    })
    .runOnJS(true);

  if (authLoading || statsLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.blueAccent} />
        <ThemedText style={styles.loadingText}>Loading dashboard...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <GestureDetector gesture={swipeGesture}>
      <ThemedView style={styles.container}>
        <View style={styles.content}>
          <ThemedText type="title" style={styles.sectionTitle}>
            Quick Stats
          </ThemedText>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.statsContainer}
            contentContainerStyle={styles.statsContent}
          >
            {statsData.map((stat, index) => (
              <StatCard
                key={index}
                icon={stat.icon}
                title={stat.title}
                value={stat.value}
                subtitle={stat.subtitle}
                trend={stat.trend}
              />
            ))}
          </ScrollView>
        </View>

        <NotificationsCard />
        <FooterNav />
      </ThemedView>
    </GestureDetector>
  );
};

export default Dashboard;

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    marginTop: 8,
  },
  statsContainer: {
    flexGrow: 0,
  },
  statsContent: {
    paddingRight: 8,
  },
});
