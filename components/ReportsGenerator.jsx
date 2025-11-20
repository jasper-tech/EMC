import {
  StyleSheet,
  View,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import React, { useState, useContext } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import { ThemeContext } from "../context/ThemeContext";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Table, TableWrapper, Row, Cell } from "react-native-table-component";

const ReportGenerator = ({
  visible,
  onClose,
  selectedYear,
  members = [],
  transactions = [],
  finances = [],
  duesAllocations = [],
}) => {
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;

  const [generating, setGenerating] = useState(false);
  const [generatingFormat, setGeneratingFormat] = useState(null);

  // Calculate financial data for the report
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
    const allocation = duesAllocations.find((a) => a.year === selectedYear);
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
                          transaction.withdrawnBy ||
                          transaction.addedBy ||
                          "System"
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

  const financialData = calculateFinancialData();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={[
            styles.modalContent,
            { backgroundColor: theme.navBackground },
          ]}
        >
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>
              Generate Report - {selectedYear}
            </ThemedText>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Report Preview */}
            <View style={styles.previewSection}>
              <ThemedText style={styles.previewTitle}>
                Report Preview
              </ThemedText>

              <View style={styles.previewGrid}>
                <View
                  style={[
                    styles.previewCard,
                    { backgroundColor: theme.uiBackground },
                  ]}
                >
                  <MaterialIcons
                    name="trending-up"
                    size={24}
                    color={Colors.greenAccent}
                  />
                  <ThemedText style={styles.previewValue}>
                    GH₵{financialData.totalIncome.toFixed(2)}
                  </ThemedText>
                  <ThemedText style={styles.previewLabel}>
                    Total Income
                  </ThemedText>
                </View>

                <View
                  style={[
                    styles.previewCard,
                    { backgroundColor: theme.uiBackground },
                  ]}
                >
                  <MaterialIcons
                    name="trending-down"
                    size={24}
                    color={Colors.redAccent}
                  />
                  <ThemedText style={styles.previewValue}>
                    GH₵{financialData.totalExpenses.toFixed(2)}
                  </ThemedText>
                  <ThemedText style={styles.previewLabel}>
                    Total Expenses
                  </ThemedText>
                </View>

                <View
                  style={[
                    styles.previewCard,
                    { backgroundColor: theme.uiBackground },
                  ]}
                >
                  <MaterialIcons
                    name="account-balance"
                    size={24}
                    color={Colors.blueAccent}
                  />
                  <ThemedText
                    style={[
                      styles.previewValue,
                      {
                        color:
                          financialData.netIncome >= 0
                            ? Colors.greenAccent
                            : Colors.redAccent,
                      },
                    ]}
                  >
                    GH₵{financialData.netIncome.toFixed(2)}
                  </ThemedText>
                  <ThemedText style={styles.previewLabel}>
                    Net Income
                  </ThemedText>
                </View>

                <View
                  style={[
                    styles.previewCard,
                    { backgroundColor: theme.uiBackground },
                  ]}
                >
                  <MaterialIcons
                    name="people"
                    size={24}
                    color={Colors.purpleAccent}
                  />
                  <ThemedText style={styles.previewValue}>
                    {financialData.membersPaid}/{financialData.totalMembers}
                  </ThemedText>
                  <ThemedText style={styles.previewLabel}>
                    Members Paid
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Export Options */}
            <View style={styles.exportSection}>
              <ThemedText style={styles.exportTitle}>Export Format</ThemedText>

              <TouchableOpacity
                style={[
                  styles.exportButton,
                  { backgroundColor: Colors.redAccent },
                  generating && styles.exportButtonDisabled,
                ]}
                onPress={generatePDFReport}
                disabled={generating}
              >
                {generating && generatingFormat === "pdf" ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialIcons
                      name="picture-as-pdf"
                      size={24}
                      color="#fff"
                    />
                    <ThemedText style={styles.exportButtonText}>
                      Generate PDF Report
                    </ThemedText>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.exportButton,
                  { backgroundColor: Colors.greenAccent },
                  generating && styles.exportButtonDisabled,
                ]}
                onPress={generateExcelReport}
                disabled={generating}
              >
                {generating && generatingFormat === "excel" ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="table-chart" size={24} color="#fff" />
                    <ThemedText style={styles.exportButtonText}>
                      Generate Excel Report
                    </ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Report Contents */}
            <View style={styles.contentsSection}>
              <ThemedText style={styles.contentsTitle}>
                Report Includes:
              </ThemedText>
              <View style={styles.contentsList}>
                <View style={styles.contentItem}>
                  <MaterialIcons
                    name="check-circle"
                    size={16}
                    color={Colors.greenAccent}
                  />
                  <ThemedText style={styles.contentText}>
                    Financial Summary
                  </ThemedText>
                </View>
                <View style={styles.contentItem}>
                  <MaterialIcons
                    name="check-circle"
                    size={16}
                    color={Colors.greenAccent}
                  />
                  <ThemedText style={styles.contentText}>
                    Income Breakdown
                  </ThemedText>
                </View>
                <View style={styles.contentItem}>
                  <MaterialIcons
                    name="check-circle"
                    size={16}
                    color={Colors.greenAccent}
                  />
                  <ThemedText style={styles.contentText}>
                    Expense Details
                  </ThemedText>
                </View>
                <View style={styles.contentItem}>
                  <MaterialIcons
                    name="check-circle"
                    size={16}
                    color={Colors.greenAccent}
                  />
                  <ThemedText style={styles.contentText}>
                    Member Payment Status
                  </ThemedText>
                </View>
                <View style={styles.contentItem}>
                  <MaterialIcons
                    name="check-circle"
                    size={16}
                    color={Colors.greenAccent}
                  />
                  <ThemedText style={styles.contentText}>
                    Transaction History
                  </ThemedText>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  previewSection: {
    marginBottom: 24,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  previewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  previewCard: {
    width: "48%",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    gap: 8,
  },
  previewValue: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  previewLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: "center",
  },
  exportSection: {
    marginBottom: 24,
  },
  exportTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  exportButtonDisabled: {
    opacity: 0.7,
  },
  exportButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  contentsSection: {
    marginBottom: 20,
  },
  contentsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  contentsList: {
    gap: 8,
  },
  contentItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  contentText: {
    fontSize: 14,
  },
});

export default ReportGenerator;
