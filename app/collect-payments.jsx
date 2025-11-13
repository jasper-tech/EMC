import {
  StyleSheet,
  View,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from "react-native";
import React, { useState, useEffect, useContext } from "react";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import { ThemeContext } from "../context/ThemeContext";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { db, auth } from "../firebase";

const CollectPayments = () => {
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [unpaidMembers, setUnpaidMembers] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [duesAllocations, setDuesAllocations] = useState([]);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [allocatingDues, setAllocatingDues] = useState(false);
  const [allocationData, setAllocationData] = useState({
    regularAmount: "",
    executiveAmount: "",
  });

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
    if (selectedMonth) {
      loadUnpaidMembers();
    }
  }, [selectedYear, selectedMonth, members, transactions, duesAllocations]);

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

  const getMemberDuesAmount = (member) => {
    const allocation = getDuesAllocationForYear(selectedYear);
    if (!allocation) return 0;

    return member.isExecutive
      ? allocation.executiveAmount
      : allocation.regularAmount;
  };

  const loadUnpaidMembers = () => {
    if (!selectedMonth) return;

    // Get all paid member IDs for selected month and year
    const paidMemberIds = transactions
      .filter(
        (transaction) =>
          transaction.type === "dues" &&
          transaction.month === selectedMonth.value &&
          transaction.year === selectedYear
      )
      .map((transaction) => transaction.memberId);

    // Filter members who haven't paid
    const unpaid = members.filter(
      (member) => !paidMemberIds.includes(member.id)
    );

    setUnpaidMembers(unpaid);
  };

  const openPaymentModal = (member) => {
    const allocation = getDuesAllocationForYear(selectedYear);
    if (!allocation) {
      Alert.alert(
        "Dues Not Allocated",
        `Dues have not been allocated for ${selectedYear}. Please allocate dues first.`
      );
      return;
    }

    setSelectedMember(member);
    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    if (!selectedMember || !selectedMonth) {
      Alert.alert("Error", "Missing required information");
      return;
    }

    const allocation = getDuesAllocationForYear(selectedYear);
    if (!allocation) {
      Alert.alert("Error", "Dues allocation not found for this year");
      return;
    }

    const amount = getMemberDuesAmount(selectedMember);

    setProcessingPayment(true);
    try {
      const user = auth.currentUser;

      // Add to finances collection as dues
      await addDoc(collection(db, "finances"), {
        amount: amount,
        description: `Dues payment for ${selectedMonth.name} ${selectedYear} - ${selectedMember.fullname}`,
        addedBy: user?.displayName || "System",
        userId: user?.uid || "unknown",
        timestamp: serverTimestamp(),
        type: "dues",
        memberId: selectedMember.id,
        memberName: selectedMember.fullname,
        memberType: selectedMember.isExecutive ? "executive" : "regular",
      });

      // Add to transactions collection
      await addDoc(collection(db, "transactions"), {
        memberId: selectedMember.id,
        memberName: selectedMember.fullname,
        amount: amount,
        type: "dues",
        month: selectedMonth.value,
        monthName: selectedMonth.name,
        year: selectedYear,
        description: `Dues payment for ${selectedMonth.name} ${selectedYear}`,
        recordedBy: user?.displayName || "System",
        recordedById: user?.uid || "unknown",
        timestamp: serverTimestamp(),
        status: "completed",
        memberType: selectedMember.isExecutive ? "executive" : "regular",
        allocatedAmount: amount,
      });

      // Create notification
      await addDoc(collection(db, "notifications"), {
        type: "dues_payment",
        title: "Dues Payment Received",
        message: `${selectedMember.fullname} paid GH₵${amount.toFixed(2)} for ${
          selectedMonth.name
        } ${selectedYear} `,
        timestamp: serverTimestamp(),
        readBy: [],
      });

      Alert.alert(
        "Success",
        `Payment of GH₵${amount.toFixed(2)} recorded for ${
          selectedMember.fullname
        }`
      );

      setShowPaymentModal(false);
      setSelectedMember(null);
    } catch (error) {
      console.error("Error processing payment:", error);
      Alert.alert("Error", "Failed to process payment. Please try again.");
    } finally {
      setProcessingPayment(false);
    }
  };

  const allocateDuesForYear = async () => {
    if (!allocationData.regularAmount || !allocationData.executiveAmount) {
      Alert.alert("Error", "Please enter both regular and executive amounts");
      return;
    }

    const regularAmount = parseFloat(allocationData.regularAmount);
    const executiveAmount = parseFloat(allocationData.executiveAmount);

    if (
      isNaN(regularAmount) ||
      isNaN(executiveAmount) ||
      regularAmount <= 0 ||
      executiveAmount <= 0
    ) {
      Alert.alert("Error", "Please enter valid amounts");
      return;
    }

    setAllocatingDues(true);
    try {
      const user = auth.currentUser;

      // Check if allocation already exists for this year
      const existingAllocation = getDuesAllocationForYear(selectedYear);
      if (existingAllocation) {
        // Update existing allocation
        await updateDoc(doc(db, "duesAllocations", existingAllocation.id), {
          regularAmount: regularAmount,
          executiveAmount: executiveAmount,
          updatedBy: user?.displayName || "System",
          updatedAt: serverTimestamp(),
        });
      } else {
        // Create new allocation
        await addDoc(collection(db, "duesAllocations"), {
          year: selectedYear,
          regularAmount: regularAmount,
          executiveAmount: executiveAmount,
          createdBy: user?.displayName || "System",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Create notification
      await addDoc(collection(db, "notifications"), {
        type: "dues_allocation",
        title: "Dues Allocated",
        message: `Dues allocated for ${selectedYear}: Regular - GH₵${regularAmount.toFixed(
          2
        )}, Executive - GH₵${executiveAmount.toFixed(2)}`,
        timestamp: serverTimestamp(),
        readBy: [],
      });

      Alert.alert("Success", `Dues allocated successfully for ${selectedYear}`);
      setShowAllocationModal(false);
      setAllocationData({ regularAmount: "", executiveAmount: "" });
    } catch (error) {
      console.error("Error allocating dues:", error);
      Alert.alert("Error", "Failed to allocate dues. Please try again.");
    } finally {
      setAllocatingDues(false);
    }
  };

  const getMonthStatus = (month) => {
    const paidCount = transactions.filter(
      (transaction) =>
        transaction.type === "dues" &&
        transaction.month === month.value &&
        transaction.year === selectedYear
    ).length;

    const totalMembers = members.length;
    const paidPercentage =
      totalMembers > 0 ? (paidCount / totalMembers) * 100 : 0;

    return {
      paidCount,
      totalMembers,
      paidPercentage,
    };
  };

  const renderYearSelector = () => {
    const allocation = getDuesAllocationForYear(selectedYear);

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          {/* <ThemedText style={styles.sectionTitle}>
            Allocate dues for the year
          </ThemedText>
          <TouchableOpacity
            style={styles.allocateButton}
            onPress={() => setShowAllocationModal(true)}
          >
            <MaterialIcons name="currency-cedi" size={18} color="#fff" />
            <ThemedText style={styles.allocateButtonText}>
              {allocation ? "Update Dues" : "Allocate Dues"}
            </ThemedText>
          </TouchableOpacity> */}
        </View>

        {allocation && (
          <View style={styles.allocationInfo}>
            <View style={styles.allocationItem}>
              <ThemedText style={styles.allocationLabel}>
                Regular Members:
              </ThemedText>
              <ThemedText style={styles.allocationAmount}>
                GH₵{allocation.regularAmount.toFixed(2)}
              </ThemedText>
            </View>
            <View style={styles.allocationItem}>
              <ThemedText style={styles.allocationLabel}>
                Executive Members:
              </ThemedText>
              <ThemedText style={styles.allocationAmount}>
                GH₵{allocation.executiveAmount.toFixed(2)}
              </ThemedText>
            </View>
          </View>
        )}

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
                onPress={() => {
                  setSelectedYear(year);
                  setSelectedMonth(null);
                }}
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
  };

  const renderMonthGrid = () => {
    const allocation = getDuesAllocationForYear(selectedYear);

    if (!allocation) {
      return (
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>
            {selectedYear} - Select Month
          </ThemedText>
          <View style={styles.noAllocationMessage}>
            <MaterialIcons
              name="warning"
              size={48}
              color={Colors.orangeAccent}
            />
            <ThemedText style={styles.noAllocationText}>
              Dues have not been allocated for {selectedYear}
            </ThemedText>
            <ThemedText style={styles.noAllocationSubtext}>
              Please allocate dues first to enable payment collection
            </ThemedText>
            <TouchableOpacity
              style={styles.allocateCtaButton}
              onPress={() => setShowAllocationModal(true)}
            >
              {/* <MaterialIcons name="attach-money" size={18} color="#fff" /> */}
              <ThemedText style={styles.allocateCtaButtonText}>
                Allocate Dues for {selectedYear}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>
          {selectedYear} - Select Month
        </ThemedText>
        <View style={styles.monthsGrid}>
          {months.map((month) => {
            const status = getMonthStatus(month);
            return (
              <TouchableOpacity
                key={month.value}
                style={[
                  styles.monthCard,
                  { backgroundColor: theme.uiBackground },
                  selectedMonth?.value === month.value && {
                    borderColor: Colors.blueAccent,
                    borderWidth: 2,
                  },
                ]}
                onPress={() => setSelectedMonth(month)}
              >
                <ThemedText style={styles.monthName}>{month.name}</ThemedText>

                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${status.paidPercentage}%`,
                          backgroundColor:
                            status.paidPercentage === 100
                              ? Colors.greenAccent
                              : status.paidPercentage > 50
                              ? Colors.orangeAccent
                              : Colors.blueAccent,
                        },
                      ]}
                    />
                  </View>
                  <ThemedText style={styles.progressText}>
                    {status.paidCount}/{status.totalMembers}
                  </ThemedText>
                </View>

                <View style={styles.monthStatus}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          status.paidPercentage === 100
                            ? Colors.greenAccent
                            : status.paidPercentage > 0
                            ? Colors.orangeAccent
                            : Colors.gray,
                      },
                    ]}
                  />
                  <ThemedText style={styles.statusText}>
                    {status.paidPercentage === 100
                      ? "Completed"
                      : status.paidPercentage > 0
                      ? "In Progress"
                      : "Not Started"}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderUnpaidMembers = () => {
    if (!selectedMonth) return null;

    const allocation = getDuesAllocationForYear(selectedYear);
    if (!allocation) return null;

    return (
      <View style={styles.section}>
        {/* Back button header */}
        <View style={styles.sectionHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedMonth(null)}
          >
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={Colors.blueAccent}
            />
            <ThemedText style={styles.backButtonText}>
              Back to Months
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Title and count in separate row for better layout */}
        <View style={styles.titleRow}>
          <ThemedText style={styles.sectionTitle}>
            Unpaid Members - {selectedMonth.name} {selectedYear}
          </ThemedText>
          <ThemedText style={styles.unpaidCount}>
            {unpaidMembers.length} members remaining
          </ThemedText>
        </View>

        {unpaidMembers.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons
              name="check-circle"
              size={48}
              color={Colors.greenAccent}
            />
            <ThemedText style={styles.emptyStateText}>
              All members have paid for {selectedMonth.name} {selectedYear}
            </ThemedText>
            <TouchableOpacity
              style={styles.backToMonthsButton}
              onPress={() => setSelectedMonth(null)}
            >
              <ThemedText style={styles.backToMonthsText}>
                Back to Months
              </ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.membersScrollView}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.membersScrollContent}
          >
            {unpaidMembers.map((item) => {
              const duesAmount = getMemberDuesAmount(item);
              return (
                <View
                  key={item.id}
                  style={[
                    styles.memberCard,
                    { backgroundColor: theme.uiBackground },
                  ]}
                >
                  <View style={styles.memberInfo}>
                    <View
                      style={[
                        styles.avatar,
                        item.isExecutive && styles.executiveAvatar,
                      ]}
                    >
                      <Ionicons
                        name={item.isExecutive ? "star" : "person"}
                        size={20}
                        color={
                          item.isExecutive
                            ? Colors.goldAccent
                            : Colors.blueAccent
                        }
                      />
                    </View>
                    <View style={styles.memberDetails}>
                      <View style={styles.memberNameRow}>
                        <ThemedText style={styles.memberName}>
                          {item.fullname}
                        </ThemedText>
                        {item.isExecutive && (
                          <View style={styles.executiveBadge}>
                            <ThemedText style={styles.executiveBadgeText}>
                              Executive
                            </ThemedText>
                          </View>
                        )}
                      </View>
                      <ThemedText style={styles.memberPhone}>
                        {item.phone}
                      </ThemedText>
                      <ThemedText style={styles.duesAmount}>
                        Amount: GH₵{duesAmount.toFixed(2)}
                      </ThemedText>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.payButton}
                    onPress={() => openPaymentModal(item)}
                  >
                    <MaterialIcons name="payment" size={18} color="#fff" />
                    <ThemedText style={styles.payButtonText}>Pay</ThemedText>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderAllocationModal = () => (
    <Modal
      visible={showAllocationModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowAllocationModal(false)}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowAllocationModal(false)}
        />
        <View
          style={[
            styles.modalContent,
            { backgroundColor: theme.navBackground },
          ]}
        >
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>
              Allocate Dues for {selectedYear}
            </ThemedText>
            <TouchableOpacity onPress={() => setShowAllocationModal(false)}>
              <MaterialIcons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>
                Regular Members Amount (GH₵)
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { color: theme.text, backgroundColor: theme.uiBackground },
                ]}
                placeholder="0.00"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
                value={allocationData.regularAmount}
                onChangeText={(text) =>
                  setAllocationData({ ...allocationData, regularAmount: text })
                }
                editable={!allocatingDues}
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>
                Executive Members Amount (GH₵)
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { color: theme.text, backgroundColor: theme.uiBackground },
                ]}
                placeholder="0.00"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
                value={allocationData.executiveAmount}
                onChangeText={(text) =>
                  setAllocationData({
                    ...allocationData,
                    executiveAmount: text,
                  })
                }
                editable={!allocatingDues}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                allocatingDues && styles.confirmButtonDisabled,
              ]}
              onPress={allocateDuesForYear}
              disabled={allocatingDues}
            >
              {allocatingDues ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  {/* <MaterialIcons name="currency-cedi" size={20} color="#fff" /> */}
                  <ThemedText style={styles.confirmButtonText}>
                    Allocate Dues
                  </ThemedText>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderPaymentModal = () => {
    if (!selectedMember) return null;

    const allocation = getDuesAllocationForYear(selectedYear);
    const duesAmount = getMemberDuesAmount(selectedMember);

    return (
      <Modal
        visible={showPaymentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowPaymentModal(false)}
          />
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.navBackground },
            ]}
          >
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Record Payment</ThemedText>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {selectedMember && (
                <View style={styles.paymentInfo}>
                  <ThemedText style={styles.paymentLabel}>Member</ThemedText>
                  <ThemedText style={styles.paymentValue}>
                    {selectedMember.fullname}
                  </ThemedText>
                  {selectedMember.isExecutive && (
                    <View style={styles.executiveBadgeSmall}>
                      <ThemedText style={styles.executiveBadgeTextSmall}>
                        Executive Member
                      </ThemedText>
                    </View>
                  )}
                </View>
              )}

              {selectedMonth && (
                <View style={styles.paymentInfo}>
                  <ThemedText style={styles.paymentLabel}>Period</ThemedText>
                  <ThemedText style={styles.paymentValue}>
                    {selectedMonth.name} {selectedYear}
                  </ThemedText>
                </View>
              )}

              <View style={styles.paymentInfo}>
                <ThemedText style={styles.paymentLabel}>Amount Due</ThemedText>
                <ThemedText style={styles.amountDue}>
                  GH₵{duesAmount.toFixed(2)}
                </ThemedText>
              </View>

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  processingPayment && styles.confirmButtonDisabled,
                ]}
                onPress={processPayment}
                disabled={processingPayment}
              >
                {processingPayment ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="check-circle" size={20} color="#fff" />
                    <ThemedText style={styles.confirmButtonText}>
                      Confirm Payment of GH₵{duesAmount.toFixed(2)}
                    </ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.blueAccent} />
          <ThemedText style={styles.loadingText}>
            Loading payment system...
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
        {!selectedMonth ? renderMonthGrid() : renderUnpaidMembers()}
      </ScrollView>
      {renderAllocationModal()}
      {renderPaymentModal()}
    </ThemedView>
  );
};

export default CollectPayments;

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
  membersListContainer: {
    maxHeight: 400,
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  unpaidCount: {
    fontSize: 14,
    fontWeight: "600",

    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
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
  allocateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.blueAccent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  allocateButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  allocationInfo: {
    backgroundColor: Colors.uiBackground,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  allocationItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  allocationLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  allocationAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.greenAccent,
  },
  noAllocationMessage: {
    alignItems: "center",
    padding: 32,
    backgroundColor: Colors.uiBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noAllocationText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  noAllocationSubtext: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 8,
    textAlign: "center",
  },
  allocateCtaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.blueAccent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  allocateCtaButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  monthsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  monthCard: {
    width: "48%",
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
  monthName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: "center",
  },
  monthStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    opacity: 0.7,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  backButtonText: {
    color: Colors.blueAccent,
    fontSize: 16,
    fontWeight: "600",
  },
  backToMonthsButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.blueAccent,
    borderRadius: 8,
  },
  backToMonthsText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  memberCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
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
    borderWidth: 2,
    borderColor: Colors.goldAccent,
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
    marginBottom: 2,
  },
  duesAmount: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.greenAccent,
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
  executiveBadgeSmall: {
    backgroundColor: Colors.goldAccent + "20",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  executiveBadgeTextSmall: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.goldAccent,
  },
  payButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.greenAccent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  payButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
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
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  paymentInfo: {
    marginBottom: 16,
  },
  paymentLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
    opacity: 0.7,
  },
  paymentValue: {
    fontSize: 16,
    fontWeight: "500",
  },
  amountDue: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.greenAccent,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.greenAccent,
    borderRadius: 8,
    padding: 16,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    flexWrap: "wrap",
  },

  membersScrollView: {
    maxHeight: 400,
    flexGrow: 0,
  },

  membersScrollContent: {
    paddingBottom: 8,
  },
});
