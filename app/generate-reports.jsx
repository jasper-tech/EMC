import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Text,
} from "react-native";
import { MaterialIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";

const GenerateReportsPage = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingFormat, setGeneratingFormat] = useState(null);

  // Firebase data states
  const [members, setMembers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [finances, setFinances] = useState([]);
  const [duesAllocations, setDuesAllocations] = useState([]);

  // Generate years from 2022 to current year
  const years = Array.from(
    { length: new Date().getFullYear() - 2021 },
    (_, i) => 2022 + i
  ).reverse();

  // Load Firebase data
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);

      // Load members
      const membersRef = collection(db, "members");
      const membersQuery = query(membersRef, orderBy("fullname"));
      const membersUnsubscribe = onSnapshot(membersQuery, (snapshot) => {
        const membersList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMembers(membersList);
      });

      // Load transactions
      const transactionsRef = collection(db, "transactions");
      const transactionsQuery = query(
        transactionsRef,
        orderBy("timestamp", "desc")
      );
      const transactionsUnsubscribe = onSnapshot(
        transactionsQuery,
        (snapshot) => {
          const transactionsList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setTransactions(transactionsList);
        }
      );

      // Load finances
      const financesRef = collection(db, "finances");
      const financesQuery = query(financesRef);
      const financesUnsubscribe = onSnapshot(financesQuery, (snapshot) => {
        const financesList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setFinances(financesList);
      });

      // Load dues allocations
      const allocationsRef = collection(db, "duesAllocations");
      const allocationsQuery = query(allocationsRef, orderBy("year", "desc"));
      const allocationsUnsubscribe = onSnapshot(
        allocationsQuery,
        (snapshot) => {
          const allocationsList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setDuesAllocations(allocationsList);
          setLoading(false);
        }
      );

      // Cleanup function
      return () => {
        membersUnsubscribe();
        transactionsUnsubscribe();
        financesUnsubscribe();
        allocationsUnsubscribe();
      };
    } catch (error) {
      console.error("Error loading data:", error);
      setLoading(false);
    }
  };

  // Get dues allocation for year (same as YearlyReports)
  const getDuesAllocationForYear = (year) => {
    return duesAllocations.find((allocation) => allocation.year === year);
  };

  // Calculate member payment summary (same as YearlyReports)
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

  // Calculate financial data (same as ReportGenerator)
  const calculateFinancialData = () => {
    // Filter transactions and finances for selected year
    const yearTransactions = transactions.filter((t) => {
      const transactionYear =
        t.year ||
        (t.timestamp?.toDate
          ? t.timestamp.toDate().getFullYear()
          : new Date(t.timestamp).getFullYear());
      return transactionYear === selectedYear;
    });

    const yearFinances = finances.filter((f) => {
      if (f.type === "budget" || f.type === "dues") {
        return f.year === selectedYear;
      } else {
        const financeYear = f.timestamp?.toDate
          ? f.timestamp.toDate().getFullYear()
          : new Date(f.timestamp).getFullYear();
        return financeYear === selectedYear;
      }
    });

    // Calculate totals
    let totalIncome = 0;
    let totalExpenses = 0;
    let duesIncome = 0;
    let contributionsIncome = 0;
    let otherIncome = 0;
    let budgetIncome = 0;

    yearFinances.forEach((finance) => {
      const amount = finance.amount || 0;
      if (amount > 0) {
        totalIncome += amount;
        switch (finance.type) {
          case "dues":
            duesIncome += amount;
            break;
          case "contribution":
            contributionsIncome += amount;
            break;
          case "other":
            otherIncome += amount;
            break;
          case "budget":
            budgetIncome += amount;
            break;
        }
      } else {
        totalExpenses += Math.abs(amount);
      }
    });

    // Calculate member payment statistics
    const allocation = getDuesAllocationForYear(selectedYear);
    let membersPaid = 0;
    let membersOwing = 0;
    let totalDuesExpected = 0;
    let totalDuesCollected = 0;

    if (allocation) {
      members.forEach((member) => {
        const monthlyAmount = member.isExecutive
          ? allocation.executiveAmount
          : allocation.regularAmount;
        const expectedAmount = monthlyAmount * 12;
        totalDuesExpected += expectedAmount;

        const memberPayments = yearTransactions.filter(
          (t) => t.type === "dues" && t.memberId === member.id
        );
        const paidAmount = memberPayments.reduce(
          (sum, payment) => sum + payment.amount,
          0
        );
        totalDuesCollected += paidAmount;

        if (paidAmount >= expectedAmount) {
          membersPaid++;
        } else {
          membersOwing++;
        }
      });
    }

    // Get detailed transactions
    const incomeTransactions = yearFinances.filter((f) => f.amount > 0);
    const expenseTransactions = [
      ...yearFinances.filter((f) => f.amount < 0),
      ...yearTransactions.filter((t) => t.type === "withdrawal"),
    ];

    return {
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      duesIncome,
      contributionsIncome,
      otherIncome,
      budgetIncome,
      membersPaid,
      membersOwing,
      totalMembers: members.length,
      totalDuesExpected,
      totalDuesCollected,
      incomeTransactions,
      expenseTransactions,
      allocation,
    };
  };

  const generatePDFReport = async () => {
    setGenerating(true);
    setGeneratingFormat("pdf");

    try {
      const financialData = calculateFinancialData();

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .section { margin-bottom: 25px; }
            .section-title { background: #f0f0f0; padding: 8px; font-weight: bold; margin-bottom: 10px; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .table th { background-color: #f8f8f8; }
            .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
            .summary-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
            .positive { color: green; }
            .negative { color: red; }
            .stat-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Financial Report - ${selectedYear}</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>

          <div class="section">
            <div class="section-title">Financial Summary</div>
            <div class="summary-grid">
              <div class="summary-card">
                <h3>Income Summary</h3>
                <div class="stat-row"><span>Total Income:</span> <span class="positive">GH₵${financialData.totalIncome.toFixed(
                  2
                )}</span></div>
                <div class="stat-row"><span>Dues Income:</span> <span>GH₵${financialData.duesIncome.toFixed(
                  2
                )}</span></div>
                <div class="stat-row"><span>Contributions:</span> <span>GH₵${financialData.contributionsIncome.toFixed(
                  2
                )}</span></div>
                <div class="stat-row"><span>Other Income:</span> <span>GH₵${financialData.otherIncome.toFixed(
                  2
                )}</span></div>
                <div class="stat-row"><span>Budget:</span> <span>GH₵${financialData.budgetIncome.toFixed(
                  2
                )}</span></div>
              </div>
              
              <div class="summary-card">
                <h3>Expenses & Members</h3>
                <div class="stat-row"><span>Total Expenses:</span> <span class="negative">GH₵${financialData.totalExpenses.toFixed(
                  2
                )}</span></div>
                <div class="stat-row"><span>Net Income:</span> <span class="${
                  financialData.netIncome >= 0 ? "positive" : "negative"
                }">GH₵${financialData.netIncome.toFixed(2)}</span></div>
                <div class="stat-row"><span>Members Paid:</span> <span>${
                  financialData.membersPaid
                }/${financialData.totalMembers}</span></div>
                <div class="stat-row"><span>Members Owing:</span> <span>${
                  financialData.membersOwing
                }</span></div>
                <div class="stat-row"><span>Dues Collection:</span> <span>${(
                  (financialData.totalDuesCollected /
                    financialData.totalDuesExpected) *
                    100 || 0
                ).toFixed(1)}%</span></div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Income Transactions</div>
            <table class="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Added By</th>
                </tr>
              </thead>
              <tbody>
                ${financialData.incomeTransactions
                  .map(
                    (transaction) => `
                  <tr>
                    <td>${new Date(
                      transaction.timestamp?.toDate
                        ? transaction.timestamp.toDate()
                        : transaction.timestamp
                    ).toLocaleDateString()}</td>
                    <td>${transaction.type}</td>
                    <td>${transaction.description}</td>
                    <td class="positive">GH₵${Math.abs(
                      transaction.amount
                    ).toFixed(2)}</td>
                    <td>${transaction.addedBy || "System"}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Expense Transactions</div>
            <table class="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                ${financialData.expenseTransactions
                  .map(
                    (transaction) => `
                  <tr>
                    <td>${new Date(
                      transaction.timestamp?.toDate
                        ? transaction.timestamp.toDate()
                        : transaction.timestamp
                    ).toLocaleDateString()}</td>
                    <td>${transaction.type}</td>
                    <td>${transaction.description}</td>
                    <td class="negative">GH₵${Math.abs(
                      transaction.amount
                    ).toFixed(2)}</td>
                    <td>${
                      transaction.withdrawnBy || transaction.addedBy || "System"
                    }</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>

          ${
            financialData.allocation
              ? `
          <div class="section">
            <div class="section-title">Dues Allocation for ${selectedYear}</div>
            <table class="table">
              <tr><th>Member Type</th><th>Monthly Amount</th><th>Annual Amount</th></tr>
              <tr><td>Regular Members</td><td>GH₵${financialData.allocation.regularAmount.toFixed(
                2
              )}</td><td>GH₵${(
                  financialData.allocation.regularAmount * 12
                ).toFixed(2)}</td></tr>
              <tr><td>Executive Members</td><td>GH₵${financialData.allocation.executiveAmount.toFixed(
                2
              )}</td><td>GH₵${(
                  financialData.allocation.executiveAmount * 12
                ).toFixed(2)}</td></tr>
            </table>
          </div>
          `
              : ""
          }
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `Financial Report ${selectedYear}`,
        UTI: "com.adobe.pdf",
      });

      Alert.alert("Success", "PDF report generated successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      Alert.alert("Error", "Failed to generate PDF report");
    } finally {
      setGenerating(false);
      setGeneratingFormat(null);
    }
  };

  const generateExcelReport = async () => {
    setGenerating(true);
    setGeneratingFormat("excel");

    try {
      const financialData = calculateFinancialData();

      // Create CSV content
      let csvContent = "Financial Report - " + selectedYear + "\n";
      csvContent += "Generated on," + new Date().toLocaleDateString() + "\n\n";

      // Financial Summary
      csvContent += "FINANCIAL SUMMARY\n";
      csvContent += "Category,Amount\n";
      csvContent +=
        "Total Income,GH₵" + financialData.totalIncome.toFixed(2) + "\n";
      csvContent +=
        "Dues Income,GH₵" + financialData.duesIncome.toFixed(2) + "\n";
      csvContent +=
        "Contributions,GH₵" +
        financialData.contributionsIncome.toFixed(2) +
        "\n";
      csvContent +=
        "Other Income,GH₵" + financialData.otherIncome.toFixed(2) + "\n";
      csvContent += "Budget,GH₵" + financialData.budgetIncome.toFixed(2) + "\n";
      csvContent +=
        "Total Expenses,GH₵" + financialData.totalExpenses.toFixed(2) + "\n";
      csvContent +=
        "Net Income,GH₵" + financialData.netIncome.toFixed(2) + "\n";
      csvContent +=
        "Members Paid," +
        financialData.membersPaid +
        "/" +
        financialData.totalMembers +
        "\n";
      csvContent += "Members Owing," + financialData.membersOwing + "\n";
      csvContent +=
        "Dues Collection Rate," +
        (
          (financialData.totalDuesCollected / financialData.totalDuesExpected) *
            100 || 0
        ).toFixed(1) +
        "%\n\n";

      // Income Transactions
      csvContent += "INCOME TRANSACTIONS\n";
      csvContent += "Date,Type,Description,Amount,Added By\n";
      financialData.incomeTransactions.forEach((transaction) => {
        const date = new Date(
          transaction.timestamp?.toDate
            ? transaction.timestamp.toDate()
            : transaction.timestamp
        );
        csvContent += `${date.toLocaleDateString()},${transaction.type},"${
          transaction.description
        }",GH₵${Math.abs(transaction.amount).toFixed(2)},${
          transaction.addedBy || "System"
        }\n`;
      });

      csvContent += "\nEXPENSE TRANSACTIONS\n";
      csvContent += "Date,Type,Description,Amount,By\n";
      financialData.expenseTransactions.forEach((transaction) => {
        const date = new Date(
          transaction.timestamp?.toDate
            ? transaction.timestamp.toDate()
            : transaction.timestamp
        );
        csvContent += `${date.toLocaleDateString()},${transaction.type},"${
          transaction.description
        }",GH₵${Math.abs(transaction.amount).toFixed(2)},${
          transaction.withdrawnBy || transaction.addedBy || "System"
        }\n`;
      });

      // Create and share file
      const filename = `financial_report_${selectedYear}_${Date.now()}.csv`;
      const fileUri = FileSystem.cacheDirectory + filename;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await Sharing.shareAsync(fileUri, {
        mimeType: "text/csv",
        dialogTitle: `Financial Report ${selectedYear}`,
        UTI: "public.comma-separated-values-text",
      });

      Alert.alert("Success", "Excel (CSV) report generated successfully!");
    } catch (error) {
      console.error("Error generating Excel:", error);
      Alert.alert("Error", "Failed to generate Excel report");
    } finally {
      setGenerating(false);
      setGeneratingFormat(null);
    }
  };

  const reportData = calculateFinancialData();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading reports data...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <MaterialIcons name="download" size={32} color="#fff" />
        </View>
        <Text style={styles.headerTitle}>Generate Reports</Text>
        <Text style={styles.headerSubtitle}>
          Download comprehensive financial reports for any year
        </Text>
      </View>

      {/* Year Selection */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="calendar-today" size={20} color="#3b82f6" />
          <Text style={styles.sectionTitle}>Select Report Year</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.yearsScrollView}
        >
          <View style={styles.yearsContainer}>
            {years.map((year) => (
              <TouchableOpacity
                key={year}
                style={[
                  styles.yearButton,
                  selectedYear === year && styles.yearButtonSelected,
                ]}
                onPress={() => setSelectedYear(year)}
              >
                <Text
                  style={[
                    styles.yearButtonText,
                    selectedYear === year && styles.yearButtonTextSelected,
                  ]}
                >
                  {year}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Report Preview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Report Preview - {selectedYear}</Text>

        <View style={styles.previewGrid}>
          <View style={[styles.previewCard, styles.incomeCard]}>
            <View style={styles.previewCardHeader}>
              <MaterialIcons name="trending-up" size={20} color="#16a34a" />
              <Text style={styles.previewCardLabel}>Income</Text>
            </View>
            <Text style={styles.previewCardValue}>
              GH₵{reportData.totalIncome.toLocaleString()}
            </Text>
          </View>

          <View style={[styles.previewCard, styles.expenseCard]}>
            <View style={styles.previewCardHeader}>
              <MaterialIcons name="trending-down" size={20} color="#dc2626" />
              <Text style={styles.previewCardLabel}>Expenses</Text>
            </View>
            <Text style={styles.previewCardValue}>
              GH₵{reportData.totalExpenses.toLocaleString()}
            </Text>
          </View>

          <View style={[styles.previewCard, styles.netIncomeCard]}>
            <View style={styles.previewCardHeader}>
              <MaterialIcons
                name="account-balance-wallet"
                size={20}
                color="#3b82f6"
              />
              <Text style={styles.previewCardLabel}>Net Income</Text>
            </View>
            <Text
              style={[
                styles.previewCardValue,
                { color: reportData.netIncome >= 0 ? "#3b82f6" : "#dc2626" },
              ]}
            >
              GH₵{reportData.netIncome.toLocaleString()}
            </Text>
          </View>

          <View style={[styles.previewCard, styles.membersCard]}>
            <View style={styles.previewCardHeader}>
              <Ionicons name="people" size={20} color="#7c3aed" />
              <Text style={styles.previewCardLabel}>Members Paid</Text>
            </View>
            <Text style={styles.previewCardValue}>
              {reportData.membersPaid}/{reportData.totalMembers}
            </Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <MaterialIcons name="info" size={20} color="#3b82f6" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Report Includes:</Text>
            <Text style={styles.infoText}>
              • Financial summary and breakdown
            </Text>
            <Text style={styles.infoText}>
              • Income and expense transactions
            </Text>
            <Text style={styles.infoText}>
              • Member payment status and dues allocation
            </Text>
            <Text style={styles.infoText}>• Detailed transaction history</Text>
          </View>
        </View>
      </View>

      {/* Download Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Download Report</Text>

        <View style={styles.downloadGrid}>
          {/* PDF Option */}
          <TouchableOpacity
            style={[styles.downloadButton, styles.pdfButton]}
            onPress={generatePDFReport}
            disabled={generating}
          >
            {generating && generatingFormat === "pdf" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="picture-as-pdf" size={32} color="#fff" />
                <Text style={styles.downloadButtonText}>PDF Report</Text>
                <Text style={styles.downloadButtonSubtext}>
                  Formatted document with charts and tables
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Excel Option */}
          <TouchableOpacity
            style={[styles.downloadButton, styles.excelButton]}
            onPress={generateExcelReport}
            disabled={generating}
          >
            {generating && generatingFormat === "excel" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <FontAwesome5 name="file-excel" size={32} color="#fff" />
                <Text style={styles.downloadButtonText}>Excel Report</Text>
                <Text style={styles.downloadButtonSubtext}>
                  Raw data in CSV format for analysis
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.noteBox}>
          <MaterialIcons name="warning" size={20} color="#d97706" />
          <Text style={styles.noteText}>
            Reports may take a few moments to generate depending on the amount
            of data for {selectedYear}.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: "#f8fafc",
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
    fontWeight: "500",
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  headerIcon: {
    width: 64,
    height: 64,
    backgroundColor: "#3b82f6",
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 8,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 16,
  },
  yearsScrollView: {
    marginHorizontal: -20,
  },
  yearsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
  },
  yearButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    minWidth: 80,
    alignItems: "center",
  },
  yearButtonSelected: {
    backgroundColor: "#3b82f6",
    transform: [{ scale: 1.05 }],
  },
  yearButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748b",
  },
  yearButtonTextSelected: {
    color: "#fff",
  },
  previewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  previewCard: {
    width: "48%",
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
  },
  incomeCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#16a34a",
  },
  expenseCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#dc2626",
  },
  netIncomeCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#3b82f6",
  },
  membersCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#7c3aed",
  },
  previewCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 4,
  },
  previewCardLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  previewCardValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#eff6ff",
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e40af",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: "#374151",
    marginBottom: 2,
  },
  downloadGrid: {
    gap: 12,
  },
  downloadButton: {
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    gap: 12,
  },
  pdfButton: {
    backgroundColor: "#dc2626",
  },
  excelButton: {
    backgroundColor: "#16a34a",
  },
  downloadButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  downloadButtonSubtext: {
    fontSize: 14,
    color: "#fff",
    textAlign: "center",
    opacity: 0.9,
  },
  noteBox: {
    flexDirection: "row",
    backgroundColor: "#fffbeb",
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 16,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: "#92400e",
    fontWeight: "500",
  },
});

export default GenerateReportsPage;
