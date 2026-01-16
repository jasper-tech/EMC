import React, { useState, useEffect, useContext, useMemo } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import FooterNav from "../components/FooterNav";
import { Colors } from "../constants/Colors";
import { ThemeContext } from "../context/ThemeContext";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

const { width } = Dimensions.get("window");
const isWeb = Platform.OS === "web";

const calculateAge = (birthDateString) => {
  if (!birthDateString) return null;
  try {
    const birthDate = new Date(birthDateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  } catch (error) {
    console.error("Error calculating age:", error);
    return null;
  }
};

const Birthday = () => {
  const router = useRouter();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;

  useEffect(() => {
    const membersRef = collection(db, "members");
    const q = query(membersRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const membersList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Filter members who have birth dates
        const membersWithBirthdays = membersList.filter(
          (member) => member.birthDate && member.birthDate.trim() !== ""
        );

        setMembers(membersWithBirthdays);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching members:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Group members by birth month
  const membersByMonth = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      monthNumber: i + 1,
      monthName: new Date(2000, i, 1).toLocaleDateString("en-US", {
        month: "long",
      }),
      members: [],
    }));

    // Filter by search query
    const filteredMembers =
      searchQuery.trim() === ""
        ? members
        : members.filter((member) => {
            const searchLower = searchQuery.toLowerCase();
            return (
              member.fullname?.toLowerCase().includes(searchLower) ||
              member.phone?.includes(searchQuery) ||
              member.address?.toLowerCase().includes(searchLower)
            );
          });

    filteredMembers.forEach((member) => {
      try {
        const birthDate = new Date(member.birthDate);
        const month = birthDate.getMonth();
        const day = birthDate.getDate();
        const age = calculateAge(member.birthDate);

        months[month].members.push({
          ...member,
          birthDay: day,
          age: age || 0,
        });
      } catch (error) {
        console.error("Error processing birthday:", error, member);
      }
    });

    // Sort members within each month by day (1-31)
    months.forEach((month) => {
      month.members.sort((a, b) => a.birthDay - b.birthDay);
    });

    // Remove empty months
    return months.filter((month) => month.members.length > 0);
  }, [members, searchQuery]);

  const formatBirthday = (birthDateString) => {
    if (!birthDateString) return "";
    try {
      const date = new Date(birthDateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return "";
    }
  };

  const getTodayBirthdays = () => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    return members.filter((member) => {
      try {
        const birthDate = new Date(member.birthDate);
        return (
          birthDate.getMonth() + 1 === currentMonth &&
          birthDate.getDate() === currentDay
        );
      } catch (error) {
        return false;
      }
    });
  };

  const handleBack = () => {
    router.back();
  };

  const todayBirthdays = getTodayBirthdays();

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.blueAccent} />
          <ThemedText style={styles.loadingText}>
            Loading birthdays...
          </ThemedText>
        </View>
        <FooterNav />
      </ThemedView>
    );
  }

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
            <ThemedText style={styles.subtitle}>
              Union members' birthdays
            </ThemedText>
          </View>

          {/* Today's Birthdays Section */}
          {todayBirthdays.length > 0 && (
            <View style={styles.todaySection}>
              <View style={styles.sectionHeader}>
                <MaterialIcons
                  name="celebration"
                  size={24}
                  color={Colors.greenAccent}
                />
                <ThemedText style={styles.sectionTitle}>
                  Celebrating Today
                </ThemedText>
              </View>
              <View style={styles.todayList}>
                {todayBirthdays.map((member) => (
                  <View
                    key={member.id}
                    style={[
                      styles.todayCard,
                      { backgroundColor: Colors.greenAccent + "15" },
                    ]}
                  >
                    <View style={styles.todayCardContent}>
                      {member.profileImg ? (
                        <Image
                          source={{ uri: member.profileImg }}
                          style={styles.todayImage}
                        />
                      ) : (
                        <View style={styles.todayAvatar}>
                          <Ionicons
                            name="person"
                            size={20}
                            color={Colors.greenAccent}
                          />
                        </View>
                      )}
                      <View style={styles.todayInfo}>
                        <ThemedText style={styles.todayName}>
                          {member.fullname}
                        </ThemedText>
                        {member.age && (
                          <ThemedText style={styles.todayAge}>
                            Turns {member.age + 1} today!
                          </ThemedText>
                        )}
                      </View>
                      <MaterialIcons
                        name="cake"
                        size={24}
                        color={Colors.greenAccent}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Search */}
          <View
            style={[
              styles.searchContainer,
              { backgroundColor: theme.uiBackground },
            ]}
          >
            <Ionicons name="search" size={20} color={Colors.blueAccent} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search members..."
              placeholderTextColor={theme.text + "60"}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery !== "" && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color={theme.text} />
              </TouchableOpacity>
            )}
          </View>

          {/* Month Sections */}
          {membersByMonth.length > 0 ? (
            <View style={styles.monthsContainer}>
              {membersByMonth.map((monthData) => (
                <View key={monthData.monthNumber} style={styles.monthSection}>
                  <View style={styles.monthHeader}>
                    <ThemedText style={styles.monthTitle}>
                      {monthData.monthName}
                    </ThemedText>
                    <View style={styles.memberCount}>
                      <ThemedText style={styles.memberCountText}>
                        {monthData.members.length}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.membersList}>
                    {monthData.members.map((member) => (
                      <View key={member.id} style={styles.memberCard}>
                        <View style={styles.memberRow}>
                          {member.profileImg ? (
                            <Image
                              source={{ uri: member.profileImg }}
                              style={styles.memberImage}
                            />
                          ) : (
                            <View style={styles.memberAvatar}>
                              <Ionicons
                                name="person-outline"
                                size={18}
                                color={theme.text}
                              />
                            </View>
                          )}

                          <View style={styles.memberInfo}>
                            <ThemedText style={styles.memberName}>
                              {member.fullname}
                            </ThemedText>
                            <View style={styles.birthdayInfo}>
                              <MaterialIcons
                                name="cake"
                                size={14}
                                color={Colors.goldAccent}
                              />
                              <ThemedText style={styles.birthdayText}>
                                {formatBirthday(member.birthDate)}
                              </ThemedText>
                              {member.age > 0 && (
                                <>
                                  {/* <MaterialIcons
                                    name="person"
                                    size={14}
                                    style={styles.ageIcon}
                                  /> */}
                                  <ThemedText style={styles.ageText}>
                                    {member.age} years
                                  </ThemedText>
                                </>
                              )}
                            </View>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons
                name="cake"
                size={64}
                color={theme.text}
                style={{ opacity: 0.3 }}
              />
              <ThemedText style={styles.emptyTitle}>
                {searchQuery ? "No birthdays found" : "No birthdays recorded"}
              </ThemedText>
              <ThemedText style={styles.emptyText}>
                {searchQuery
                  ? "Try a different search term"
                  : "Add birth dates to member profiles"}
              </ThemedText>
              {searchQuery && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setSearchQuery("")}
                >
                  <ThemedText style={styles.clearButtonText}>
                    Clear Search
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      <FooterNav />
    </ThemedView>
  );
};

export default Birthday;

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
    paddingHorizontal: isWeb ? "8%" : 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    opacity: 0.7,
  },
  header: {
    marginBottom: 24,
    alignItems: "center",
  },
  backButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    fontSize: isWeb ? 32 : 28,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: isWeb ? 16 : 14,
    opacity: 0.7,
    textAlign: "center",
  },
  todaySection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  todayList: {
    gap: 8,
  },
  todayCard: {
    borderRadius: 12,
    padding: 12,
  },
  todayCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  todayImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  todayAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.greenAccent + "30",
    justifyContent: "center",
    alignItems: "center",
  },
  todayInfo: {
    flex: 1,
  },
  todayName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  todayAge: {
    fontSize: 12,
    color: Colors.greenAccent,
    fontWeight: "500",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  monthsContainer: {
    gap: 24,
  },
  monthSection: {
    gap: 12,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
  },
  memberCount: {
    backgroundColor: Colors.blueAccent + "20",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  memberCountText: {
    fontSize: 12,
    fontWeight: "600",
    // color: Colors.blueAccent,
  },
  membersList: {
    gap: 8,
  },
  memberCard: {
    backgroundColor: Colors.uiBackground,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border + "40",
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  memberImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.uiBackground,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  birthdayInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  birthdayText: {
    fontSize: 12,
    opacity: 0.7,
  },
  ageIcon: {
    marginLeft: 8,
  },
  ageText: {
    fontSize: 10,
    // color: Colors.blueAccent,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: "center",
    marginBottom: 20,
  },
  clearButton: {
    backgroundColor: Colors.blueAccent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  bottomSpacer: {
    height: 40,
  },
});
