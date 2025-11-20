import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import React, { useState, useEffect, useContext } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import { ThemeContext } from "../context/ThemeContext";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../firebase";

const FinancialLog = () => {
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;

  const [allTransactions, setAllTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState([]);
  const [totalAdded, setTotalAdded] = useState(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    filterTransactionsByYear();
  }, [allTransactions, selectedYear]);

  const loadTransactions = async () => {
    try {
      const financesRef = collection(db, "finances");
      const transactionsRef = collection(db, "transactions");

      const financesQuery = query(financesRef, orderBy("timestamp", "desc"));
      const transactionsQuery = query(
        transactionsRef,
        orderBy("timestamp", "desc")
      );

      const unsubscribeFinances = onSnapshot(
        financesQuery,
        (financesSnapshot) => {
          const financesData = financesSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            source: "finances",
          }));

          const unsubscribeTransactions = onSnapshot(
            transactionsQuery,
            (transactionsSnapshot) => {
              const transactionsData = transactionsSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                source: "transactions",
              }));

              // Filter out withdrawals AND dues from finances collection to avoid duplication
              const filteredFinances = financesData.filter(
                (item) => item.type !== "withdrawal" && item.type !== "dues"
              );

              // Combine finances (without withdrawals and dues) and transactions
              const combinedData = [
                ...filteredFinances,
                ...transactionsData,
              ].sort((a, b) => {
                const dateA = a.timestamp?.toDate
                  ? a.timestamp.toDate()
                  : new Date(a.timestamp);
                const dateB = b.timestamp?.toDate
                  ? b.timestamp.toDate()
                  : new Date(b.timestamp);
                return dateB - dateA;
              });

              setAllTransactions(combinedData);

              // Always show years from 2022 to current year
              const currentYear = new Date().getFullYear();
              const allYears = Array.from(
                { length: currentYear - 2021 },
                (_, i) => currentYear - i
              );

              setAvailableYears(allYears);
              setLoading(false);
              setRefreshing(false);
            }
          );

          return () => unsubscribeTransactions();
        }
      );

      return () => unsubscribeFinances();
    } catch (error) {
      console.error("Error loading transactions:", error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterTransactionsByYear = () => {
    let added = 0;
    let withdrawn = 0;

    const filtered = allTransactions.filter((transaction) => {
      let transactionYear;

      if (transaction.type === "dues" || transaction.type === "budget") {
        // For dues payments and budget allocations, use the year field
        transactionYear =
          typeof transaction.year === "string"
            ? parseInt(transaction.year)
            : transaction.year;
      } else if (transaction.type === "withdrawal") {
        // For withdrawals, use withdrawalDate or timestamp
        if (transaction.withdrawalDate) {
          transactionYear = new Date(transaction.withdrawalDate).getFullYear();
        } else {
          const date = transaction.timestamp?.toDate
            ? transaction.timestamp.toDate()
            : new Date(transaction.timestamp);
          transactionYear = date.getFullYear();
        }
      } else {
        // For contributions, other, and other finances - use timestamp year
        const date = transaction.timestamp?.toDate
          ? transaction.timestamp.toDate()
          : new Date(transaction.timestamp);
        transactionYear = date.getFullYear();
      }

      // Ensure both are numbers for comparison
      const numericSelectedYear = parseInt(selectedYear);
      const numericTransactionYear = parseInt(transactionYear);

      const isInSelectedYear = numericTransactionYear === numericSelectedYear;

      if (isInSelectedYear) {
        const amount = transaction.amount || 0;

        if (transaction.type === "withdrawal") {
          withdrawn += Math.abs(amount);
        } else {
          added += Math.abs(amount);
        }
      }

      return isInSelectedYear;
    });

    setFilteredTransactions(filtered);
    setTotalAdded(added);
    setTotalWithdrawn(withdrawn);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTransactions();
  };

  const getTransactionIcon = (transaction) => {
    switch (transaction.type) {
      case "withdrawal":
        return { icon: "trending-down", color: Colors.redAccent };
      case "dues":
        return { icon: "receipt", color: Colors.blueAccent };
      case "contribution":
        return { icon: "volunteer-activism", color: Colors.greenAccent };
      case "budget":
        return { icon: "account-balance-wallet", color: Colors.purpleAccent };
      case "other":
        return { icon: "payments", color: Colors.orangeAccent };
      default:
        return { icon: "add", color: Colors.greenAccent };
    }
  };

  const getTransactionLabel = (transaction) => {
    switch (transaction.type) {
      case "withdrawal":
        return "Funds Withdrawn";
      case "dues":
        return "Dues Payment";
      case "contribution":
        return "Contribution";
      case "budget":
        return "Budget Allocation";
      case "other":
        return "Miscellaneous";
      default:
        return "Funds Added";
    }
  };

  const formatCurrency = (amount) => {
    return `GH₵${Math.abs(amount).toFixed(2)}`;
  };

  const formatDate = (timestamp) => {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.blueAccent} />
          <ThemedText style={styles.loadingText}>
            Loading financial log...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Year Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.yearScrollView}
        contentContainerStyle={styles.yearContainer}
      >
        {availableYears.map((year) => (
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
      </ScrollView>

      {/* Summary Card */}
      <View
        style={[styles.summaryCard, { backgroundColor: theme.uiBackground }]}
      >
        <ThemedText style={styles.summaryTitle}>
          {selectedYear} Financial Summary
        </ThemedText>

        <View style={styles.summaryRow}>
          <ThemedText style={styles.summaryLabel}>
            Total Transactions:
          </ThemedText>
          <ThemedText style={styles.summaryValue}>
            {filteredTransactions.length}
          </ThemedText>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <MaterialIcons
              name="trending-up"
              size={16}
              color={Colors.greenAccent}
            />
            <ThemedText style={styles.summaryLabel}>Income:</ThemedText>
          </View>
          <ThemedText
            style={[styles.summaryValue, { color: Colors.greenAccent }]}
          >
            GH₵{totalAdded.toFixed(2)}
          </ThemedText>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <MaterialIcons
              name="trending-down"
              size={16}
              color={Colors.redAccent}
            />
            <ThemedText style={styles.summaryLabel}>Expenses:</ThemedText>
          </View>
          <ThemedText
            style={[styles.summaryValue, { color: Colors.redAccent }]}
          >
            GH₵{totalWithdrawn.toFixed(2)}
          </ThemedText>
        </View>

        <View style={[styles.summaryRow, styles.netRow]}>
          <ThemedText style={styles.summaryLabel}>Net Income:</ThemedText>
          <ThemedText
            style={[
              styles.summaryValue,
              {
                color:
                  totalAdded - totalWithdrawn >= 0
                    ? Colors.greenAccent
                    : Colors.redAccent,
              },
            ]}
          >
            GH₵{(totalAdded - totalWithdrawn).toFixed(2)}
          </ThemedText>
        </View>
      </View>

      {/* Transactions List */}
      <ScrollView
        style={styles.transactionsList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons
              name="warning"
              size={48}
              color={Colors.yellowAccent}
            />
            <ThemedText style={styles.emptyStateTitle}>
              Nothing to audit for {selectedYear}
            </ThemedText>
            <ThemedText style={styles.emptyStateSubtext}>
              No financial transactions were recorded for this year
            </ThemedText>
          </View>
        ) : (
          <View>
            {/* Withdrawals Section */}
            {filteredTransactions.some((t) => t.type === "withdrawal") && (
              <>
                <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                  <MaterialIcons
                    name="trending-down"
                    size={20}
                    color={Colors.redAccent}
                  />
                  <ThemedText style={styles.sectionTitle}>
                    Withdrawals
                  </ThemedText>
                </View>

                <ScrollView
                  style={styles.sectionScrollView}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  {filteredTransactions
                    .filter((transaction) => transaction.type === "withdrawal")
                    .map((transaction) => {
                      const { icon, color } = getTransactionIcon(transaction);

                      return (
                        <View
                          key={`${transaction.source}-${transaction.id}`}
                          style={[
                            styles.transactionCard,
                            { backgroundColor: theme.uiBackground },
                          ]}
                        >
                          <View style={styles.transactionHeader}>
                            <View style={styles.transactionInfo}>
                              <View style={styles.transactionDetails}>
                                <ThemedText style={styles.transactionType}>
                                  {getTransactionLabel(transaction)}
                                </ThemedText>
                                <ThemedText
                                  style={styles.transactionDescription}
                                >
                                  {transaction.description}
                                </ThemedText>
                                <ThemedText style={styles.transactionMeta}>
                                  By {transaction.withdrawnBy} •{" "}
                                  {formatDate(transaction.timestamp)}
                                  {transaction.year && ` • ${transaction.year}`}
                                </ThemedText>
                              </View>
                            </View>
                            <View style={styles.amountContainer}>
                              <ThemedText
                                style={[
                                  styles.amount,
                                  { color: Colors.redAccent },
                                ]}
                              >
                                - {formatCurrency(transaction.amount)}
                              </ThemedText>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                </ScrollView>
              </>
            )}

            {/* Income Sources Section */}
            <View style={styles.sectionHeader}>
              <MaterialIcons
                name="trending-up"
                size={20}
                color={Colors.greenAccent}
              />
              <ThemedText style={styles.sectionTitle}>
                Income Sources
              </ThemedText>
            </View>

            <ScrollView
              style={styles.sectionScrollView}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {filteredTransactions
                .filter((transaction) => transaction.type !== "withdrawal")
                .map((transaction) => {
                  const { icon, color } = getTransactionIcon(transaction);

                  return (
                    <View
                      key={`${transaction.source}-${transaction.id}`}
                      style={[
                        styles.transactionCard,
                        { backgroundColor: theme.uiBackground },
                      ]}
                    >
                      <View style={styles.transactionHeader}>
                        <View style={styles.transactionInfo}>
                          <View style={styles.transactionDetails}>
                            <ThemedText style={styles.transactionType}>
                              {getTransactionLabel(transaction)}
                            </ThemedText>
                            <ThemedText style={styles.transactionDescription}>
                              {transaction.description}
                            </ThemedText>
                            <ThemedText style={styles.transactionMeta}>
                              By {transaction.addedBy || transaction.recordedBy}{" "}
                              • {formatDate(transaction.timestamp)}
                              {transaction.type === "dues" &&
                                transaction.year &&
                                ` • ${transaction.year} Dues`}
                              {transaction.type === "budget" &&
                                transaction.year &&
                                ` • ${transaction.year} Budget`}
                            </ThemedText>
                          </View>
                        </View>
                        <View style={styles.amountContainer}>
                          <ThemedText
                            style={[
                              styles.amount,
                              { color: Colors.greenAccent },
                            ]}
                          >
                            + {formatCurrency(transaction.amount)}
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                  );
                })}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
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
  yearScrollView: {
    marginBottom: 16,
    maxHeight: 50,
  },
  yearContainer: {
    paddingHorizontal: 4,
    flexDirection: "row",
  },
  yearButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 4,
    backgroundColor: Colors.uiBackground,
    minWidth: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  yearButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  yearButtonTextSelected: {
    color: "#fff",
  },
  summaryCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  summaryLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  netRow: {
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 8,
    marginTop: 4,
  },
  transactionsList: {
    flex: 1,
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    borderRadius: 12,
    backgroundColor: Colors.uiBackground,
    marginTop: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
    color: Colors.yellowAccent,
  },
  emptyStateSubtext: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: "center",
    lineHeight: 20,
  },
  transactionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  transactionInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    // gap: 12,
  },

  transactionDetails: {
    flex: 1,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  transactionDescription: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 4,
  },
  transactionMeta: {
    fontSize: 12,
    opacity: 0.6,
  },
  amountContainer: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 16,
    fontWeight: "bold",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  sectionScrollView: {
    maxHeight: 400,
    marginBottom: 16,
  },
  withdrawalsScrollView: {
    maxHeight: 400,
    marginBottom: 16,
  },
  incomeScrollView: {
    maxHeight: 350,
    marginBottom: 16,
  },
});

export default FinancialLog;
