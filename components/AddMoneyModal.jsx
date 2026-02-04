import React, { useState, useContext } from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { Colors } from "../constants/Colors";
import ThemedText from "./ThemedText";
import { ThemeContext } from "../context/ThemeContext";

const AddMoneyModal = ({
  visible,
  onClose,
  onSubmit,
  isLoading = false,
  selectedType,
  setSelectedType,
  selectedYear,
  setSelectedYear,
  existingBudgetYears = [],
  formData,
  setFormData,
  userFullName = "",
  formatAmount, // New prop for formatting amount
}) => {
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;

  // Default formatter if parent doesn't provide one
  const defaultFormatAmount = (value) => {
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

  // Use parent's formatter or default one
  const amountFormatter = formatAmount || defaultFormatAmount;

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

  const getTypeIcon = (type) => {
    switch (type) {
      case "dues":
        return "receipt";
      case "contribution":
        return "volunteer-activism";
      case "other":
        return "payments";
      case "budget":
        return "account-balance-wallet";
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
      case "budget":
        return Colors.purpleAccent;
      default:
        return Colors.primary;
    }
  };

  const handleYearChange = (itemValue) => {
    if (selectedType === "budget" && existingBudgetYears.includes(itemValue)) {
      return; // Let parent handle the error
    }
    setSelectedYear(itemValue);
    setFormData({
      ...formData,
      description:
        selectedType === "budget"
          ? `Budget for ${itemValue}`
          : `Dues payment for ${itemValue}`,
    });
  };

  const handleAmountChange = (text) => {
    const formattedAmount = amountFormatter(text);
    setFormData({ ...formData, amount: formattedAmount });
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
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
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {(selectedType === "budget" || selectedType === "dues") && (
              <View style={styles.yearPickerContainer}>
                <ThemedText style={styles.label}>Year</ThemedText>
                <View
                  style={[
                    styles.pickerWrapper,
                    { backgroundColor: theme.uiBackground },
                  ]}
                >
                  <Picker
                    selectedValue={selectedYear}
                    onValueChange={handleYearChange}
                    style={{ color: theme.text }}
                    enabled={!isLoading}
                  >
                    {/* Show only current year */}
                    <Picker.Item
                      key={selectedYear}
                      label={selectedYear}
                      value={selectedYear}
                      enabled={
                        selectedType === "dues" ||
                        !existingBudgetYears.includes(selectedYear)
                      }
                    />
                  </Picker>
                </View>
                <ThemedText style={styles.yearNote}>
                  {selectedType === "budget" &&
                  existingBudgetYears.includes(selectedYear) ? (
                    <MaterialIcons
                      name="error"
                      size={14}
                      color={Colors.redAccent}
                    />
                  ) : (
                    <MaterialIcons
                      name="info"
                      size={14}
                      color={Colors.blueAccent}
                    />
                  )}{" "}
                  {selectedType === "budget" &&
                  existingBudgetYears.includes(selectedYear)
                    ? `Budget for ${selectedYear} already exists`
                    : selectedType === "budget"
                    ? `Setting budget for ${selectedYear}`
                    : `Recording dues for ${selectedYear}`}
                </ThemedText>
              </View>
            )}

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Amount (GH₵)</ThemedText>
              <View style={styles.amountInputContainer}>
                <ThemedText style={styles.currencySymbol}>GH₵</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    { color: theme.text, backgroundColor: theme.uiBackground },
                  ]}
                  placeholder="0.00"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad" // Better for decimal input
                  returnKeyType="next"
                  value={formData.amount}
                  onChangeText={handleAmountChange}
                  editable={!isLoading}
                  maxLength={15} // Reasonable limit for amount
                />
              </View>
              <ThemedText style={styles.amountHint}>
                Enter a valid amount
              </ThemedText>
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Description</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { color: theme.text, backgroundColor: theme.uiBackground },
                ]}
                placeholder={
                  selectedType === "budget"
                    ? "Budget description"
                    : selectedType === "dues"
                    ? "Dues payment description"
                    : "e.g., Monthly dues payment"
                }
                placeholderTextColor="#999"
                value={formData.description}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
                editable={!isLoading && selectedType !== "budget"}
                multiline={true}
                numberOfLines={2}
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
                editable={false}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.addButton,
                {
                  backgroundColor: selectedType
                    ? getTypeColor(selectedType)
                    : Colors.primary,
                  opacity:
                    selectedType === "budget" &&
                    existingBudgetYears.includes(selectedYear)
                      ? 0.5
                      : 1,
                },
                isLoading && styles.addButtonDisabled,
              ]}
              onPress={onSubmit}
              disabled={
                isLoading ||
                (selectedType === "budget" &&
                  existingBudgetYears.includes(selectedYear))
              }
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.addButtonText}>
                  {selectedType === "budget" &&
                  existingBudgetYears.includes(selectedYear)
                    ? "Budget Already Exists"
                    : "Add Money"}
                </ThemedText>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
    paddingBottom: 20,
    maxHeight: "70%",
  },
  yearPickerContainer: {
    marginBottom: 20,
  },
  pickerWrapper: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginTop: 8,
  },
  yearNote: {
    fontSize: 12,
    marginTop: 8,
    opacity: 0.8,
    flexDirection: "row",
    alignItems: "center",
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

export default AddMoneyModal;
