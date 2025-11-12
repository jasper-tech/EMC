import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
} from "react-native";
import React, { useState, useEffect, useRef, useContext } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";
import { ThemeContext } from "../context/ThemeContext";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { auth } from "../firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";

// const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const Members = () => {
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [expandedMemberId, setExpandedMemberId] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const [formData, setFormData] = useState({
    fullname: "",
    address: "",
    phone: "",
    dateJoined: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    const membersRef = collection(db, "members");
    const q = query(membersRef, orderBy("dateJoined", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const membersList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMembers(membersList);
        setFilteredMembers(membersList);
        setLoading(false);

        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start();
      },
      (error) => {
        console.error("Error fetching members:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredMembers(members);
    } else {
      const filtered = members.filter(
        (member) =>
          member.fullname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.phone?.includes(searchQuery) ||
          member.address?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMembers(filtered);
    }
  }, [searchQuery, members]);

  const resetForm = () => {
    setFormData({
      fullname: "",
      address: "",
      phone: "",
      dateJoined: new Date().toISOString().split("T")[0],
    });
  };

  const validateDate = (dateString) => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return false;
    }

    const date = new Date(dateString);
    const today = new Date();

    // Check if date is valid and not in the future
    return date instanceof Date && !isNaN(date) && date <= today;
  };

  const handleAddMember = async () => {
    if (!formData.fullname.trim()) {
      Alert.alert("Error", "Please enter member's full name");
      return;
    }

    if (!formData.phone.trim()) {
      // Changed from contact to phone
      Alert.alert("Error", "Please enter member's phone number");
      return;
    }

    if (!validateDate(formData.dateJoined)) {
      Alert.alert(
        "Error",
        "Please enter a valid date in YYYY-MM-DD format (cannot be in the future)"
      );
      return;
    }

    try {
      setSubmitting(true);
      const membersRef = collection(db, "members");

      await addDoc(membersRef, {
        ...formData,
        uid: "",
        isExecutive: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const notificationsRef = collection(db, "notifications");
      await addDoc(notificationsRef, {
        type: "user_created",
        title: "New Member Added",
        message: `${formData.fullname} has joined the union`,
        timestamp: serverTimestamp(),
        readBy: [],
      });

      resetForm();
      setShowAddModal(false);
      Alert.alert("Success", "Member added successfully!");
    } catch (error) {
      console.error("Error adding member:", error);
      Alert.alert("Error", "Failed to add member");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditMember = async () => {
    if (!formData.fullname.trim()) {
      Alert.alert("Error", "Please enter member's full name");
      return;
    }

    if (!formData.phone.trim()) {
      Alert.alert("Error", "Please enter member's phone number");
      return;
    }

    if (!validateDate(formData.dateJoined)) {
      Alert.alert(
        "Error",
        "Please enter a valid date in YYYY-MM-DD format (cannot be in the future)"
      );
      return;
    }

    try {
      setSubmitting(true);
      const memberRef = doc(db, "members", selectedMember.id);
      await updateDoc(memberRef, {
        ...formData,
        updatedAt: serverTimestamp(),
      });

      // Also update users collection if this is an executive
      if (selectedMember.isExecutive && selectedMember.uid) {
        const userRef = doc(db, "users", selectedMember.uid);
        await updateDoc(userRef, {
          fullName: formData.fullname,
          phone: formData.phone,
          address: formData.address,
          updatedAt: serverTimestamp(),
        });

        // UPDATE ASYNCSTORAGE FOR INSTANT SIDEPANEL UPDATE
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.uid === selectedMember.uid) {
          // If editing current user's own profile, update AsyncStorage
          const userData = {
            fullName: formData.fullname,
            phone: formData.phone,
            address: formData.address,
          };
          await AsyncStorage.setItem(
            "currentUserData",
            JSON.stringify(userData)
          );
        }
      }

      setShowEditModal(false);
      setSelectedMember(null);
      resetForm();
      Alert.alert("Success", "Member updated successfully!");
    } catch (error) {
      console.error("Error updating member:", error);
      Alert.alert("Error", "Failed to update member");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (member) => {
    setSelectedMember(member);
    setFormData({
      fullname: member.fullname || "",
      address: member.address || "",
      phone: member.phone || "",
      dateJoined: member.dateJoined || new Date().toISOString().split("T")[0],
    });
    setShowEditModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const renderMemberCard = ({ item, index }) => {
    const isExpanded = expandedMemberId === item.id;
    const isExecutive = item.isExecutive;

    return (
      <Animated.View
        style={[
          styles.memberCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            backgroundColor: theme.uiBackground,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => setExpandedMemberId(isExpanded ? null : item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.memberHeader}>
            <View
              style={[
                styles.avatarContainer,
                {
                  backgroundColor: Colors.blueAccent + "20",
                  borderWidth: isExecutive ? 2 : 0,
                  borderColor: isExecutive ? Colors.goldAccent : "transparent",
                },
              ]}
            >
              <Ionicons
                name={isExecutive ? "star" : "person"}
                size={24}
                color={isExecutive ? Colors.goldAccent : Colors.blueAccent}
              />
              {isExecutive && (
                <View style={styles.executiveBadge}>
                  <Ionicons name="star" size={10} color={Colors.goldAccent} />
                </View>
              )}
            </View>
            <View style={styles.memberInfo}>
              <View style={styles.nameRow}>
                <ThemedText style={styles.memberName}>
                  {item.fullname}
                </ThemedText>
                {isExecutive && (
                  <View
                    style={[
                      styles.roleBadge,
                      { backgroundColor: Colors.goldAccent + "20" },
                    ]}
                  >
                    <ThemedText
                      style={[styles.roleText, { color: Colors.goldAccent }]}
                    >
                      {item.role}
                    </ThemedText>
                  </View>
                )}
              </View>
              <ThemedText style={styles.memberPhone}> {item.phone}</ThemedText>
              {item.email && (
                <ThemedText style={styles.memberEmail}>{item.email}</ThemedText>
              )}
            </View>
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color={Colors.blueAccent}
            />
          </View>

          {isExpanded && (
            <View style={styles.expandedContent}>
              <View style={styles.detailRow}>
                <Ionicons
                  name="home-outline"
                  size={20}
                  color={Colors.blueAccent}
                />
                <View style={styles.detailTextContainer}>
                  <ThemedText style={styles.detailLabel}>Address</ThemedText>
                  <ThemedText style={styles.detailValue}>
                    {item.address || "N/A"}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={Colors.greenAccent}
                />
                <View style={styles.detailTextContainer}>
                  <ThemedText style={styles.detailLabel}>
                    Date Joined
                  </ThemedText>
                  <ThemedText style={styles.detailValue}>
                    {formatDate(item.dateJoined)}
                  </ThemedText>
                </View>
              </View>

              {/* Display role for executives */}
              {isExecutive && (
                <View style={styles.detailRow}>
                  <Ionicons
                    name="shield-outline"
                    size={20}
                    color={Colors.goldAccent}
                  />
                  <View style={styles.detailTextContainer}>
                    <ThemedText style={styles.detailLabel}>Role</ThemedText>
                    <ThemedText style={[styles.detailValue]}>
                      {item.role}
                    </ThemedText>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.editButton,
                  { backgroundColor: Colors.blueAccent },
                ]}
                onPress={() => openEditModal(item)}
              >
                <Ionicons name="create-outline" size={18} color="#fff" />
                <ThemedText style={styles.editButtonText}>Edit</ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderModal = (isEditMode = false) => {
    const isVisible = isEditMode ? showEditModal : showAddModal;
    const onClose = () => {
      if (isEditMode) {
        setShowEditModal(false);
        setSelectedMember(null);
      } else {
        setShowAddModal(false);
      }
      resetForm();
    };
    const onSubmit = isEditMode ? handleEditMember : handleAddMember;
    const title = isEditMode ? "Edit Member" : "Add New Member";

    return (
      <Modal
        visible={isVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.uiBackground },
            ]}
          >
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>{title}</ThemedText>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={Colors.blueAccent} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Full Name *</ThemedText>
                <View
                  style={[
                    styles.inputWrapper,
                    { backgroundColor: theme.uiBackground },
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={Colors.blueAccent}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    value={formData.fullname}
                    onChangeText={(text) =>
                      setFormData({ ...formData, fullname: text })
                    }
                    placeholder="Enter full name"
                    placeholderTextColor="#999"
                    color={theme.text}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Address</ThemedText>
                <View
                  style={[
                    styles.inputWrapper,
                    styles.textAreaWrapper,
                    { backgroundColor: theme.uiBackground },
                  ]}
                >
                  <Ionicons
                    name="home-outline"
                    size={20}
                    color={Colors.blueAccent}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.address}
                    onChangeText={(text) =>
                      setFormData({ ...formData, address: text })
                    }
                    placeholder="Enter address"
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={3}
                    color={theme.text}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Phone *</ThemedText>
                <View
                  style={[
                    styles.inputWrapper,
                    { backgroundColor: theme.uiBackground },
                  ]}
                >
                  <Ionicons
                    name="call-outline"
                    size={20}
                    color={Colors.blueAccent}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    value={formData.phone}
                    onChangeText={(text) =>
                      setFormData({ ...formData, phone: text })
                    }
                    placeholder="Enter phone number"
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                    color={theme.text}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Date Joined *</ThemedText>
                <View
                  style={[
                    styles.inputWrapper,
                    { backgroundColor: theme.uiBackground },
                  ]}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={Colors.blueAccent}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    value={formData.dateJoined}
                    onChangeText={(text) =>
                      setFormData({ ...formData, dateJoined: text })
                    }
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#999"
                    keyboardType="numbers-and-punctuation"
                    color={theme.text}
                  />
                </View>
                <ThemedText style={styles.dateHint}>
                  Format: YYYY-MM-DD (e.g., 2024-01-15)
                </ThemedText>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton]}
                onPress={onSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={styles.submitButtonText}>
                    {isEditMode ? "Update" : "Add Member"}
                  </ThemedText>
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
          <ThemedText style={styles.loadingText}>Loading members...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Animated.View
        style={[
          styles.searchContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            backgroundColor: theme.uiBackground,
            margin: 16,
            marginBottom: 8,
          },
        ]}
      >
        <Ionicons name="search" size={20} color={Colors.blueAccent} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search members..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          color={theme.text}
        />
        {searchQuery !== "" && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close" size={18} color={Colors.blueAccent} />
          </TouchableOpacity>
        )}
      </Animated.View>

      {filteredMembers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#ccc" />
          <ThemedText style={styles.emptyText}>
            {searchQuery ? "No members found" : "No members yet"}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={filteredMembers}
          renderItem={renderMemberCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: Colors.blueAccent }]}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {renderModal(false)}
      {renderModal(true)}
    </ThemedView>
  );
};

export default Members;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.6,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 2,
    borderColor: `${Colors.blueAccent}20`,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
    gap: 12,
  },
  memberCard: {
    borderRadius: 16,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  memberHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  memberPhone: {
    fontSize: 14,
    opacity: 0.6,
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border + "20",
    gap: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    opacity: 0.5,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: "flex-end",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.5,
    marginTop: 16,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + "20",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    opacity: 0.7,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: `${Colors.blueAccent}20`,
  },
  textAreaWrapper: {
    alignItems: "flex-start",
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border + "20",
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: Colors.border + "40",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    opacity: 0.7,
  },
  submitButton: {
    backgroundColor: Colors.blueAccent,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  dateHint: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 4,
    fontStyle: "italic",
  },
  executiveBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: Colors.goldAccent,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 10,
    fontWeight: "600",
  },
  memberEmail: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 2,
  },
});
