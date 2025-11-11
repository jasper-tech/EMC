import {
  StyleSheet,
  View,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
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
  setDoc,
  updateDoc,
  increment,
} from "firebase/firestore";
import { db, auth } from "../firebase";

const Finances = () => {
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;

  const [totalAmount, setTotalAmount] = useState(0);
  const [duesAmount, setDuesAmount] = useState(0);
  const [contributionsAmount, setContributionsAmount] = useState(0);
  const [othersAmount, setOthersAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [selectedType, setSelectedType] = useState(null);

  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    addedBy: "",
    type: "",
  });

  useEffect(() => {
    // Subscribe to finances collection
    const financesRef = collection(db, "finances");
    const q = query(financesRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let total = 0;
        let dues = 0;
        let contributions = 0;
        let others = 0;

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
          }
        });

        setTotalAmount(total);
        setDuesAmount(dues);
        setContributionsAmount(contributions);
        setOthersAmount(others);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching finances:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const openAddModal = (type) => {
    setSelectedType(type);
    setFormData({ ...formData, type });
    setShowAddModal(true);
  };

  const handleAddMoney = async () => {
    if (!formData.amount || !formData.description || !formData.addedBy) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    setAddLoading(true);
    try {
      const user = auth.currentUser;

      // Add to finances collection
      await addDoc(collection(db, "finances"), {
        amount: amount,
        description: formData.description,
        addedBy: formData.addedBy,
        userId: user?.uid || "unknown",
        timestamp: new Date(),
        type: formData.type,
      });

      // Create notification
      const typeLabel =
        formData.type === "dues"
          ? "Dues"
          : formData.type === "contribution"
          ? "Contribution"
          : "Other";

      await addDoc(collection(db, "notifications"), {
        type: "payment_received",
        title: `${typeLabel} Added`,
        message: `${formData.addedBy} added GH₵${amount.toFixed(
          2
        )} to ${typeLabel.toLowerCase()}`,
        timestamp: new Date(),
        read: false,
      });

      Alert.alert("Success", "Money added successfully!");
      setShowAddModal(false);
      setFormData({ amount: "", description: "", addedBy: "", type: "" });
      setSelectedType(null);
    } catch (error) {
      console.error("Error adding money:", error);
      Alert.alert("Error", "Failed to add money. Please try again.");
    } finally {
      setAddLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `GH₵${amount.toFixed(2)}`;
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case "dues":
        return "Dues";
      case "contribution":
        return "Contributions";
      case "other":
        return "Others";
      default:
        return "";
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "dues":
        return "receipt";
      case "contribution":
        return "volunteer-activism";
      case "other":
        return "payments";
      default:
        return "attach-money";
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "dues":
        return Colors.blueAccent;
      case "contribution":
        return Colors.greenAccent;
      case "other":
        return Colors.orangeAccent;
      default:
        return Colors.primary;
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
      <ScrollView showsVerticalScrollIndicator={false}>
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
          {/* Dues Card */}
          <TouchableOpacity
            style={[styles.typeCard, { backgroundColor: theme.uiBackground }]}
            onPress={() => openAddModal("dues")}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.typeIconContainer,
                { backgroundColor: Colors.blueAccent + "20" },
              ]}
            >
              <MaterialIcons
                name="receipt"
                size={28}
                color={Colors.blueAccent}
              />
            </View>
            <ThemedText style={styles.typeLabel}>Dues</ThemedText>
            <ThemedText style={styles.typeAmount}>
              {formatCurrency(duesAmount)}
            </ThemedText>
            <View style={styles.addIconContainer}>
              <MaterialIcons
                name="add-circle"
                size={20}
                color={Colors.blueAccent}
              />
            </View>
          </TouchableOpacity>

          {/* Contributions Card */}
          <TouchableOpacity
            style={[styles.typeCard, { backgroundColor: theme.uiBackground }]}
            onPress={() => openAddModal("contribution")}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.typeIconContainer,
                { backgroundColor: Colors.greenAccent + "20" },
              ]}
            >
              <MaterialIcons
                name="volunteer-activism"
                size={28}
                color={Colors.greenAccent}
              />
            </View>
            <ThemedText style={styles.typeLabel}>Contributions</ThemedText>
            <ThemedText style={styles.typeAmount}>
              {formatCurrency(contributionsAmount)}
            </ThemedText>
            <View style={styles.addIconContainer}>
              <MaterialIcons
                name="add-circle"
                size={20}
                color={Colors.greenAccent}
              />
            </View>
          </TouchableOpacity>

          {/* Others Card */}
          <TouchableOpacity
            style={[styles.typeCard, { backgroundColor: theme.uiBackground }]}
            onPress={() => openAddModal("other")}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.typeIconContainer,
                { backgroundColor: Colors.orangeAccent + "20" },
              ]}
            >
              <MaterialIcons
                name="payments"
                size={28}
                color={Colors.orangeAccent}
              />
            </View>
            <ThemedText style={styles.typeLabel}>Others</ThemedText>
            <ThemedText style={styles.typeAmount}>
              {formatCurrency(othersAmount)}
            </ThemedText>
            <View style={styles.addIconContainer}>
              <MaterialIcons
                name="add-circle"
                size={20}
                color={Colors.orangeAccent}
              />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Add Money Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setShowAddModal(false);
              setSelectedType(null);
            }}
          />
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.navBackground },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                {selectedType && (
                  <View
                    style={[
                      styles.modalTypeIcon,
                      { backgroundColor: getTypeColor(selectedType) + "20" },
                    ]}
                  >
                    <MaterialIcons
                      name={getTypeIcon(selectedType)}
                      size={24}
                      color={getTypeColor(selectedType)}
                    />
                  </View>
                )}
                <ThemedText style={styles.modalTitle}>
                  Add {getTypeLabel(selectedType)}
                </ThemedText>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  setSelectedType(null);
                }}
              >
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Amount (GH₵)</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    { color: theme.text, backgroundColor: theme.uiBackground },
                  ]}
                  placeholder="0.00"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                  value={formData.amount}
                  onChangeText={(text) =>
                    setFormData({ ...formData, amount: text })
                  }
                  editable={!addLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Description</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    { color: theme.text, backgroundColor: theme.uiBackground },
                  ]}
                  placeholder="e.g., Monthly dues payment"
                  placeholderTextColor="#999"
                  value={formData.description}
                  onChangeText={(text) =>
                    setFormData({ ...formData, description: text })
                  }
                  editable={!addLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Added By</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    { color: theme.text, backgroundColor: theme.uiBackground },
                  ]}
                  placeholder="Your name"
                  placeholderTextColor="#999"
                  value={formData.addedBy}
                  onChangeText={(text) =>
                    setFormData({ ...formData, addedBy: text })
                  }
                  editable={!addLoading}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.addButton,
                  {
                    backgroundColor: selectedType
                      ? getTypeColor(selectedType)
                      : Colors.primary,
                  },
                  addLoading && styles.addButtonDisabled,
                ]}
                onPress={handleAddMoney}
                disabled={addLoading}
              >
                {addLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.addButtonText}>
                    Add Money
                  </ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
};

export default Finances;

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
  modalTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
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
    borderColor: "#e0e0e0",
  },
  addButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 10,
  },
  addButtonDisabled: {
    opacity: 0.7,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
