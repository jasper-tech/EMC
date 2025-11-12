import { StyleSheet, ScrollView, View, ActivityIndicator } from "react-native";
import React, { useState } from "react";
import { MaterialIcons, FontAwesome, Ionicons } from "@expo/vector-icons";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { Colors } from "../constants/Colors";
import ThemedView from "../components/ThemedView";
import StatCard from "../components/StatCard";
import ThemedText from "../components/ThemedText";
import FooterNav from "../components/FooterNav";
import NotificationsCard from "../components/NotificationsCard";
import SidePanel from "../components/SidePanel";
import { useAuth } from "../context/AuthContext";

const Dashboard = () => {
  const { user, userProfile, loading } = useAuth();
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const statsData = [
    {
      icon: <MaterialIcons name="group" size={28} color={Colors.blueAccent} />,
      title: "Total Members",
      value: "1,247",
      trend: "+12% vs last month",
    },
    {
      icon: <FontAwesome name="money" size={28} color={Colors.greenAccent} />,
      title: "Dues Collected",
      value: "$45,890",
      subtitle: "MTD: $12,340 | YTD: $145,670",
      trend: "+8.5%",
    },
    {
      icon: (
        <MaterialIcons
          name="report-problem"
          size={28}
          color={Colors.redAccent}
        />
      ),
      title: "Outstanding Dues",
      value: "$8,450",
      subtitle: "67 members pending",
      trend: "-15%",
    },
    {
      icon: <Ionicons name="receipt" size={28} color={Colors.yellowAccent} />,
      title: "Transactions",
      value: "234",
      subtitle: "This month",
      trend: "+22%",
    },
    {
      icon: (
        <MaterialIcons name="trending-up" size={28} color={Colors.tealAccent} />
      ),
      title: "Growth Rate",
      value: "18.5%",
      subtitle: "vs last period",
      trend: "+5.2%",
    },
  ];

  // Swipe gesture to open panel
  const swipeGesture = Gesture.Pan()
    .onEnd((event) => {
      // Swipe from left edge to right
      if (event.translationX > 100 && event.velocityX > 0) {
        setIsPanelOpen(true);
      }
    })
    .runOnJS(true);

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.blueAccent} />
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

        {/* Side Panel */}
        <SidePanel
          userName={
            userProfile?.fullName || user?.email?.split("@")[0] || "User"
          }
          userRole={userProfile?.role || "Member"}
          userAvatar={userProfile?.photoURL}
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
        />
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
