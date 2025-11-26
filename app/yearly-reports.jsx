import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  TextInput,
} from "react-native";
import React, { useState, useEffect, useContext } from "react";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import { ThemeContext } from "../context/ThemeContext";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { router } from "expo-router";
import ReportGenerator from "../components/ReportsGenerator";

const YearlyReports = () => {
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;

  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [members, setMembers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [duesAllocations, setDuesAllocations] = useState([]);
  const [finances, setFinances] = useState([]);
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    payments: true,
    finances: true,
    owingMembers: false,
  });
  const [owingSearchQuery, setOwingSearchQuery] = useState("");
  const [expandedOwingMember, setExpandedOwingMember] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Generate years from 2022 to current year
  const years = Array.from(
    { length: new Date().getFullYear() - 2021 },
    (_, i) => 2022 + i
  );

  useEffect(() => {
    loadMembers();
    loadTransactions();
    loadDuesAllocations();
    loadFinances();
  }, []);

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

  const loadFinances = async () => {
    try {
      const financesRef = collection(db, "finances");
      const q = query(financesRef);

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const financesList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setFinances(financesList);
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error loading finances:", error);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section],
    });
  };

  const getDuesAllocationForYear = (year) => {
    return duesAllocations.find((allocation) => allocation.year === year);
  };

  const getBudgetForYear = (year) => {
    const budgetEntry = finances.find(
      (finance) => finance.type === "budget" && finance.year === year
    );
    return budgetEntry ? budgetEntry.amount : 0;
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

  const calculateOverviewStats = () => {
    const totalMembers = members.length;
    const executiveMembers = members.filter((m) => m.isExecutive).length;
    const regularMembers = totalMembers - executiveMembers;

    // Calculate finances FOR THE SELECTED YEAR ONLY
    let totalYearIncome = 0;
    let duesAmount = 0;
    let contributionsAmount = 0;
    let othersAmount = 0;

    // Filter finances by selected year (same logic as FinancialLog)
    const yearFinances = finances.filter((finance) => {
      let financeYear;

      if (finance.type === "budget" || finance.type === "dues") {
        financeYear =
          typeof finance.year === "string"
            ? parseInt(finance.year)
            : finance.year;
      } else {
        const date = finance.timestamp?.toDate
          ? finance.timestamp.toDate()
          : new Date(finance.timestamp);
        financeYear = date.getFullYear();
      }

      return parseInt(financeYear) === parseInt(selectedYear);
    });

    // Filter transactions by selected year for dues
    const yearTransactions = transactions.filter((transaction) => {
      if (transaction.type === "dues") {
        const transactionYear =
          typeof transaction.year === "string"
            ? parseInt(transaction.year)
            : transaction.year;
        return parseInt(transactionYear) === parseInt(selectedYear);
      }
      return false;
    });

    // Calculate income from finances for the selected year
    yearFinances.forEach((finance) => {
      const amount = finance.amount || 0;
      if (amount > 0) {
        // Only count positive amounts as income
        totalYearIncome += amount;

        switch (finance.type) {
          case "dues":
            duesAmount += amount;
            break;
          case "contribution":
            contributionsAmount += amount;
            break;
          case "other":
            othersAmount += amount;
            break;
          // Don't include budget in the breakdown as it's separate
        }
      }
    });

    // Add dues from transactions for the selected year
    yearTransactions.forEach((transaction) => {
      if (transaction.type === "dues") {
        const amount = transaction.amount || 0;
        totalYearIncome += amount;
        duesAmount += amount;
      }
    });

    // Get current year's budget
    const currentYearBudget = getBudgetForYear(selectedYear);

    return {
      totalMembers,
      executiveMembers,
      regularMembers,
      totalYearIncome, // Changed from totalCoffers to totalYearIncome
      duesAmount,
      contributionsAmount,
      othersAmount,
      budgetAmount: currentYearBudget, // This should be the budget for selected year
    };
  };

  const calculatePaymentStats = () => {
    const allocation = getDuesAllocationForYear(selectedYear);
    if (!allocation) {
      return {
        executivesPaid: 0,
        executivesTotal: 0,
        regularPaid: 0,
        regularTotal: 0,
        totalExpected: 0,
        totalPaid: 0,
        totalOwing: 0,
        overallRate: 0,
      };
    }

    const executives = members.filter((m) => m.isExecutive);
    const regulars = members.filter((m) => !m.isExecutive);

    const executivesPaid = executives.filter((member) => {
      const summary = getMemberPaymentSummary(member, selectedYear);
      return summary.paymentRate === 100;
    }).length;

    const regularPaid = regulars.filter((member) => {
      const summary = getMemberPaymentSummary(member, selectedYear);
      return summary.paymentRate === 100;
    }).length;

    const totalExpected =
      executives.length * allocation.executiveAmount * 12 +
      regulars.length * allocation.regularAmount * 12;

    const totalPaid = transactions
      .filter((t) => t.type === "dues" && t.year === selectedYear)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalOwing = Math.max(0, totalExpected - totalPaid);
    const overallRate =
      totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0;

    return {
      executivesPaid,
      executivesTotal: executives.length,
      regularPaid,
      regularTotal: regulars.length,
      totalExpected,
      totalPaid,
      totalOwing,
      overallRate,
    };
  };

  const getOwingMembers = () => {
    const allocation = getDuesAllocationForYear(selectedYear);
    if (!allocation) return [];

    return members
      .map((member) => {
        const summary = getMemberPaymentSummary(member, selectedYear);
        if (summary.owingAmount > 0) {
          const monthsOwing = 12 - summary.totalPayments;
          return {
            ...member,
            owingAmount: summary.owingAmount,
            monthsOwing,
            paidMonths: summary.totalPayments,
          };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => b.owingAmount - a.owingAmount);
  };

  const renderYearSelector = () => (
    <View style={styles.yearSection}>
      <ThemedText style={styles.yearTitle}>Report Year</ThemedText>
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

  const renderOverviewSection = () => {
    const stats = calculateOverviewStats();

    return (
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection("overview")}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderLeft}>
            <ThemedText style={styles.sectionTitle}>
              Overview Statistics - {selectedYear}
            </ThemedText>
          </View>
          <MaterialIcons
            name={expandedSections.overview ? "expand-less" : "expand-more"}
            size={24}
            color={theme.text}
          />
        </TouchableOpacity>

        {expandedSections.overview && (
          <View style={styles.sectionContent}>
            {/* Members Overview */}
            <View style={styles.subsection}>
              <ThemedText style={styles.subsectionTitle}>Members</ThemedText>
              <View style={styles.statsGrid}>
                <View
                  style={[
                    styles.statCard,
                    { backgroundColor: theme.uiBackground },
                  ]}
                >
                  <MaterialIcons
                    name="people"
                    size={28}
                    color={Colors.blueAccent}
                  />
                  <ThemedText style={styles.statValue}>
                    {stats.totalMembers}
                  </ThemedText>
                  <ThemedText style={styles.statLabel}>
                    Total Members
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.statCard,
                    { backgroundColor: theme.uiBackground },
                  ]}
                >
                  <Ionicons
                    name="shield-checkmark"
                    size={28}
                    color={Colors.goldAccent}
                  />
                  <ThemedText style={styles.statValue}>
                    {stats.executiveMembers}
                  </ThemedText>
                  <ThemedText style={styles.statLabel}>Executives</ThemedText>
                </View>
                <View
                  style={[
                    styles.statCard,
                    { backgroundColor: theme.uiBackground },
                  ]}
                >
                  <MaterialIcons
                    name="person"
                    size={28}
                    color={Colors.tealAccent}
                  />
                  <ThemedText style={styles.statValue}>
                    {stats.regularMembers}
                  </ThemedText>
                  <ThemedText style={styles.statLabel}>
                    Regular Members
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Finances Overview */}
            <View style={styles.subsection}>
              <ThemedText style={styles.subsectionTitle}>
                Financial Overview - {selectedYear}
              </ThemedText>

              {/* Total Income for the Year */}
              <View
                style={[
                  styles.coffersCard,
                  { backgroundColor: theme.uiBackground },
                ]}
              >
                <View style={styles.coffersHeader}>
                  <MaterialIcons
                    name="account-balance"
                    size={32}
                    color={theme.text}
                  />
                  <ThemedText style={styles.coffersTitle}>
                    Total Income for {selectedYear}
                  </ThemedText>
                </View>
                <ThemedText style={styles.coffersAmount}>
                  GH₵{stats.totalYearIncome.toFixed(2)}
                </ThemedText>
              </View>

              {/* Current Year Budget */}
              {stats.budgetAmount > 0 && (
                <View
                  style={[
                    styles.budgetCard,
                    { backgroundColor: theme.uiBackground },
                  ]}
                >
                  <View style={styles.budgetHeader}>
                    <MaterialIcons
                      name="account-balance-wallet"
                      size={24}
                      color={Colors.purpleAccent}
                    />
                    <ThemedText style={styles.budgetTitle}>
                      Budget for {selectedYear}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.budgetAmount}>
                    GH₵{stats.budgetAmount}
                  </ThemedText>
                </View>
              )}

              <View style={styles.statsGrid}>
                <View
                  style={[
                    styles.statCard,
                    { backgroundColor: theme.uiBackground },
                  ]}
                >
                  <ThemedText style={[styles.statLabel]}>Dues</ThemedText>
                  <ThemedText style={styles.statValue}>
                    GH₵{stats.duesAmount}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.statCard,
                    { backgroundColor: theme.uiBackground },
                  ]}
                >
                  <ThemedText style={[styles.statLabelCont]}>
                    Contributions
                  </ThemedText>
                  <ThemedText style={styles.statValue}>
                    GH₵{stats.contributionsAmount}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.statCard,
                    { backgroundColor: theme.uiBackground },
                  ]}
                >
                  <ThemedText style={[styles.statLabel]}>Others</ThemedText>
                  <ThemedText style={styles.statValue}>
                    GH₵{stats.othersAmount}
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderPaymentSection = () => {
    const stats = calculatePaymentStats();
    const allocation = getDuesAllocationForYear(selectedYear);

    return (
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection("payments")}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderLeft}>
            <ThemedText style={styles.sectionTitle}>
              Payment Report - {selectedYear}
            </ThemedText>
          </View>
          <MaterialIcons
            name={expandedSections.payments ? "expand-less" : "expand-more"}
            size={24}
            color={theme.text}
          />
        </TouchableOpacity>

        {expandedSections.payments && (
          <View style={styles.sectionContent}>
            {!allocation ? (
              <View style={styles.noDataContainer}>
                <MaterialIcons
                  name="warning"
                  size={48}
                  color={Colors.yellowAccent}
                />
                <ThemedText style={styles.noDataText}>
                  No dues allocation found for {selectedYear}
                </ThemedText>
              </View>
            ) : (
              <>
                {/* Payment Summary */}
                <View style={styles.subsection}>
                  <ThemedText style={styles.subsectionTitle}>
                    Members Payment Summary
                  </ThemedText>
                  <View style={styles.statsGrid}>
                    <View
                      style={[
                        styles.statCard,
                        { backgroundColor: theme.uiBackground },
                      ]}
                    >
                      {/* <MaterialIcons
                        name="check-circle"
                        size={24}
                        color={Colors.greenAccent}
                      /> */}
                      <ThemedText style={styles.statValue}>
                        GH₵{stats.totalPaid}
                      </ThemedText>
                      <ThemedText style={styles.statLabel}>
                        Total Paid
                      </ThemedText>
                    </View>
                    <View
                      style={[
                        styles.statCard,
                        { backgroundColor: theme.uiBackground },
                      ]}
                    >
                      {/* <MaterialIcons
                        name="pending"
                        size={24}
                        color={Colors.redAccent}
                      /> */}
                      <ThemedText style={styles.statValue}>
                        GH₵{stats.totalOwing}
                      </ThemedText>
                      <ThemedText style={styles.statLabel}>
                        Total Owing
                      </ThemedText>
                    </View>
                    <View
                      style={[
                        styles.statCard,
                        { backgroundColor: theme.uiBackground },
                      ]}
                    >
                      <MaterialIcons
                        name="trending-up"
                        size={24}
                        color={Colors.blueAccent}
                      />
                      <ThemedText style={styles.statValue}>
                        {stats.overallRate.toFixed(0)}%
                      </ThemedText>
                      <ThemedText style={styles.statLabel}>
                        Collection Rate
                      </ThemedText>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.viewExpensesButton,
                      { backgroundColor: Colors.blueAccent },
                    ]}
                    onPress={() => router.push("/financial-logs")}
                    activeOpacity={0.7}
                  >
                    <ThemedText style={styles.viewExpensesButtonText}>
                      View Expenses for {selectedYear}
                    </ThemedText>
                  </TouchableOpacity>
                </View>

                {/* Members Payment Status */}
                <View style={styles.subsection}>
                  <ThemedText style={styles.subsectionTitle}>
                    Members Fully Paid
                  </ThemedText>
                  <View style={styles.horizontalStats}>
                    <View
                      style={[
                        styles.horizontalStatCard,
                        { backgroundColor: theme.uiBackground },
                      ]}
                    >
                      <View style={styles.horizontalStatLeft}>
                        <Ionicons
                          name="shield-checkmark"
                          size={32}
                          color={Colors.goldAccent}
                        />
                        <View>
                          <ThemedText style={styles.horizontalStatLabel}>
                            Executives
                          </ThemedText>
                          <ThemedText style={styles.horizontalStatValue}>
                            {stats.executivesPaid} / {stats.executivesTotal}
                          </ThemedText>
                        </View>
                      </View>
                      <View style={styles.progressBarContainer}>
                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${
                                  stats.executivesTotal > 0
                                    ? (stats.executivesPaid /
                                        stats.executivesTotal) *
                                      100
                                    : 0
                                }%`,
                                backgroundColor: Colors.goldAccent,
                              },
                            ]}
                          />
                        </View>
                        <ThemedText style={styles.progressPercentage}>
                          {stats.executivesTotal > 0
                            ? (
                                (stats.executivesPaid / stats.executivesTotal) *
                                100
                              ).toFixed(0)
                            : 0}
                          %
                        </ThemedText>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.horizontalStatCard,
                        { backgroundColor: theme.uiBackground },
                      ]}
                    >
                      <View style={styles.horizontalStatLeft}>
                        <MaterialIcons
                          name="person"
                          size={32}
                          color={Colors.tealAccent}
                        />
                        <View>
                          <ThemedText style={styles.horizontalStatLabel}>
                            Regular Members
                          </ThemedText>
                          <ThemedText style={styles.horizontalStatValue}>
                            {stats.regularPaid} / {stats.regularTotal}
                          </ThemedText>
                        </View>
                      </View>
                      <View style={styles.progressBarContainer}>
                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${
                                  stats.regularTotal > 0
                                    ? (stats.regularPaid / stats.regularTotal) *
                                      100
                                    : 0
                                }%`,
                                backgroundColor: Colors.tealAccent,
                              },
                            ]}
                          />
                        </View>
                        <ThemedText style={styles.progressPercentage}>
                          {stats.regularTotal > 0
                            ? (
                                (stats.regularPaid / stats.regularTotal) *
                                100
                              ).toFixed(0)
                            : 0}
                          %
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                </View>
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderOwingMembersSection = () => {
    const owingMembers = getOwingMembers();

    return (
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection("owingMembers")}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderLeft}>
            <ThemedText style={styles.sectionTitle}>
              Members Owing - {selectedYear} ({owingMembers.length})
            </ThemedText>
          </View>
          <MaterialIcons
            name={expandedSections.owingMembers ? "expand-less" : "expand-more"}
            size={24}
            color={theme.text}
          />
        </TouchableOpacity>

        {expandedSections.owingMembers && (
          <View style={styles.sectionContent}>
            {!getDuesAllocationForYear(selectedYear) ? (
              <View style={styles.noDataContainer}>
                <MaterialIcons
                  name="warning"
                  size={48}
                  color={Colors.yellowAccent}
                />
                <ThemedText style={styles.noDataText}>
                  No dues allocation found for {selectedYear}
                </ThemedText>
              </View>
            ) : owingMembers.length === 0 ? (
              <View style={styles.noDataContainer}>
                <MaterialIcons
                  name="check-circle"
                  size={48}
                  color={Colors.greenAccent}
                />
                <ThemedText style={styles.noDataText}>
                  All members have fully paid their dues for {selectedYear}!
                </ThemedText>
              </View>
            ) : (
              <>
                <View
                  style={[
                    styles.searchContainer,
                    { backgroundColor: theme.uiBackground },
                  ]}
                >
                  <Ionicons name="search" size={20} color={Colors.blueAccent} />
                  <TextInput
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder="Search members owing..."
                    placeholderTextColor="#999"
                    value={owingSearchQuery}
                    onChangeText={setOwingSearchQuery}
                  />
                  {owingSearchQuery !== "" && (
                    <TouchableOpacity onPress={() => setOwingSearchQuery("")}>
                      <Ionicons
                        name="close"
                        size={18}
                        color={Colors.blueAccent}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                <ScrollView
                  style={styles.owingMembersScrollView}
                  showsVerticalScrollIndicator={true}
                >
                  {owingMembers
                    .filter(
                      (member) =>
                        member.fullname
                          ?.toLowerCase()
                          .includes(owingSearchQuery.toLowerCase()) ||
                        member.phone?.includes(owingSearchQuery)
                    )
                    .map((member) => (
                      <TouchableOpacity
                        key={member.id}
                        style={[
                          styles.owingMemberCard,
                          { backgroundColor: theme.uiBackground },
                        ]}
                        onPress={() =>
                          setExpandedOwingMember(
                            expandedOwingMember === member.id ? null : member.id
                          )
                        }
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.owingMemberHeader,
                            expandedOwingMember === member.id &&
                              styles.owingMemberHeaderExpanded,
                          ]}
                        >
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
                                name={member.isExecutive ? "star" : "person"}
                                size={20}
                                color={
                                  member.isExecutive
                                    ? Colors.goldAccent
                                    : Colors.blueAccent
                                }
                              />
                            )}
                          </View>
                          <View style={styles.owingMemberInfo}>
                            <View style={styles.memberNameRow}>
                              <ThemedText style={styles.owingMemberName}>
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
                            <ThemedText style={styles.owingMemberPhone}>
                              {member.phone}
                            </ThemedText>
                          </View>
                          <MaterialIcons
                            name={
                              expandedOwingMember === member.id
                                ? "expand-less"
                                : "expand-more"
                            }
                            size={24}
                            color={theme.text}
                          />
                        </View>
                        {expandedOwingMember === member.id && (
                          <View style={styles.owingDetails}>
                            <View style={styles.owingDetailRow}>
                              <View style={styles.owingDetailItem}>
                                <View>
                                  <ThemedText style={styles.owingDetailLabel}>
                                    Amount Owing
                                  </ThemedText>
                                  <ThemedText style={[styles.owingDetailValue]}>
                                    GH₵{member.owingAmount.toFixed(2)}
                                  </ThemedText>
                                </View>
                              </View>

                              <View style={styles.owingDetailItem}>
                                <View>
                                  <ThemedText style={styles.owingDetailLabel}>
                                    Months Owing
                                  </ThemedText>
                                  <ThemedText style={[styles.owingDetailValue]}>
                                    {member.monthsOwing} months
                                  </ThemedText>
                                </View>
                              </View>
                            </View>

                            <View style={styles.owingDetailRow}>
                              <View style={styles.owingDetailItem}>
                                <View>
                                  <ThemedText style={styles.owingDetailLabel}>
                                    Months Paid
                                  </ThemedText>
                                  <ThemedText style={[styles.owingDetailValue]}>
                                    {member.paidMonths} / 12
                                  </ThemedText>
                                </View>
                              </View>

                              <View style={styles.owingDetailItem}>
                                <View>
                                  <ThemedText style={styles.owingDetailLabel}>
                                    Year
                                  </ThemedText>
                                  <ThemedText style={[styles.owingDetailValue]}>
                                    {selectedYear}
                                  </ThemedText>
                                </View>
                              </View>
                            </View>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                </ScrollView>
              </>
            )}
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
          <ThemedText style={styles.loadingText}>Loading reports...</ThemedText>
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
        {renderOverviewSection()}
        {renderPaymentSection()}
        {renderOwingMembersSection()}
        {/* <TouchableOpacity
          style={[
            styles.generateReportButton,
            { backgroundColor: Colors.blueAccent },
          ]}
          onPress={() => setShowReportModal(true)}
          activeOpacity={0.7}
        >
          <MaterialIcons name="summarize" size={20} color="#fff" />
          <ThemedText style={styles.generateReportButtonText}>
            Generate Full Report
          </ThemedText>
        </TouchableOpacity> */}
      </ScrollView>
      <ReportGenerator
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        selectedYear={selectedYear}
        members={members}
        transactions={transactions}
        finances={finances}
        duesAllocations={duesAllocations}
      />
    </ThemedView>
  );
};

export default YearlyReports;

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
  yearSection: {
    marginBottom: 24,
  },
  yearTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
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
  section: {
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: Colors.uiBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: Colors.uiBackground,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  sectionContent: {
    padding: 16,
    paddingTop: 0,
  },
  subsection: {
    marginBottom: 20,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    opacity: 0.7,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    width: "31%",
    minHeight: 90,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "bold",
    textAlign: "center",
    numberOfLines: 1,
    flexShrink: 1,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    numberOfLines: 1,
  },
  statLabelCont: {
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    numberOfLines: 1,
  },
  coffersCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.blueAccent,
  },
  coffersHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  coffersTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 12,
  },
  coffersAmount: {
    fontSize: 36,
    fontWeight: "bold",
  },
  budgetCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.purpleAccent,
  },
  budgetHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  budgetTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 12,
    color: Colors.purpleAccent,
  },
  budgetAmount: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.purpleAccent,
  },
  horizontalStats: {
    gap: 12,
  },
  horizontalStatCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  horizontalStatLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  horizontalStatLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  horizontalStatValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
  progressBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.7,
    minWidth: 35,
  },
  noDataContainer: {
    alignItems: "center",
    padding: 32,
  },
  noDataText: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 12,
    opacity: 0.7,
  },
  owingMembersScrollView: {
    maxHeight: 500,
  },
  owingMemberCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  owingMemberHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + "40",
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
    backgroundColor: Colors.goldAccent + "20",
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  owingMemberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  owingMemberName: {
    fontSize: 16,
    fontWeight: "600",
  },
  owingMemberPhone: {
    fontSize: 14,
    opacity: 0.6,
  },
  executiveBadge: {
    backgroundColor: Colors.goldAccent + "20",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  executiveBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.goldAccent,
  },
  owingDetails: {
    gap: 12,
  },
  owingDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  owingDetailItem: {
    flex: 1,
    padding: 12,
    backgroundColor: Colors.border + "20",
    borderRadius: 8,
  },
  owingDetailLabel: {
    fontSize: 11,
    opacity: 0.7,
  },
  owingDetailValue: {
    fontSize: 14,
    fontWeight: "bold",
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
  owingMemberHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  owingMemberHeaderExpanded: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + "40",
  },
  viewExpensesButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  viewExpensesButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  // generateReportButton: {
  //   flexDirection: "row",
  //   alignItems: "center",
  //   justifyContent: "center",
  //   padding: 16,
  //   borderRadius: 12,
  //   marginTop: 16,
  //   gap: 8,
  // },
  // generateReportButtonText: {
  //   color: "#fff",
  //   fontSize: 16,
  //   fontWeight: "bold",
  // },
});
