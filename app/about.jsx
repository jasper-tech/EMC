import { StyleSheet, View, TouchableOpacity, ScrollView } from "react-native";
import React from "react";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons, FontAwesome5, Ionicons } from "@expo/vector-icons";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import FooterNav from "../components/FooterNav";
import { Colors } from "../constants/Colors";

const About = () => {
  const insets = useSafeAreaInsets();

  const navigationCards = [
    {
      id: 1,
      title: "Members",
      description: "View and manage union members",
      icon: "people",
      iconLibrary: "MaterialIcons",
      color: Colors.blueAccent,
      route: "/members",
    },
    {
      id: 2,
      title: "Finances",
      description: "Track payments and financial reports",
      icon: "wallet",
      iconLibrary: "Ionicons",
      color: Colors.greenAccent,
      route: "/finances",
    },
    {
      id: 3,
      title: "Students Union",
      description: "Union information and activities",
      icon: "school",
      iconLibrary: "MaterialIcons",
      color: Colors.purpleAccent,
      route: "/union-info",
    },
    {
      id: 4,
      title: "Events & News",
      description: "Upcoming events and announcements",
      icon: "event",
      iconLibrary: "MaterialIcons",
      color: Colors.yellowAccent,
      route: "/events",
    },
  ];

  const handleCardPress = (route) => {
    router.push(route);
  };

  const renderIcon = (iconLibrary, iconName, color) => {
    switch (iconLibrary) {
      case "MaterialIcons":
        return <MaterialIcons name={iconName} size={32} color={color} />;
      case "Ionicons":
        return <Ionicons name={iconName} size={32} color={color} />;
      case "FontAwesome5":
        return <FontAwesome5 name={iconName} size={32} color={color} />;
      default:
        return <MaterialIcons name="help" size={32} color={color} />;
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <ThemedText style={styles.title}>About EMC Union</ThemedText>
          <ThemedText style={styles.subtitle}>
            This is the EP Students Union management application. Here you can
            manage members, track dues, and generate reports.
          </ThemedText>
        </View> */}

        <View style={styles.cardsContainer}>
          {/* <ThemedText style={styles.sectionTitle}>Quick Access</ThemedText> */}
          <View style={styles.gridContainer}>
            {navigationCards.map((card) => (
              <TouchableOpacity
                key={card.id}
                style={styles.card}
                onPress={() => handleCardPress(card.route)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: card.color + "20" },
                  ]}
                >
                  {renderIcon(card.iconLibrary, card.icon, card.color)}
                </View>
                <View style={styles.cardContent}>
                  <ThemedText style={styles.cardTitle}>{card.title}</ThemedText>
                  <ThemedText style={styles.cardDescription}>
                    {card.description}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons
              name="information-circle"
              size={24}
              color={Colors.blueAccent}
            />
            <ThemedText style={styles.infoText}>
              Tap any card above to navigate to the respective section
            </ThemedText>
          </View>
        </View> */}
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
    paddingBottom: 0,
  },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.7,
  },
  cardsContainer: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  card: {
    width: "48%",
    backgroundColor: Colors.uiBackground,
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },

  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
    opacity: 0.6,
    lineHeight: 16,
  },
  chevron: {
    marginLeft: 8,
  },
  infoSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.blueAccent + "15",
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    opacity: 0.8,
    lineHeight: 18,
  },
});
