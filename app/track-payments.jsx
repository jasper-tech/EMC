import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import React, { useState, useEffect, useContext } from "react";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import { ThemeContext } from "../context/ThemeContext";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db, auth } from "../firebase";
import { TextInput } from "react-native";
const TrackPayments = () => {
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;

  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [members, setMembers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [duesAllocations, setDuesAllocations] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [showSummaryTiles, setShowSummaryTiles] = useState(true);

  // Generate years from 2022 to current year
  const years = Array.from(
    { length: new Date().getFullYear() - 2021 },
    (_, i) => 2022 + i
  );

  const months = [
    { name: "January", value: 1 },
    { name: "February", value: 2 },
    { name: "March", value: 3 },
    { name: "April", value: 4 },
    { name: "May", value: 5 },
    { name: "June", value: 6 },
    { name: "July", value: 7 },
    { name: "August", value: 8 },
    { name: "September", value: 9 },
    { name: "October", value: 10 },
    { name: "November", value: 11 },
    { name: "December", value: 12 },
  ];

  useEffect(() => {
    loadMembers();
    loadTransactions();
    loadDuesAllocations();
  }, []);

  useEffect(() => {
    let filtered = members;

    if (searchQuery.trim() !== "") {
      filtered = members.filter(
        (member) =>
          member.fullname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.phone?.includes(searchQuery)
      );
    }

    const sortedMembers = [...filtered].sort((a, b) => {
      if (a.isExecutive && !b.isExecutive) return -1;
      if (!a.isExecutive && b.isExecutive) return 1;

      return a.fullname?.localeCompare(b.fullname);
    });

    setFilteredMembers(sortedMembers);
  }, [searchQuery, members]);

  const loadMembers = async () => {
    try {
      const membersRef = collection(db, "members");
      const q = query(membersRef, orderBy("fullname"));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const membersList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMembers(membersList);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error loading members:", error);
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const transactionsRef = collection(db, "transactions");
      const q = query(transactionsRef, orderBy("timestamp", "desc"));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const transactionsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTransactions(transactionsList);
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error loading transactions:", error);
    }
  };

  const loadDuesAllocations = async () => {
    try {
      const allocationsRef = collection(db, "duesAllocations");
      const q = query(allocationsRef, orderBy("year", "desc"));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const allocationsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setDuesAllocations(allocationsList);
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error loading dues allocations:", error);
    }
  };

  const getDuesAllocationForYear = (year) => {
    return duesAllocations.find((allocation) => allocation.year === year);
  };

  const getMemberPaymentSummary = (member, year) => {
    const allocation = getDuesAllocationForYear(year);
    if (!allocation) {
      return {
        expectedAmount: 0,
        paidAmount: 0,
        owingAmount: 0,
        paidMonths: [],
        paymentRate: 0,
        monthlyAmount: 0,
      };
    }

    const monthlyAmount = member.isExecutive
      ? allocation.executiveAmount
      : allocation.regularAmount;
    const expectedAmount = monthlyAmount * 12;

    // Get all dues payments for this member in the selected year
    const memberPayments = transactions.filter(
      (transaction) =>
        transaction.type === "dues" &&
        transaction.memberId === member.id &&
        transaction.year === year
    );

    const paidAmount = memberPayments.reduce(
      (total, payment) => total + payment.amount,
      0
    );
    const owingAmount = Math.max(0, expectedAmount - paidAmount);
    const paymentRate =
      expectedAmount > 0 ? (paidAmount / expectedAmount) * 100 : 0;

    // Get unique paid months
    const paidMonths = [
      ...new Set(memberPayments.map((payment) => payment.month)),
    ];

    return {
      expectedAmount,
      paidAmount,
      owingAmount,
      paidMonths,
      paymentRate,
      monthlyAmount,
      totalPayments: memberPayments.length,
    };
  };

  const getPaymentStatus = (paymentRate) => {
    if (paymentRate === 0) return { status: "Not Started", color: Colors.gray };
    if (paymentRate === 100)
      return { status: "Completed", color: Colors.greenAccent };
    if (paymentRate >= 75)
      return { status: "Almost Done", color: Colors.blueAccent };
    if (paymentRate >= 50)
      return { status: "In Progress", color: Colors.orangeAccent };
    return { status: "Behind", color: Colors.redAccent };
  };

  const renderYearSelector = () => (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>Select Year</ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.yearScrollView}
      >
        <View style={styles.yearContainer}>
          {years.map((year) => (
            <TouchableOpacity
              key={year}
              style={[
                styles.yearButton,
                selectedYear === year && {
                  backgroundColor: Colors.blueAccent,
                },
              ]}
              onPress={() => setSelectedYear(year)}
            >
              <ThemedText
                style={[
                  styles.yearButtonText,
                  selectedYear === year && styles.yearButtonTextSelected,
                ]}
              >
                {year}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  const renderMemberCard = (member) => {
    const summary = getMemberPaymentSummary(member, selectedYear);
    const allocation = getDuesAllocationForYear(selectedYear);
    const status = getPaymentStatus(summary.paymentRate);

    if (!allocation) {
      return (
        <View
          key={member.id}
          style={[styles.memberCard, { backgroundColor: theme.uiBackground }]}
        >
          <View style={styles.memberInfo}>
            <View
              style={[
                styles.avatar,
                member.isExecutive && styles.executiveAvatar,
              ]}
            >
              {member.profileImg ? (
                <Image
                  source={{ uri: member.profileImg }}
                  style={styles.profileImage}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons
                  name={member.isExecutive ? "shield-checkmark" : "person"}
                  size={20}
                  color={
                    member.isExecutive ? Colors.goldAccent : Colors.blueAccent
                  }
                />
              )}
            </View>
            <View style={styles.memberDetails}>
              <View style={styles.memberNameRow}>
                <ThemedText style={styles.memberName}>
                  {member.fullname}
                </ThemedText>
                {member.isExecutive && (
                  <Ionicons
                    name="shield-checkmark"
                    size={16}
                    color={Colors.goldAccent}
                  />
                )}
              </View>
              <ThemedText style={styles.memberPhone}>{member.phone}</ThemedText>
            </View>
          </View>
          <View style={styles.noAllocationMessage}>
            <MaterialIcons
              name="warning"
              size={16}
              color={Colors.yellowAccent}
            />
            <ThemedText style={styles.noAllocationText}>
              No dues allocated for {selectedYear}
            </ThemedText>
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity
        key={member.id}
        style={[styles.memberCard, { backgroundColor: theme.uiBackground }]}
        onPress={() =>
          setSelectedMember(selectedMember?.id === member.id ? null : member)
        }
        activeOpacity={0.7}
      >
        <View style={styles.memberInfo}>
          <View
            style={[
              styles.avatar,
              member.isExecutive && styles.executiveAvatar,
            ]}
          >
            {member.profileImg ? (
              <Image
                source={{ uri: member.profileImg }}
                style={styles.profileImage}
                resizeMode="cover"
              />
            ) : (
              <Ionicons
                name={member.isExecutive ? "shield-checkmark" : "person"}
                size={20}
                color={
                  member.isExecutive ? Colors.goldAccent : Colors.blueAccent
                }
              />
            )}
          </View>
          <View style={styles.memberDetails}>
            <View style={styles.memberNameRow}>
              <ThemedText style={styles.memberName}>
                {member.fullname}
              </ThemedText>
              {member.isExecutive && (
                <Ionicons
                  name="shield-checkmark"
                  size={16}
                  color={Colors.goldAccent}
                />
              )}
            </View>
            <ThemedText style={styles.memberPhone}>{member.phone}</ThemedText>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statLabel}>Paid</ThemedText>
            <ThemedText style={styles.statValue}>
              GH₵{summary.paidAmount}
            </ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={styles.statLabel}>Owing</ThemedText>
            <ThemedText style={[styles.statValue, styles.owingText]}>
              GH₵{summary.owingAmount}
            </ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={styles.statLabel}>Months</ThemedText>
            <ThemedText style={styles.statValue}>
              {summary.totalPayments}/12
            </ThemedText>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <ThemedText style={styles.progressLabel}>
              {status.status}
            </ThemedText>
            <ThemedText style={styles.progressPercentage}>
              {summary.paymentRate.toFixed(0)}%
            </ThemedText>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${summary.paymentRate}%`,
                  backgroundColor: status.color,
                },
              ]}
            />
          </View>
        </View>

        {/* Expanded Details */}
        {selectedMember?.id === member.id && (
          <View style={styles.expandedDetails}>
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>
                Monthly Amount:
              </ThemedText>
              <ThemedText style={styles.detailValue}>
                GH₵{summary.monthlyAmount.toFixed(2)}
              </ThemedText>
            </View>
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>
                Expected Annual:
              </ThemedText>
              <ThemedText style={styles.detailValue}>
                GH₵{summary.expectedAmount.toFixed(2)}
              </ThemedText>
            </View>
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Paid Months:</ThemedText>
              <View style={styles.monthsContainer}>
                {months.map((month) => (
                  <View
                    key={month.value}
                    style={[
                      styles.monthPill,
                      summary.paidMonths.includes(month.value)
                        ? styles.paidMonth
                        : styles.unpaidMonth,
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.monthPillText,
                        summary.paidMonths.includes(month.value)
                          ? styles.paidMonthText
                          : styles.unpaidMonthText,
                      ]}
                    >
                      {month.name.substring(0, 3)}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Payment Rate:</ThemedText>
              <ThemedText style={[styles.detailValue, { color: status.color }]}>
                {summary.paymentRate.toFixed(1)}%
              </ThemedText>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderSummaryStats = () => {
    const allocation = getDuesAllocationForYear(selectedYear);
    if (!allocation) return null;

    const totalMembers = members.length;
    const executiveMembers = members.filter((m) => m.isExecutive).length;
    const regularMembers = totalMembers - executiveMembers;

    const totalExpected =
      executiveMembers * allocation.executiveAmount * 12 +
      regularMembers * allocation.regularAmount * 12;

    const totalPaid = transactions
      .filter((t) => t.type === "dues" && t.year === selectedYear)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalOwing = Math.max(0, totalExpected - totalPaid);
    const overallRate =
      totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0;

    // Calculate members owing (members who haven't paid all 12 months)
    const membersOwing = members.filter((member) => {
      const memberPayments = transactions.filter(
        (t) =>
          t.type === "dues" &&
          t.memberId === member.id &&
          t.year === selectedYear
      );
      return memberPayments.length < 12;
    }).length;

    return (
      <View style={styles.summarySection}>
        {/* Collapsible Header */}
        <TouchableOpacity
          style={styles.summaryHeader}
          onPress={() => setShowSummaryTiles(!showSummaryTiles)}
          activeOpacity={0.7}
        >
          <ThemedText style={styles.summaryTitle}>
            Year {selectedYear} Dues Summary
          </ThemedText>
          <MaterialIcons
            name={showSummaryTiles ? "expand-less" : "expand-more"}
            size={24}
            color={theme.text}
          />
        </TouchableOpacity>

        {/* Expected Amount Banner (always visible) */}
        <View style={styles.expectedAmountBanner}>
          <MaterialIcons name="account-balance" size={20} color={theme.text} />
          <View style={styles.expectedAmountInfo}>
            <ThemedText style={styles.expectedAmountLabel}>
              Expected Dues for {selectedYear}
            </ThemedText>
            <ThemedText style={styles.expectedAmountValue}>
              GH₵{totalExpected.toFixed(2)}
            </ThemedText>
            <ThemedText style={styles.amountLeftText}>
              Amount left to reach:{" "}
              <ThemedText style={styles.amountLeftValue}>
                GH₵{totalOwing}
              </ThemedText>
            </ThemedText>
          </View>
        </View>

        {/* Collapsible Tiles */}
        {showSummaryTiles && (
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              {/* <MaterialIcons
                name="people"
                size={24}
                color={Colors.blueAccent}
              /> */}
              <ThemedText style={styles.summaryValue}>
                {totalMembers}
              </ThemedText>
              <ThemedText style={styles.summaryLabel}>Total Members</ThemedText>
            </View>
            <View style={styles.summaryCard}>
              {/* <MaterialIcons
                name="payments"
                size={24}ss
                color={Colors.greenAccent}
              /> */}
              <ThemedText style={styles.summaryValue}>
                GH₵{totalPaid.toFixed(0)}
              </ThemedText>
              <ThemedText style={styles.summaryLabel}>
                Total Collected
              </ThemedText>
            </View>
            <View style={styles.summaryCard}>
              {/* <MaterialIcons
                name="person-remove"
                size={24}
                color={Colors.orangeAccent}
              /> */}
              <ThemedText style={styles.summaryValue}>
                {membersOwing}
              </ThemedText>
              <ThemedText style={styles.summaryLabel}>Members Owing</ThemedText>
            </View>
            <View style={styles.summaryCard}>
              <MaterialIcons
                name="trending-up"
                size={24}
                color={Colors.tealAccent}
              />
              <ThemedText style={styles.summaryValue}>
                {overallRate.toFixed(0)}%
              </ThemedText>
              <ThemedText style={styles.summaryLabel}>
                Collection Rate
              </ThemedText>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.blueAccent} />
          <ThemedText style={styles.loadingText}>
            Loading payment tracking...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
      >
        {renderYearSelector()}

        {renderSummaryStats()}
        {/* Search Bar */}
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
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== "" && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close" size={18} color={Colors.blueAccent} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>
            Member Payment Details - {selectedYear}
          </ThemedText>
          <ScrollView
            style={styles.membersScrollView}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.membersScrollContent}
          >
            {filteredMembers.map(renderMemberCard)}
          </ScrollView>
        </View>
      </ScrollView>
    </ThemedView>
  );
};

export default TrackPayments;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 20,
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  yearScrollView: {
    marginHorizontal: -16,
  },
  yearContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
  },
  yearButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.uiBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  yearButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  yearButtonTextSelected: {
    color: "#fff",
  },
  summarySection: {
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryCard: {
    width: "48%",
    backgroundColor: Colors.uiBackground,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "bold",
    marginVertical: 8,
  },
  summaryLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: "center",
  },
  membersList: {
    gap: 12,
  },
  memberCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.blueAccent + "20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  executiveAvatar: {
    // backgroundColor: Colors.goldAccent + "20",
    borderWidth: 2,
    // borderColor: Colors.goldAccent,
  },
  memberDetails: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
  },
  memberPhone: {
    fontSize: 14,
    opacity: 0.6,
  },

  noAllocationMessage: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
    // backgroundColor: Colors.orangeAccent + "20",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  noAllocationText: {
    fontSize: 11,
    // color: Colors.yellowAccent,
    fontWeight: "200",
  },
  quickStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  owingText: {
    // color: Colors.orangeAccent,
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.7,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  expandedDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border + "40",
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  detailLabel: {
    fontSize: 14,
    opacity: 0.7,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  monthsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    flex: 1,
    justifyContent: "flex-end",
  },
  monthPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 40,
    alignItems: "center",
  },
  paidMonth: {
    backgroundColor: Colors.greenAccent + "20",
    borderWidth: 1,
    borderColor: Colors.greenAccent,
  },
  unpaidMonth: {
    backgroundColor: Colors.border,
    borderWidth: 1,
    borderColor: Colors.border + "80",
  },
  monthPillText: {
    fontSize: 10,
    fontWeight: "600",
  },
  paidMonthText: {
    color: Colors.greenAccent,
  },
  unpaidMonthText: {
    color: Colors.text + "80",
  },
  expectedAmountBanner: {
    flexDirection: "row",
    alignItems: "center",
    // backgroundColor: Colors.blueAccent + "15",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.blueAccent + "30",
    marginBottom: 16,
    gap: 12,
  },
  expectedAmountInfo: {
    flex: 1,
  },
  expectedAmountLabel: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  expectedAmountValue: {
    fontSize: 20,
    fontWeight: "bold",
    // color: Colors.blueAccent,
  },
  amountLeftText: {
    fontSize: 12,
    opacity: 0.6,
  },
  amountLeftValue: {
    fontSize: 12,
    color: Colors.redAccent,
    fontWeight: "500",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 8,
  },

  membersScrollView: {
    maxHeight: 400,
  },

  membersScrollContent: {
    gap: 12,
    paddingBottom: 8,
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
});
