import React, { useState, useEffect, useContext } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import FooterNav from "../components/FooterNav";
import { Colors } from "../constants/Colors";
import { ThemeContext } from "../context/ThemeContext";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

const { width } = Dimensions.get("window");
const isWeb = Platform.OS === "web";

const ViewPrograms = () => {
  const router = useRouter();
  const [programs, setPrograms] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;

  useEffect(() => {
    const programsRef = collection(db, "programs");
    const q = query(programsRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const programsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        // Sort by date (newest first)
        const sortedPrograms = programsList.sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );
        setPrograms(sortedPrograms);
        setLoadingPrograms(false);
      },
      (error) => {
        console.error("Error fetching programs:", error);
        setLoadingPrograms(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText style={styles.subtitle}>Scheduled programs</ThemedText>
          </View>

          {/* Programs List */}
          {loadingPrograms ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.text} />
              <ThemedText style={styles.loadingText}>
                Loading programs...
              </ThemedText>
            </View>
          ) : programs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons
                name="event-busy"
                size={64}
                color={theme.text}
                style={{ opacity: 0.3 }}
              />
              <ThemedText style={styles.emptyText}>
                No programs scheduled yet
              </ThemedText>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push("/addprogram")}
              >
                <MaterialIcons name="add" size={20} color="#fff" />
                <ThemedText style={styles.addButtonText}>
                  Add First Program
                </ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.programsList}>
              {programs.map((program) => (
                <View
                  key={program.id}
                  style={[styles.programCard, { borderColor: theme.border }]}
                >
                  <View style={styles.programHeader}>
                    <View style={styles.dateBadge}>
                      <MaterialIcons
                        name="calendar-today"
                        size={14}
                        color="#fff"
                      />
                      <ThemedText style={styles.dateBadgeText}>
                        {formatDate(program.date)}
                      </ThemedText>
                    </View>
                    {program.time && (
                      <ThemedText style={styles.timeText}>
                        {program.time}
                      </ThemedText>
                    )}
                  </View>

                  <ThemedText style={styles.programTitle}>
                    {program.title}
                  </ThemedText>

                  {program.location && (
                    <View style={styles.detailRow}>
                      <MaterialIcons
                        name="location-on"
                        size={16}
                        color={theme.text}
                        style={{ opacity: 0.6 }}
                      />
                      <ThemedText style={styles.detailText}>
                        {program.location}
                      </ThemedText>
                    </View>
                  )}

                  {program.organizer && (
                    <View style={styles.detailRow}>
                      <MaterialIcons
                        name="person"
                        size={16}
                        color={theme.text}
                        style={{ opacity: 0.6 }}
                      />
                      <ThemedText style={styles.detailText}>
                        Organized by: {program.organizer}
                      </ThemedText>
                    </View>
                  )}

                  {program.description && (
                    <ThemedText style={styles.description}>
                      {program.description}
                    </ThemedText>
                  )}
                </View>
              ))}
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      <FooterNav />
    </ThemedView>
  );
};

export default ViewPrograms;

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
  content: {
    flex: 1,
    paddingHorizontal: isWeb ? "8%" : 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    marginBottom: 32,
    alignItems: "center",
  },
  title: {
    fontSize: isWeb ? 32 : 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: isWeb ? 16 : 14,
    opacity: 0.7,
    textAlign: "center",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    opacity: 0.7,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
    opacity: 0.5,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.blueAccent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  programsList: {
    flex: 1,
  },
  programCard: {
    backgroundColor: Colors.uiBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  programHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.blueAccent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  dateBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  timeText: {
    fontSize: 14,
    opacity: 0.7,
  },
  programTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    opacity: 0.8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.7,
    marginTop: 8,
  },
  bottomSpacer: {
    height: 40,
  },
});
