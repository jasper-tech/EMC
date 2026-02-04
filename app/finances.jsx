import React, { useState, useEffect, useContext } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import { ThemeContext } from "../context/ThemeContext";
import {
  collection,
  addDoc,
  query,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { router } from "expo-router";
import { CustomAlert } from "../components/CustomAlert";
import AddMoneyModal from "../components/AddMoneyModal";
import ConfirmationModal from "../components/ConfirmationModal";

const Finances = () => {
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;

  const [totalAmount, setTotalAmount] = useState(0);
  const [duesAmount, setDuesAmount] = useState(0);
  const [contributionsAmount, setContributionsAmount] = useState(0);
  const [othersAmount, setOthersAmount] = useState(0);
  const [budgetAmount, setBudgetAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userFullName, setUserFullName] = useState("");
  const [withdrawalsAmount, setWithdrawalsAmount] = useState(0);
  const [withdrawalsTimeSpan, setWithdrawalsTimeSpan] = useState("");
  const [totalMoneyFlow, setTotalMoneyFlow] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [existingBudgetYears, setExistingBudgetYears] = useState([]);

  // State for modals - ensure only one modal is visible at a time
  const [showAddModal, setShowAddModal] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [showAddConfirmationModal, setShowAddConfirmationModal] =
    useState(false);

  // State for alerts
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    type: "info",
    title: "",
    message: "",
    confirmText: "OK",
    cancelText: null,
    onConfirm: () => {},
    autoClose: true,
    dismissOnBackdrop: true,
  });

  // State for form data
  const [selectedType, setSelectedType] = useState(null);
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString()
  );
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    addedBy: "",
    type: "",
  });

  // State for pending addition (to confirm)
  const [pendingAddition, setPendingAddition] = useState({
    amount: 0,
    type: "",
    description: "",
    year: "",
  });

  // Loading states
  const [addLoading, setAddLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  // Fetch user data and finances
  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserFullName(userData.fullName || "");
            setIsAdmin(userData.role === "admin" || userData.isAdmin === true);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    };

    fetchUserData();

    const financesRef = collection(db, "finances");
    const q = query(financesRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let total = 0;
        let dues = 0;
        let contributions = 0;
        let others = 0;
        let budget = 0;
        let withdrawals = 0;
        const budgetYears = [];

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const amount = data.amount || 0;

          total += amount;

          switch (data.type) {
            case "dues":
              dues += amount;
              break;
            case "contribution":
              contributions += amount;
              break;
            case "other":
              others += amount;
              break;
            case "budget":
              budget += amount;
              if (data.year) {
                budgetYears.push(data.year);
              }
              break;
            case "withdrawal":
              withdrawals += Math.abs(amount);
              break;
          }
        });

        const moneyFlow = total + withdrawals;

        if (withdrawals > 0) {
          setWithdrawalsTimeSpan("All-time");
        } else {
          setWithdrawalsTimeSpan("No withdrawals yet");
        }

        setTotalAmount(total);
        setDuesAmount(dues);
        setContributionsAmount(contributions);
        setOthersAmount(others);
        setBudgetAmount(budget);
        setWithdrawalsAmount(withdrawals);
        setTotalMoneyFlow(moneyFlow);
        setExistingBudgetYears(budgetYears);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching finances:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Helper functions
  const formatCurrency = (amount) => {
    return `GH₵${amount.toFixed(2)}`;
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "dues":
        return Colors.blueAccent;
      case "contribution":
        return Colors.greenAccent;
      case "other":
        return Colors.orangeAccent;
      case "budget":
        return Colors.purpleAccent;
      default:
        return Colors.primary;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case "dues":
        return "Dues";
      case "contribution":
        return "Contributions";
      case "other":
        return "Miscellaneous";
      case "budget":
        return "Budget";
      default:
        return "";
    }
  };

  // Helper to format amount with 2 decimal places
  const formatAmount = (value) => {
    // Remove any non-numeric characters except decimal point
    let cleaned = value.replace(/[^0-9.]/g, "");

    // Ensure only one decimal point
    const decimalParts = cleaned.split(".");
    if (decimalParts.length > 2) {
      cleaned = decimalParts[0] + "." + decimalParts.slice(1).join("");
    }

    // Limit to 2 decimal places
    if (decimalParts.length > 1) {
      cleaned = decimalParts[0] + "." + decimalParts[1].substring(0, 2);
    }

    return cleaned;
  };

  // Alert helper - close all modals before showing alert
  const showAlert = (config) => {
    // Close all modals before showing alert
    setShowAddModal(false);
    setShowAddConfirmationModal(false);
    setShowClearConfirmModal(false);

    setAlertConfig({
      ...alertConfig,
      ...config,
      onConfirm: () => {
        setAlertVisible(false);
        if (config.onConfirm) config.onConfirm();
      },
      onCancel: () => {
        setAlertVisible(false);
        if (config.onCancel) config.onCancel();
      },
    });
    setAlertVisible(true);
  };

  // Add money modal functions
  const openAddModal = (type) => {
    if (type === "budget") {
      const currentYear = new Date().getFullYear().toString();
      if (existingBudgetYears.includes(currentYear)) {
        showAlert({
          type: "danger",
          title: "Error",
          message: `Budget for ${currentYear} has already been added`,
        });
        return;
      }
      setSelectedYear(currentYear);
      setFormData({
        amount: "",
        description: `Budget for ${currentYear}`,
        addedBy: userFullName,
        type,
      });
    } else if (type === "dues") {
      const currentYear = new Date().getFullYear().toString();
      setSelectedYear(currentYear);
      setFormData({
        amount: "",
        description: `Dues payment for ${currentYear}`,
        addedBy: userFullName,
        type,
      });
    } else {
      setFormData({
        amount: "",
        description: "",
        addedBy: userFullName,
        type,
      });
    }
    setSelectedType(type);
    setShowAddModal(true);
  };

  // Handle form submission from AddMoneyModal
  const handleAddMoneySubmit = () => {
    if (!formData.amount || !formData.addedBy) {
      showAlert({
        type: "danger",
        title: "Error",
        message: "Please fill in all fields",
      });
      return;
    }

    if (
      formData.type === "budget" &&
      existingBudgetYears.includes(selectedYear)
    ) {
      showAlert({
        type: "danger",
        title: "Error",
        message: `Budget for ${selectedYear} has already been added`,
      });
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      showAlert({
        type: "danger",
        title: "Error",
        message: "Please enter a valid amount greater than 0",
      });
      return;
    }

    // Store pending addition for confirmation
    setPendingAddition({
      amount: amount,
      type: formData.type,
      description: formData.description || formData.type,
      year: selectedYear,
    });

    // Show confirmation modal
    setShowAddConfirmationModal(true);
    // Close the add money modal first
    setShowAddModal(false);
  };

  // Execute the actual addition after confirmation
  const executeAddMoney = async () => {
    setAddLoading(true);

    try {
      const user = auth.currentUser;
      const { amount, type, description, year } = pendingAddition;

      const financeData = {
        amount: amount,
        description: description,
        addedBy: userFullName,
        userId: user?.uid || "unknown",
        timestamp: new Date(),
        type: type,
      };

      // Add year field for budget and dues
      if (type === "budget" || type === "dues") {
        financeData.year = year;
      }

      // Save to finances collection
      await addDoc(collection(db, "finances"), financeData);

      // If it's dues, also save to transactions collection
      if (type === "dues") {
        const transactionData = {
          amount: amount,
          description: description,
          recordedBy: userFullName,
          recordedById: user?.uid || "unknown",
          timestamp: new Date(),
          type: "dues",
          year: year,
          status: "completed",
        };

        await addDoc(collection(db, "transactions"), transactionData);
      }

      const typeLabel =
        type === "dues"
          ? "Dues"
          : type === "contribution"
          ? "Contribution"
          : type === "budget"
          ? `Budget for ${year}`
          : "Miscellaneous";

      const notificationMessage =
        type === "budget"
          ? `${userFullName} set budget of GH₵${amount.toFixed(2)} for ${year}`
          : `${userFullName} added GH₵${amount.toFixed(
              2
            )} to ${typeLabel.toLowerCase()}`;

      await addDoc(collection(db, "notifications"), {
        type: "payment_received",
        title: `${typeLabel} Added`,
        message: notificationMessage,
        timestamp: new Date(),
        read: false,
      });

      // Close confirmation modal
      setShowAddConfirmationModal(false);

      // Clear form data
      setFormData({ amount: "", description: "", addedBy: "", type: "" });
      setSelectedType(null);
      setSelectedYear(new Date().getFullYear().toString());

      // Show success alert
      showAlert({
        type: "success",
        title: "Success",
        message: `GH₵${amount.toFixed(2)} added to ${typeLabel} successfully!`,
      });
    } catch (error) {
      console.error("Error adding money:", error);

      // Close confirmation modal
      setShowAddConfirmationModal(false);

      // Show error alert
      showAlert({
        type: "failed",
        title: "Error",
        message: "Failed to add money. Please try again.",
      });
    } finally {
      setAddLoading(false);
      setPendingAddition({
        amount: 0,
        type: "",
        description: "",
        year: "",
      });
    }
  };

  // Clear finances functions
  const handleClearAllFinances = () => {
    if (!isAdmin) {
      showAlert({
        type: "danger",
        title: "Permission Denied",
        message: "Only administrators can perform this action.",
      });
      return;
    }

    setShowClearConfirmModal(true);
  };

  const executeClearAllFinances = async () => {
    setClearLoading(true);

    try {
      // Step 1: Get document counts
      const financesSnapshot = await getDocs(collection(db, "finances"));
      const transactionsSnapshot = await getDocs(
        collection(db, "transactions")
      );

      const financesCount = financesSnapshot.size;
      const transactionsCount = transactionsSnapshot.size;

      if (financesCount === 0 && transactionsCount === 0) {
        setShowClearConfirmModal(false);
        showAlert({
          type: "info",
          title: "No Data to Clear",
          message: "There are no financial records or transactions to delete.",
        });
        return;
      }

      //  Delete finances
      if (financesCount > 0) {
        const batch1 = writeBatch(db);
        financesSnapshot.docs.forEach((doc) => batch1.delete(doc.ref));
        await batch1.commit();
        console.log(`Deleted ${financesCount} finance records`);
      }

      // Delete transactions
      if (transactionsCount > 0) {
        const batch2 = writeBatch(db);
        transactionsSnapshot.docs.forEach((doc) => batch2.delete(doc.ref));
        await batch2.commit();
        console.log(`Deleted ${transactionsCount} transaction records`);
      }

      // Create audit log
      try {
        const user = auth.currentUser;
        await addDoc(collection(db, "audit_logs"), {
          action: "clear_all_finances",
          performedBy: userFullName,
          performedById: user?.uid,
          timestamp: new Date(),
          details: {
            totalAmountCleared: totalAmount,
            financesCount: financesCount,
            transactionsCount: transactionsCount,
          },
        });
      } catch (logError) {
        console.warn("Audit log creation failed (non-critical):", logError);
      }

      // Step 5: Success
      setShowClearConfirmModal(false);

      showAlert({
        type: "success",
        title: "Success",
        message: `All financial data has been cleared successfully!\n\n• Finances: ${financesCount} records deleted\n• Transactions: ${transactionsCount} records deleted\n• Total amount cleared: GH₵${totalAmount.toFixed(
          2
        )}`,
      });
    } catch (error) {
      console.error("Error clearing finances:", error);

      setShowClearConfirmModal(false);

      showAlert({
        type: "failed",
        title: "Error",
        message: `Failed to clear financial data: ${error.message}`,
      });
    } finally {
      setClearLoading(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.blueAccent} />
          <ThemedText style={styles.loadingText}>
            Loading finances...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Custom Alert - Should be on top of everything */}
      <CustomAlert {...alertConfig} visible={alertVisible} />

      {/* Clear Confirmation Modal */}
      <ConfirmationModal
        visible={showClearConfirmModal}
        onClose={() => setShowClearConfirmModal(false)}
        onConfirm={executeClearAllFinances}
        type="danger"
        title="Clear All Financial Data"
        message={`This will permanently delete ALL financial data (GH₵${totalAmount.toFixed(
          2
        )}) and transactions . This action cannot be undone!\n\nAre you absolutely sure?`}
        confirmText="YES, DELETE EVERYTHING"
        cancelText="Cancel"
        isLoading={clearLoading}
      />

      {/* Add Money Confirmation Modal */}
      <ConfirmationModal
        visible={showAddConfirmationModal}
        onClose={() => {
          setShowAddConfirmationModal(false);
          setPendingAddition({
            amount: 0,
            type: "",
            description: "",
            year: "",
          });
          setShowAddModal(true);
        }}
        onConfirm={executeAddMoney}
        type="info"
        title={`Confirm `}
        message={`Are you sure you want to add GH₵${pendingAddition.amount.toFixed(
          2
        )} to ${getTypeLabel(pendingAddition.type)}?`}
        confirmText={`Add GH₵${pendingAddition.amount.toFixed(2)}`}
        cancelText="Cancel"
        isLoading={addLoading}
      />

      {/* Add Money Modal - Should close before showing confirmation modal */}
      <AddMoneyModal
        visible={showAddModal && !showAddConfirmationModal && !alertVisible}
        onClose={() => {
          setShowAddModal(false);
          setSelectedType(null);
          setFormData({ amount: "", description: "", addedBy: "", type: "" });
        }}
        onSubmit={handleAddMoneySubmit}
        isLoading={addLoading}
        selectedType={selectedType}
        setSelectedType={setSelectedType}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        existingBudgetYears={existingBudgetYears}
        formData={formData}
        setFormData={setFormData}
        userFullName={userFullName}
        formatAmount={formatAmount}
      />

      {/* Admin Clear Button */}
      {isAdmin && (
        <View style={styles.adminControls}>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearAllFinances}
          >
            <MaterialIcons name="delete-sweep" size={20} color="#fff" />
            <ThemedText style={styles.clearButtonText}>
              Clear All Financial Data
            </ThemedText>
          </TouchableOpacity>
          <ThemedText style={styles.adminNote}>
            ⚠️ Admin: This will delete ALL finances and transactions
          </ThemedText>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Tracking Notice */}
        <View style={styles.trackingNotice}>
          <MaterialIcons name="info" size={20} color={Colors.goldAccent} />
          <ThemedText style={styles.trackingText}>
            All transactions are tracked in real-time. The coffers reflects net
            funds after all additions and deductions.
          </ThemedText>
        </View>

        {/* Withdrawals Summary */}
        <View style={styles.withdrawalsSummary}>
          <View style={styles.withdrawalsHeader}>
            <MaterialIcons
              name="trending-down"
              size={20}
              color={Colors.orangeAccent}
            />
            <ThemedText style={styles.withdrawalsTitle}>
              Total Withdrawn
            </ThemedText>
          </View>
          <View style={styles.withdrawalsDetails}>
            <ThemedText style={styles.withdrawalsAmount}>
              {formatCurrency(withdrawalsAmount)}
            </ThemedText>
            <ThemedText style={styles.withdrawalsTimeSpan}>
              {withdrawalsTimeSpan}
            </ThemedText>
          </View>

          {/* Total Money Flow */}
          <View style={styles.moneyFlowContainer}>
            <View style={styles.moneyFlowRow}>
              <View style={styles.moneyFlowItem}>
                <ThemedText style={styles.moneyFlowLabel}>
                  Total Amount before Withdrawals:
                </ThemedText>
              </View>
              <ThemedText style={styles.moneyFlowAmount}>
                {formatCurrency(totalMoneyFlow)}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Coffers Card */}
        <View
          style={[styles.coffersCard, { backgroundColor: Colors.uiBackground }]}
        >
          <View style={styles.coffersHeader}>
            <MaterialIcons
              name="account-balance"
              size={40}
              color={theme.text}
            />
            <ThemedText style={styles.coffersTitle}>Union Coffers</ThemedText>
          </View>

          <View style={styles.coffersAmountContainer}>
            <ThemedText style={styles.coffersCurrency}>GH₵</ThemedText>
            <ThemedText style={styles.coffersAmount}>
              {totalAmount.toFixed(2)}
            </ThemedText>
          </View>

          <View style={styles.coffersFooter}>
            <MaterialIcons name="trending-up" size={16} color={theme.text} />
            <ThemedText style={styles.coffersFooterText}>
              Total Balance
            </ThemedText>
          </View>
        </View>

        {/* Finance Types Grid */}
        <View style={styles.typesGrid}>
          {[
            {
              type: "dues",
              label: "Dues",
              icon: "receipt",
              color: Colors.blueAccent,
            },
            {
              type: "contribution",
              label: "Contributions",
              icon: "volunteer-activism",
              color: Colors.greenAccent,
            },
            {
              type: "other",
              label: "Misc/Others",
              icon: "payments",
              color: Colors.orangeAccent,
            },
            {
              type: "budget",
              label: "Budget",
              icon: "account-balance-wallet",
              color: Colors.purpleAccent,
            },
          ].map((item) => (
            <TouchableOpacity
              key={item.type}
              style={[styles.typeCard, { backgroundColor: theme.uiBackground }]}
              onPress={() => openAddModal(item.type)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.typeIconContainer,
                  { backgroundColor: item.color + "20" },
                ]}
              >
                <MaterialIcons name={item.icon} size={28} color={item.color} />
              </View>
              <ThemedText style={styles.typeLabel}>{item.label}</ThemedText>
              <ThemedText style={styles.typeAmount}>
                GH₵
                {item.type === "dues"
                  ? duesAmount
                  : item.type === "contribution"
                  ? contributionsAmount
                  : item.type === "other"
                  ? othersAmount
                  : budgetAmount}
              </ThemedText>
              <View style={styles.addIconContainer}>
                <MaterialIcons name="add-circle" size={20} color={item.color} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Withdrawal Button */}
        <TouchableOpacity
          style={[
            styles.withdrawalButton,
            { backgroundColor: Colors.blueAccent },
          ]}
          onPress={() => router.push("/withdrawal")}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-forward" size={24} color="#fff" />
          <ThemedText style={styles.withdrawalButtonText}>
            Make Withdrawal
          </ThemedText>
        </TouchableOpacity>
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
  adminControls: {
    marginBottom: 16,
    alignItems: "center",
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.redAccent,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 10,
    width: "100%",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  clearButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  adminNote: {
    fontSize: 12,
    opacity: 0.8,
    fontStyle: "italic",
    textAlign: "center",
    color: Colors.redAccent,
  },
  coffersCard: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.blueAccent,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  coffersHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  coffersTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 12,
  },
  coffersAmountContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 16,
  },
  coffersCurrency: {
    fontSize: 24,
    fontWeight: "600",
    marginRight: 4,
  },
  coffersAmount: {
    fontSize: 48,
    fontWeight: "bold",
  },
  coffersFooter: {
    flexDirection: "row",
    alignItems: "center",
  },
  coffersFooterText: {
    fontSize: 14,
    marginLeft: 6,
    opacity: 0.9,
  },
  typesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 24,
  },
  typeCard: {
    width: "48%",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: "relative",
  },
  typeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    opacity: 0.7,
  },
  typeAmount: {
    fontSize: 20,
    fontWeight: "bold",
  },
  addIconContainer: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  withdrawalButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  withdrawalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  trackingNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.yellowAccent + "15",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  trackingText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  withdrawalsSummary: {
    backgroundColor: Colors.uiBackground,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  withdrawalsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  withdrawalsTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  withdrawalsDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  withdrawalsAmount: {
    fontSize: 20,
    fontWeight: "bold",
  },
  withdrawalsTimeSpan: {
    fontSize: 14,
    opacity: 0.7,
    fontStyle: "italic",
  },
  moneyFlowContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  moneyFlowRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  moneyFlowItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  moneyFlowLabel: {
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.8,
  },
  moneyFlowAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.greenAccent,
  },
});

export default Finances;
