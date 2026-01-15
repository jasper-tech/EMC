// app/viewissues.jsx
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import FooterNav from "../components/FooterNav";
import { Colors } from "../constants/Colors";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

const { width } = Dimensions.get("window");
const isWeb = Platform.OS === "web";

const ViewIssues = () => {
  const [issues, setIssues] = useState([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [resolvingIssue, setResolvingIssue] = useState(null);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    setLoadingIssues(true);
    try {
      const issuesRef = collection(db, "bugReports");
      const q = query(issuesRef, orderBy("timestamp", "desc"));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const issuesList = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate() || new Date(),
            resolvedAt: data.resolvedAt ? data.resolvedAt.toDate() : null,
          };
        });
        setIssues(issuesList);
        setLoadingIssues(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Error fetching issues:", error);
      Alert.alert("Error", "Failed to fetch issues");
      setLoadingIssues(false);
    }
  };

  const handleMarkAsResolved = (issueId) => {
    Alert.alert("Confirm Resolution", "Are you sure this bug has been fixed?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Mark as Resolved",
        style: "destructive",
        onPress: () => markIssueAsResolved(issueId),
      },
    ]);
  };

  const markIssueAsResolved = async (issueId) => {
    try {
      setResolvingIssue(issueId);
      const issueRef = doc(db, "bugReports", issueId);

      await updateDoc(issueRef, {
        resolved: true,
        status: "resolved",
        resolvedAt: new Date(),
      });

      Alert.alert("Success", "Bug marked as resolved!");
    } catch (error) {
      console.error("Error marking issue as resolved:", error);
      Alert.alert("Error", "Failed to mark issue as resolved");
    } finally {
      setResolvingIssue(null);
    }
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    try {
      return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Error formatting date:", date, error);
      return "Invalid Date";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "resolved":
        return Colors.greenAccent;
      case "in-progress":
        return Colors.yellowAccent;
      case "pending":
        return Colors.redAccent;
      default:
        return Colors.gray;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "resolved":
        return "RESOLVED";
      case "in-progress":
        return "IN PROGRESS";
      case "pending":
        return "PENDING";
      default:
        return "UNKNOWN";
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <ThemedText style={styles.subtitle}>
              Bugs reported by users (Admin View)
            </ThemedText>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <ThemedText style={styles.statNumber}>{issues.length}</ThemedText>
              <ThemedText style={styles.statLabel}>Total Reports</ThemedText>
            </View>
            <View style={styles.statCard}>
              <ThemedText style={styles.statNumber}>
                {issues.filter((i) => i.status === "pending").length}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Pending</ThemedText>
            </View>
            <View style={styles.statCard}>
              <ThemedText style={styles.statNumber}>
                {issues.filter((i) => i.status === "resolved").length}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Resolved</ThemedText>
            </View>
          </View>

          {loadingIssues ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.blueAccent} />
              <ThemedText style={styles.loadingText}>
                Loading issues...
              </ThemedText>
            </View>
          ) : issues.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons
                name="check-circle"
                size={48}
                color={Colors.greenAccent}
              />
              <ThemedText style={styles.emptyTitle}>
                No Issues Reported
              </ThemedText>
              <ThemedText style={styles.emptyText}>
                All systems are working properly
              </ThemedText>
            </View>
          ) : (
            <ScrollView style={styles.issuesList}>
              {/* Pending/In-Progress Issues */}
              {issues.filter((issue) => !issue.resolved).length > 0 && (
                <View style={styles.sectionHeader}>
                  <ThemedText style={styles.sectionTitle}>
                    Active Issues (
                    {issues.filter((issue) => !issue.resolved).length})
                  </ThemedText>
                </View>
              )}

              {issues
                .filter((issue) => !issue.resolved)
                .map((issue) => (
                  <View key={issue.id} style={styles.issueCard}>
                    <View style={styles.issueHeader}>
                      <View style={styles.statusContainer}>
                        <View
                          style={[
                            styles.statusDot,
                            { backgroundColor: getStatusColor(issue.status) },
                          ]}
                        />
                        <ThemedText style={styles.statusText}>
                          {getStatusText(issue.status)}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.issueDate}>
                        {formatDate(issue.timestamp)}
                      </ThemedText>
                    </View>

                    <ThemedText style={styles.issueDescription}>
                      {issue.description}
                    </ThemedText>

                    <View style={styles.issueFooter}>
                      <View style={styles.userInfo}>
                        <MaterialIcons
                          name="person"
                          size={14}
                          color={Colors.gray}
                        />
                        <ThemedText style={styles.issueUser}>
                          {issue.userEmail}
                        </ThemedText>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.resolveButton,
                          resolvingIssue === issue.id &&
                            styles.resolveButtonDisabled,
                        ]}
                        onPress={() => handleMarkAsResolved(issue.id)}
                        disabled={resolvingIssue === issue.id}
                      >
                        {resolvingIssue === issue.id ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <MaterialIcons
                              name="check-circle"
                              size={16}
                              color="#FFFFFF"
                            />
                            <ThemedText style={styles.resolveButtonText}>
                              Mark as Resolved
                            </ThemedText>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

              {/* Resolved Issues */}
              {issues.filter((issue) => issue.resolved).length > 0 && (
                <View style={styles.sectionHeader}>
                  <ThemedText style={styles.sectionTitle}>
                    Resolved Issues (
                    {issues.filter((issue) => issue.resolved).length})
                  </ThemedText>
                </View>
              )}

              {issues
                .filter((issue) => issue.resolved)
                .map((issue) => (
                  <View key={issue.id} style={styles.resolvedCard}>
                    <View style={styles.issueHeader}>
                      <View style={styles.statusContainer}>
                        <View
                          style={[
                            styles.statusDot,
                            { backgroundColor: getStatusColor("resolved") },
                          ]}
                        />
                        <ThemedText style={styles.statusText}>
                          RESOLVED
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.issueDate}>
                        {formatDate(issue.timestamp)}
                      </ThemedText>
                    </View>

                    <ThemedText style={styles.issueDescription}>
                      {issue.description}
                    </ThemedText>

                    {/* Update this section */}
                    <View style={styles.resolvedFooter}>
                      <View style={styles.userInfoContainer}>
                        <View style={styles.userInfo}>
                          <MaterialIcons
                            name="person"
                            size={14}
                            color={Colors.gray}
                          />
                          <ThemedText style={styles.issueUser}>
                            {issue.userEmail}
                          </ThemedText>
                        </View>

                        {issue.resolvedAt && (
                          <View style={styles.resolvedInfo}>
                            <MaterialIcons
                              name="schedule"
                              size={12}
                              color={Colors.greenAccent}
                            />
                            <ThemedText style={styles.resolvedAtText}>
                              Resolved: {formatDate(issue.resolvedAt)}
                            </ThemedText>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
            </ScrollView>
          )}

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      <FooterNav />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
    marginBottom: 24,
  },
  title: {
    fontSize: isWeb ? 32 : 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: isWeb ? 16 : 14,
    opacity: 0.7,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
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
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: "center",
  },
  issuesList: {
    maxHeight: isWeb ? 600 : 500,
  },
  sectionHeader: {
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: isWeb ? 18 : 16,
    fontWeight: "bold",
    opacity: 0.9,
  },
  issueCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  resolvedCard: {
    backgroundColor: "rgba(76, 175, 80, 0.05)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.greenAccent + "30",
  },
  issueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  issueDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  issueDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  issueFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  issueUser: {
    fontSize: 12,
    opacity: 0.7,
  },
  resolveButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.greenAccent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  resolveButtonDisabled: {
    opacity: 0.6,
  },
  resolveButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  resolvedInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.greenAccent + "20",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  resolvedAtText: {
    fontSize: 10,
    fontWeight: "bold",
    color: Colors.greenAccent,
  },
  bottomSpacer: {
    height: 100,
  },
  resolvedFooter: {
    marginTop: 8,
  },
  userInfoContainer: {
    gap: 8,
  },
});

export default ViewIssues;
