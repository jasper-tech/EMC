import { StyleSheet, ScrollView, View } from "react-native";
import React from "react";
import ThemedView from "../components/ThemedView";
import DashboardHeader from "../components/DashboardHeader";
import StatCard from "../components/StatCard";
import ThemedText from "../components/ThemedText";
import FooterNav from "../components/FooterNav";

const Home = () => {
  const statsData = [
    {
      icon: "👥",
      title: "Total Members",
      value: "1,247",
      trend: "+12% vs last month",
    },
    {
      icon: "💰",
      title: "Dues Collected",
      value: "$45,890",
      subtitle: "MTD: $12,340 | YTD: $145,670",
      trend: "+8.5%",
    },
    {
      icon: "📉",
      title: "Outstanding Dues",
      value: "$8,450",
      subtitle: "67 members pending",
      trend: "-15%",
    },
    {
      icon: "🧾",
      title: "Transactions",
      value: "234",
      subtitle: "This month",
      trend: "+22%",
    },
    {
      icon: "📈",
      title: "Growth Rate",
      value: "18.5%",
      subtitle: "vs last period",
      trend: "+5.2%",
    },
  ];

  return (
    <ThemedView style={styles.container}>
      <DashboardHeader unionName="Students Union" userRole="Admin" />

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
      <FooterNav />
    </ThemedView>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
