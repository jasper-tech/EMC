import {
  StyleSheet,
  View,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React, { useState, useEffect, useContext } from "react";
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
  orderBy,
} from "firebase/firestore";
import { Picker } from "@react-native-picker/picker";
import { db, auth } from "../firebase";
import { CustomAlert } from "../components/CustomAlert";
import ConfirmationModal from "../components/ConfirmationModal";

const Withdrawal = () => {
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;

  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [withdrawals, setWithdrawals] = useState([]);
  const [userFullName, setUserFullName] = useState("");

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

  const [formData, setFormData] = useState({
    amount: "",
    reasonType: "event",
    eventName: "",
    campName: "",
    otherReason: "",
    withdrawnBy: "",
    year: new Date().getFullYear().toString(),
    withdrawalDate: new Date().toISOString().split("T")[0],
  });
  const [showAllWithdrawals, setShowAllWithdrawals] = useState(false);

  // Pending withdrawal for confirmation
  const [pendingWithdrawal, setPendingWithdrawal] = useState({
    amount: 0,
    description: "",
    details: {},
  });

  const displayedWithdrawals = showAllWithdrawals
    ? withdrawals
    : withdrawals.slice(0, 5);

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setUserFullName(userDoc.data().fullName || "");
            setFormData((prev) => ({
              ...prev,
              withdrawnBy: userDoc.data().fullName || "",
            }));
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    };

    fetchUserData();
    loadFinances();
    loadWithdrawals();
  }, []);

  const loadFinances = async () => {
    try {
      const financesRef = collection(db, "finances");
      const q = query(financesRef);

      const unsubscribe = onSnapshot(q, (snapshot) => {
        let total = 0;
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const amount = data.amount || 0;
          total += amount;
        });
        setTotalAmount(total);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error loading finances:", error);
      setLoading(false);
    }
  };

  const loadWithdrawals = async () => {
    try {
      const transactionsRef = collection(db, "transactions");
      const q = query(transactionsRef, orderBy("timestamp", "desc"));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const transactionsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        // Filter for withdrawal transactions
        const withdrawalTransactions = transactionsList.filter(
          (transaction) => transaction.type === "withdrawal"
        );
        setWithdrawals(withdrawalTransactions);
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error loading withdrawals:", error);
    }
  };

  // Alert helper
  const showAlert = (config) => {
    // Close all modals before showing alert
    setShowWithdrawalModal(false);
    setShowConfirmationModal(false);

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

  const validateWithdrawal = () => {
    if (!formData.amount || !formData.withdrawnBy) {
      showAlert({
        type: "danger",
        title: "Error",
        message: "Please fill in all required fields",
      });
      return false;
    }

    // Validation for different reason types
    if (formData.reasonType === "event" && !formData.eventName) {
      showAlert({
        type: "danger",
        title: "Error",
        message: "Please enter the event name",
      });
      return false;
    }

    if (formData.reasonType === "camp" && !formData.campName) {
      showAlert({
        type: "danger",
        title: "Error",
        message: "Please select a camp",
      });
      return false;
    }

    if (formData.reasonType === "others" && !formData.otherReason) {
      showAlert({
        type: "danger",
        title: "Error",
        message: "Please enter the reason for withdrawal",
      });
      return false;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      showAlert({
        type: "danger",
        title: "Error",
        message: "Please enter a valid amount",
      });
      return false;
    }

    if (amount > totalAmount) {
      showAlert({
        type: "danger",
        title: "Error",
        message: "Insufficient funds in the coffers",
      });
      return false;
    }

    return true;
  };

  const prepareWithdrawalConfirmation = () => {
    if (!validateWithdrawal()) {
      return;
    }

    const amount = parseFloat(formData.amount);

    // Build the description based on reason type
    let description = "";
    let details = {};

    if (formData.reasonType === "event") {
      description = `Withdrawal for event: ${formData.eventName}`;
      details = { eventName: formData.eventName };
    } else if (formData.reasonType === "camp") {
      description = `Withdrawal for camp: ${formData.campName}`;
      details = { campName: formData.campName };
    } else {
      description = `Withdrawal: ${formData.otherReason}`;
      details = { otherReason: formData.otherReason };
    }

    // Store pending withdrawal for confirmation
    setPendingWithdrawal({
      amount: amount,
      description: description,
      details: {
        reasonType: formData.reasonType,
        ...details,
        year: formData.year,
        withdrawalDate: formData.withdrawalDate,
        withdrawnBy: formData.withdrawnBy,
      },
    });

    // Show confirmation modal
    setShowWithdrawalModal(false);
    setShowConfirmationModal(true);
  };

  const executeWithdrawal = async () => {
    setWithdrawalLoading(true);

    try {
      const user = auth.currentUser;
      const { amount, description, details } = pendingWithdrawal;

      const transactionData = {
        amount: amount,
        description: description,
        withdrawnBy: details.withdrawnBy,
        userId: user?.uid || "unknown",
        year: details.year,
        withdrawalDate: details.withdrawalDate,
        type: "withdrawal",
        status: "completed",
        timestamp: new Date(),
        reasonType: details.reasonType,
      };

      const financeData = {
        amount: -amount,
        description: description,
        addedBy: details.withdrawnBy,
        userId: user?.uid || "unknown",
        timestamp: new Date(),
        type: "withdrawal",
        withdrawalDetails: details,
      };

      // Save to transactions collection
      await addDoc(collection(db, "transactions"), transactionData);

      // Save negative amount to finances collection
      await addDoc(collection(db, "finances"), financeData);

      // Create notification for the withdrawal
      await addDoc(collection(db, "notifications"), {
        type: "withdrawal_made",
        title: "Funds Withdrawn",
        message: `${details.withdrawnBy} withdrew GH₵${amount.toFixed(
          2
        )} - ${description}`,
        timestamp: new Date(),
        read: false,
      });

      // Close confirmation modal
      setShowConfirmationModal(false);

      // Reset form data
      setFormData({
        amount: "",
        reasonType: "event",
        eventName: "",
        campName: "",
        otherReason: "",
        withdrawnBy: userFullName,
        year: new Date().getFullYear().toString(),
        withdrawalDate: new Date().toISOString().split("T")[0],
      });

      // Show success alert
      showAlert({
        type: "success",
        title: "Success",
        message: `Withdrawal of GH₵${amount.toFixed(
          2
        )} completed successfully!`,
      });
    } catch (error) {
      console.error("Error processing withdrawal:", error);

      // Close confirmation modal
      setShowConfirmationModal(false);

      // Show error alert
      showAlert({
        type: "failed",
        title: "Error",
        message: "Failed to process withdrawal. Please try again.",
      });
    } finally {
      setWithdrawalLoading(false);
      setPendingWithdrawal({
        amount: 0,
        description: "",
        details: {},
      });
    }
  };

  const formatCurrency = (amount) => {
    return `GH₵${amount.toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
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

  const handleAmountChange = (text) => {
    const formattedAmount = formatAmount(text);
    setFormData({ ...formData, amount: formattedAmount });
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.blueAccent} />
          <ThemedText style={styles.loadingText}>
            Loading withdrawals...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Custom Alert */}
      <CustomAlert {...alertConfig} visible={alertVisible} />

      {/* Withdrawal Confirmation Modal */}
      <ConfirmationModal
        visible={showConfirmationModal}
        onClose={() => {
          setShowConfirmationModal(false);
          setPendingWithdrawal({
            amount: 0,
            description: "",
            details: {},
          });
          // Reopen the withdrawal modal if user cancels
          setShowWithdrawalModal(true);
        }}
        onConfirm={executeWithdrawal}
        type="info"
        title="Confirm Withdrawal"
        message={`Are you sure you want to withdraw GH₵${pendingWithdrawal.amount.toFixed(
          2
        )}?\n\nDetails: ${pendingWithdrawal.description}\n\nYear: ${
          pendingWithdrawal.details.year || formData.year
        }\nDate: ${
          pendingWithdrawal.details.withdrawalDate || formData.withdrawalDate
        }\nWithdrawn By: ${
          pendingWithdrawal.details.withdrawnBy || userFullName
        }`}
        confirmText={`Withdraw GH₵${pendingWithdrawal.amount.toFixed(2)}`}
        cancelText="Cancel"
        isLoading={withdrawalLoading}
      />

      {/* Withdrawal Modal */}
      <Modal
        visible={showWithdrawalModal && !showConfirmationModal && !alertVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowWithdrawalModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowWithdrawalModal(false)}
          />
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.navBackground },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <ThemedText style={styles.modalTitle}>
                  Withdraw Funds
                </ThemedText>
              </View>
              <TouchableOpacity onPress={() => setShowWithdrawalModal(false)}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Available Balance */}
              <View style={styles.balanceContainer}>
                <ThemedText style={styles.balanceLabel}>
                  Available Coffers
                </ThemedText>
                <ThemedText style={styles.balanceAmount}>
                  {formatCurrency(totalAmount)}
                </ThemedText>
              </View>

              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>
                  Amount to Withdraw (GH₵) *
                </ThemedText>
                <View style={styles.amountInputContainer}>
                  <ThemedText style={styles.currencySymbol}>GH₵</ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: theme.text,
                        backgroundColor: theme.uiBackground,
                      },
                    ]}
                    placeholder="0.00"
                    placeholderTextColor="#999"
                    keyboardType="decimal-pad"
                    value={formData.amount}
                    onChangeText={handleAmountChange}
                    editable={!withdrawalLoading}
                    maxLength={15}
                  />
                </View>
                <ThemedText style={styles.amountHint}>
                  Enter numbers only (e.g., 100.50)
                </ThemedText>
              </View>

              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>
                  Reason for Withdrawal *
                </ThemedText>
                <View
                  style={[
                    styles.pickerWrapper,
                    { backgroundColor: theme.uiBackground },
                  ]}
                >
                  <Picker
                    selectedValue={formData.reasonType}
                    onValueChange={(itemValue) =>
                      setFormData({
                        ...formData,
                        reasonType: itemValue,
                        eventName: "",
                        campName: "",
                        otherReason: "",
                      })
                    }
                    style={{ color: theme.text }}
                    enabled={!withdrawalLoading}
                  >
                    <Picker.Item label="Event" value="event" />
                    <Picker.Item label="Camp" value="camp" />
                    <Picker.Item label="Others" value="others" />
                  </Picker>
                </View>
              </View>

              {formData.reasonType === "event" && (
                <View style={styles.inputContainer}>
                  <ThemedText style={styles.label}>Event Name *</ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: theme.text,
                        backgroundColor: theme.uiBackground,
                      },
                    ]}
                    placeholder="e.g., End of Year Party, Food Bazaar, etc."
                    placeholderTextColor="#999"
                    value={formData.eventName}
                    onChangeText={(text) =>
                      setFormData({ ...formData, eventName: text })
                    }
                    editable={!withdrawalLoading}
                  />
                </View>
              )}

              {formData.reasonType === "camp" && (
                <View style={styles.inputContainer}>
                  <ThemedText style={styles.label}>Camp Name *</ThemedText>
                  <View
                    style={[
                      styles.pickerWrapper,
                      { backgroundColor: theme.uiBackground },
                    ]}
                  >
                    <Picker
                      selectedValue={formData.campName}
                      onValueChange={(itemValue) =>
                        setFormData({ ...formData, campName: itemValue })
                      }
                      style={{ color: theme.text }}
                      enabled={!withdrawalLoading}
                    >
                      <Picker.Item label="" value="" />
                      <Picker.Item
                        label="Meridian Camp"
                        value="Meridian Camp"
                      />
                      <Picker.Item
                        label="National Camp"
                        value="National Camp"
                      />
                    </Picker>
                  </View>
                </View>
              )}

              {formData.reasonType === "others" && (
                <View style={styles.inputContainer}>
                  <ThemedText style={styles.label}>Reason Details *</ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: theme.text,
                        backgroundColor: theme.uiBackground,
                      },
                    ]}
                    placeholder="e.g., Member Support, Supplies, etc."
                    placeholderTextColor="#999"
                    value={formData.otherReason}
                    onChangeText={(text) =>
                      setFormData({ ...formData, otherReason: text })
                    }
                    editable={!withdrawalLoading}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              )}

              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Withdrawal Year</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    { color: theme.text, backgroundColor: theme.uiBackground },
                  ]}
                  value={formData.year}
                  editable={false}
                />
              </View>
              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Withdrawal Date</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: theme.text,
                      backgroundColor: theme.uiBackground,
                      opacity: 0.7,
                    },
                  ]}
                  value={formData.withdrawalDate}
                  editable={false}
                  placeholder="YYYY-MM-DD"
                />
              </View>

              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Withdrawn By</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: theme.text,
                      backgroundColor: theme.uiBackground,
                      opacity: 0.7,
                    },
                  ]}
                  value={formData.withdrawnBy}
                  editable={false}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: Colors.blueAccent },
                  withdrawalLoading && styles.submitButtonDisabled,
                ]}
                onPress={prepareWithdrawalConfirmation}
                disabled={withdrawalLoading}
              >
                {withdrawalLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.submitButtonText}>
                    Process Withdrawal
                  </ThemedText>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <View
          style={[styles.headerCard, { backgroundColor: Colors.uiBackground }]}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerText}>
              <ThemedText style={styles.headerSubtitle}>
                Amount Available: {formatCurrency(totalAmount)}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* New Withdrawal Button */}
        <TouchableOpacity
          style={[
            styles.newWithdrawalButton,
            { backgroundColor: Colors.blueAccent },
          ]}
          onPress={() => setShowWithdrawalModal(true)}
          activeOpacity={0.7}
        >
          <MaterialIcons name="add" size={24} color="#fff" />
          <ThemedText style={styles.newWithdrawalButtonText}>
            New Withdrawal
          </ThemedText>
        </TouchableOpacity>

        {/* Withdrawals List */}
        <View style={styles.withdrawalsSection}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>
              Recent Withdrawals ({withdrawals.length})
            </ThemedText>

            {withdrawals.length > 5 && (
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => setShowAllWithdrawals(!showAllWithdrawals)}
              >
                <ThemedText style={styles.viewAllButtonText}>
                  {showAllWithdrawals
                    ? "Show Less"
                    : `View All (${withdrawals.length})`}
                </ThemedText>
                <MaterialIcons
                  name={showAllWithdrawals ? "expand-less" : "expand-more"}
                  size={20}
                  color={Colors.blueAccent}
                />
              </TouchableOpacity>
            )}
          </View>

          {withdrawals.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons
                name="account-balance-wallet"
                size={48}
                color={Colors.border}
              />
              <ThemedText style={styles.emptyStateText}>
                No withdrawals yet
              </ThemedText>
              <ThemedText style={styles.emptyStateSubtext}>
                Make your first withdrawal to get started
              </ThemedText>
            </View>
          ) : (
            <ScrollView
              style={styles.withdrawalsScrollView}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {displayedWithdrawals.map((withdrawal) => (
                <View
                  key={withdrawal.id}
                  style={[
                    styles.withdrawalCard,
                    { backgroundColor: theme.uiBackground },
                  ]}
                >
                  <View style={styles.withdrawalHeader}>
                    <View style={styles.amountContainer}>
                      <ThemedText style={styles.withdrawalAmount}>
                        {formatCurrency(withdrawal.amount)}
                      </ThemedText>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: Colors.greenAccent + "20" },
                        ]}
                      >
                        <MaterialIcons
                          name="check-circle"
                          size={16}
                          color={Colors.greenAccent}
                        />
                        <ThemedText
                          style={[
                            styles.statusText,
                            { color: Colors.greenAccent },
                          ]}
                        >
                          Completed
                        </ThemedText>
                      </View>
                    </View>
                    <ThemedText style={styles.withdrawalDate}>
                      {formatDate(
                        withdrawal.timestamp?.toDate
                          ? withdrawal.timestamp.toDate()
                          : new Date(withdrawal.timestamp)
                      )}
                    </ThemedText>
                  </View>

                  <View style={styles.withdrawalDetails}>
                    <ThemedText style={styles.descriptionText}>
                      {withdrawal.description}
                    </ThemedText>
                    <ThemedText style={styles.withdrawnByText}>
                      By: {withdrawal.withdrawnBy}
                    </ThemedText>
                    <ThemedText style={styles.yearText}>
                      Year: {withdrawal.year}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
};

export default Withdrawal;

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
  headerCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerText: {
    marginLeft: 16,
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  newWithdrawalButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  newWithdrawalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  withdrawalsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    borderRadius: 12,
    backgroundColor: Colors.uiBackground,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: "center",
  },
  withdrawalCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  withdrawalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  amountContainer: {
    flex: 1,
  },
  withdrawalAmount: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  withdrawalDate: {
    fontSize: 14,
    opacity: 0.6,
  },
  withdrawalDetails: {
    gap: 4,
  },
  descriptionText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  withdrawnByText: {
    fontSize: 14,
    opacity: 0.7,
  },
  yearText: {
    fontSize: 14,
    opacity: 0.7,
  },
  reasonTypeText: {
    fontSize: 14,
    opacity: 0.7,
    fontStyle: "italic",
  },
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
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  balanceContainer: {
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.blueAccent + "15",
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.blueAccent,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  currencySymbol: {
    position: "absolute",
    left: 14,
    fontSize: 16,
    fontWeight: "600",
    zIndex: 1,
  },
  input: {
    borderRadius: 8,
    padding: 14,
    paddingLeft: 50,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    flex: 1,
  },
  amountHint: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    fontStyle: "italic",
  },
  pickerWrapper: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  submitButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.blueAccent + "15",
  },
  viewAllButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  withdrawalsScrollView: {
    maxHeight: 500,
  },
});
