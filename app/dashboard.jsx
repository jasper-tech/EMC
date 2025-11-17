import { StyleSheet, ScrollView, View, ActivityIndicator } from "react-native";
import React, { useEffect } from "react";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { router } from "expo-router";
import { Colors } from "../constants/Colors";
import ThemedView from "../components/ThemedView";
import StatCard from "../components/StatCard";
import ThemedText from "../components/ThemedText";
import FooterNav from "../components/FooterNav";
import NotificationsCard from "../components/NotificationsCard";
import { useAuth } from "../context/AuthContext";
import RealTimeStats from "../components/RealTimeStats";

const Dashboard = () => {
  const {
    user,
    userProfile,
    pendingVerification,
    loading: authLoading,
  } = useAuth();
  const { statsData, loading: statsLoading } = RealTimeStats();

  // Redirect if not authenticated or not verified
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        // No user signed in - redirect to login
        console.log("No user, redirecting to login");
        router.replace("/");
        return;
      }

      if (pendingVerification) {
        // User exists but not verified - redirect to verification
        console.log("User not verified, redirecting to verification");
        router.replace("/verification-required");
        return;
      }

      // User is authenticated and verified - can stay on dashboard
      console.log("User verified, allowing dashboard access");
    }
  }, [user, pendingVerification, authLoading]);

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

  // Show loading while checking auth status or if redirecting
  if (authLoading || statsLoading || !user || pendingVerification) {
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
  header: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  roleText: {
    fontSize: 16,
    opacity: 0.7,
    color: Colors.blueAccent,
    fontWeight: "600",
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
  },
  statsContainer: {
    flexGrow: 0,
  },
  statsContent: {
    paddingRight: 8,
  },
});
