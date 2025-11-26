import React, { useState, useEffect, useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";
import { Colors } from "../constants/Colors";
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
// import * as FileSystem from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";

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

  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;

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

  const calculateFinancialData = () => {
    const filteredFinances = finances.filter(
      (item) => item.type !== "withdrawal" && item.type !== "dues"
    );

    const combinedData = [...filteredFinances, ...transactions].sort((a, b) => {
      const dateA = a.timestamp?.toDate
        ? a.timestamp.toDate()
        : new Date(a.timestamp);
      const dateB = b.timestamp?.toDate
        ? b.timestamp.toDate()
        : new Date(b.timestamp);
      return dateB - dateA;
    });

    // Now filter the combined data by year (same logic as FinancialLog)
    let totalAdded = 0;
    let totalWithdrawn = 0;

    const filteredTransactions = combinedData.filter((transaction) => {
      let transactionYear;

      if (transaction.type === "dues" || transaction.type === "budget") {
        transactionYear =
          typeof transaction.year === "string"
            ? parseInt(transaction.year)
            : transaction.year;
      } else if (transaction.type === "withdrawal") {
        if (transaction.withdrawalDate) {
          transactionYear = new Date(transaction.withdrawalDate).getFullYear();
        } else {
          const date = transaction.timestamp?.toDate
            ? transaction.timestamp.toDate()
            : new Date(transaction.timestamp);
          transactionYear = date.getFullYear();
        }
      } else {
        const date = transaction.timestamp?.toDate
          ? transaction.timestamp.toDate()
          : new Date(transaction.timestamp);
        transactionYear = date.getFullYear();
      }

      const isInSelectedYear =
        parseInt(transactionYear) === parseInt(selectedYear);

      if (isInSelectedYear) {
        const amount = transaction.amount || 0;
        if (transaction.type === "withdrawal") {
          totalWithdrawn += Math.abs(amount);
        } else {
          totalAdded += Math.abs(amount);
        }
      }

      return isInSelectedYear;
    });

    // Calculate income breakdown from the filtered data
    let duesIncome = 0;
    let contributionsIncome = 0;
    let otherIncome = 0;
    let budgetIncome = 0;

    filteredTransactions.forEach((transaction) => {
      const amount = transaction.amount || 0;

      if (transaction.type !== "withdrawal") {
        switch (transaction.type) {
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
      }
    });

    // Calculate member payment statistics (using original transactions for accuracy)
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

        // Use the original transactions filtered by year for accuracy
        const memberPayments = transactions.filter((t) => {
          if (t.type === "dues" && t.memberId === member.id) {
            let paymentYear;
            if (t.year) {
              paymentYear =
                typeof t.year === "string" ? parseInt(t.year) : t.year;
            } else {
              const date = t.timestamp?.toDate
                ? t.timestamp.toDate()
                : new Date(t.timestamp);
              paymentYear = date.getFullYear();
            }
            return paymentYear === selectedYear;
          }
          return false;
        });

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

    // Prepare transactions for reports
    const incomeTransactions = filteredTransactions.filter(
      (t) => t.type !== "withdrawal"
    );
    const expenseTransactions = filteredTransactions.filter(
      (t) => t.type === "withdrawal"
    );

    return {
      totalIncome: totalAdded,
      totalExpenses: totalWithdrawn,
      netIncome: totalAdded - totalWithdrawn,
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
      totalTransactions: filteredTransactions.length,
      collectionRate:
        totalDuesExpected > 0
          ? (totalDuesCollected / totalDuesExpected) * 100
          : 0,
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
                    <td>${
                      transaction.addedBy || transaction.recordedBy || "System"
                    }</td>
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
          transaction.addedBy || transaction.recordedBy || "System"
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

      // Create and share file using NEW FileSystem API
      const filename = `financial_report_${selectedYear}_${Date.now()}.csv`;

      // Create a file in the cache directory
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      // Write the file using the new API
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Check if sharing is available
      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (!isSharingAvailable) {
        Alert.alert("Error", "Sharing is not available on this device");
        return;
      }

      // Share the file
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
      <View
        style={[styles.loadingContainer, { backgroundColor: theme.background }]}
      >
        <ActivityIndicator size="large" color={Colors.blueAccent} />
        <Text style={[styles.loadingText, { color: theme.text }]}>
          Loading reports data...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      {/* <View style={styles.header}>
        <View style={styles.headerIcon}>
          <MaterialIcons name="download" size={32} color="#fff" />
        </View>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Generate Reports
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.text }]}>
          Download comprehensive financial reports for any year
        </Text>
      </View> */}

      {/* Year Selection */}
      <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Select Report Year
          </Text>
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
                  { backgroundColor: theme.inputBackground },
                  selectedYear === year && styles.yearButtonSelected,
                ]}
                onPress={() => setSelectedYear(year)}
              >
                <Text
                  style={[
                    styles.yearButtonText,
                    { color: theme.text },
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
      <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Report Preview - {selectedYear}
        </Text>

        <View style={styles.previewGrid}>
          <View
            style={[
              styles.previewCard,
              styles.incomeCard,
              { backgroundColor: theme.uiBackground },
            ]}
          >
            <View style={styles.previewCardHeader}>
              <MaterialIcons
                name="trending-up"
                size={20}
                color={Colors.greenAccent}
              />
              <Text style={[styles.previewCardLabel, { color: theme.text }]}>
                Income
              </Text>
            </View>
            <Text style={[styles.previewCardValue, { color: theme.text }]}>
              GH₵{reportData.totalIncome.toLocaleString()}
            </Text>
          </View>

          <View
            style={[
              styles.previewCard,
              styles.expenseCard,
              { backgroundColor: theme.uiBackground },
            ]}
          >
            <View style={styles.previewCardHeader}>
              <MaterialIcons
                name="trending-down"
                size={20}
                color={Colors.redAccent}
              />
              <Text style={[styles.previewCardLabel, { color: theme.text }]}>
                Expenses
              </Text>
            </View>
            <Text style={[styles.previewCardValue, { color: theme.text }]}>
              GH₵{reportData.totalExpenses.toLocaleString()}
            </Text>
          </View>

          <View
            style={[
              styles.previewCard,
              styles.netIncomeCard,
              { backgroundColor: theme.uiBackground },
            ]}
          >
            <View style={styles.previewCardHeader}>
              <Text style={[styles.previewCardLabel, { color: theme.text }]}>
                Net Income
              </Text>
            </View>
            <Text
              style={[
                styles.previewCardValue,
                {
                  color:
                    reportData.netIncome >= 0
                      ? Colors.greenAccent
                      : Colors.redAccent,
                },
              ]}
            >
              GH₵{reportData.netIncome.toLocaleString()}
            </Text>
          </View>

          <View
            style={[
              styles.previewCard,
              styles.membersCard,
              { backgroundColor: theme.uiBackground },
            ]}
          >
            <View style={styles.previewCardHeader}>
              <Text style={[styles.previewCardLabel, { color: theme.text }]}>
                Members Paid
              </Text>
            </View>
            <Text style={[styles.previewCardValue, { color: theme.text }]}>
              {reportData.membersPaid}/{reportData.totalMembers}
            </Text>
          </View>
        </View>

        <View
          style={[styles.infoBox, { backgroundColor: theme.infoBackground }]}
        >
          <MaterialIcons name="info" size={20} color={Colors.blueAccent} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: theme.text }]}>
              Report Includes:
            </Text>
            <Text style={[styles.infoText, { color: theme.text }]}>
              • Financial summary and breakdown
            </Text>
            <Text style={[styles.infoText, { color: theme.text }]}>
              • Income and expense transactions
            </Text>
            <Text style={[styles.infoText, { color: theme.text }]}>
              • Member payment status and dues allocation
            </Text>
            <Text style={[styles.infoText, { color: theme.text }]}>
              • Detailed transaction history
            </Text>
          </View>
        </View>
      </View>

      {/* Download Options */}
      <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Download Report
        </Text>

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
                {/* <Text style={styles.downloadButtonText}>PDF Report</Text> */}
                <Text style={styles.downloadButtonSubtext}>
                  Formatted document with tables
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
                {/* <Text style={styles.downloadButtonText}>Excel Report</Text> */}
                <Text style={styles.downloadButtonSubtext}>
                  Raw data in CSV format for analysis
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View
          style={[styles.noteBox, { backgroundColor: theme.warningBackground }]}
        >
          <MaterialIcons name="warning" size={20} color={Colors.yellowAccent} />
          <Text style={[styles.noteText, { color: theme.text }]}>
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
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
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
    marginBottom: 8,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  section: {
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
  },
  //   incomeCard: {
  //     borderLeftWidth: 4,
  //     borderLeftColor: "#16a34a",
  //   },
  //   expenseCard: {
  //     borderLeftWidth: 4,
  //     borderLeftColor: "#dc2626",
  //   },
  //   netIncomeCard: {
  //     borderLeftWidth: 4,
  //     borderLeftColor: "#3b82f6",
  //   },
  //   membersCard: {
  //     borderLeftWidth: 4,
  //     borderLeftColor: "#7c3aed",
  //   },
  previewCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 4,
  },
  previewCardLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  previewCardValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
  infoBox: {
    flexDirection: "row",
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
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
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
    backgroundColor: Colors.redAccent,
  },
  excelButton: {
    backgroundColor: Colors.greenAccent,
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
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 16,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
});

export default GenerateReportsPage;
