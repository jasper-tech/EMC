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
  Image,
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
import * as ImagePicker from "expo-image-picker";

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
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const [formData, setFormData] = useState({
    fullname: "",
    address: "",
    phone: "",
    dateJoined: new Date().toISOString().split("T")[0],
    profileImg: "",
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

        // Sort members: executives first, then regular members
        const sortedMembers = membersList.sort((a, b) => {
          if (a.isExecutive && !b.isExecutive) return -1;
          if (!a.isExecutive && b.isExecutive) return 1;
          return 0;
        });

        setMembers(sortedMembers);
        setFilteredMembers(sortedMembers);
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
      profileImg: "",
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

  const pickImage = async () => {
    try {
      // Request permissions
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Sorry, we need camera roll permissions to select an image."
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].base64) {
        const base64String = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setFormData({ ...formData, profileImg: base64String });
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const removeImage = () => {
    setFormData({ ...formData, profileImg: "" });
  };

  const handleAddMember = async () => {
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
          profileImg: formData.profileImg,
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
            profileImg: formData.profileImg,
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
      profileImg: member.profileImg || "",
    });
    setShowEditModal(true);
  };

  const openImageModal = (imageUri) => {
    setSelectedImage(imageUri);
    setImageModalVisible(true);
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
            backgroundColor: theme.card,
            shadowColor: theme.shadow,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => setExpandedMemberId(isExpanded ? null : item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.memberHeader}>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                if (item.profileImg) {
                  openImageModal(item.profileImg);
                }
              }}
              activeOpacity={item.profileImg ? 0.7 : 1}
            >
              <View style={styles.avatarContainer}>
                {item.profileImg ? (
                  <Image
                    source={{ uri: item.profileImg }}
                    style={styles.profileImage}
                  />
                ) : (
                  <Ionicons
                    name="person-circle-outline"
                    size={44}
                    color={theme.text}
                    style={{ opacity: 0.3 }}
                  />
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.memberInfo}>
              <View style={styles.nameRow}>
                <ThemedText style={styles.memberName}>
                  {item.fullname}
                </ThemedText>
                {isExecutive && (
                  <Ionicons
                    name="shield-checkmark"
                    size={16}
                    color={Colors.goldAccent}
                  />
                )}
              </View>
              <ThemedText style={styles.memberPhone}>{item.phone}</ThemedText>
              {item.email && (
                <ThemedText style={styles.memberEmail}>{item.email}</ThemedText>
              )}
            </View>
          </View>

          {isExpanded && (
            <View style={styles.expandedContent}>
              {item.profileImg && (
                <View style={styles.imagePreviewContainer}>
                  <TouchableOpacity
                    onPress={() => openImageModal(item.profileImg)}
                  >
                    <Image
                      source={{ uri: item.profileImg }}
                      style={styles.expandedProfileImage}
                    />
                  </TouchableOpacity>
                  <ThemedText style={styles.viewImageText}>
                    Tap to view full image
                  </ThemedText>
                </View>
              )}

              <View style={styles.detailRow}>
                <Ionicons
                  name="location-outline"
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
                  color={Colors.blueAccent}
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
              {isExecutive && item.role && (
                <View style={styles.detailRow}>
                  <Ionicons
                    name="ribbon-outline"
                    size={20}
                    color={Colors.blueAccent}
                  />
                  <View style={styles.detailTextContainer}>
                    <ThemedText style={styles.detailLabel}>Role</ThemedText>
                    <ThemedText style={styles.detailValue}>
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

  const renderImageModal = () => (
    <Modal
      visible={imageModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setImageModalVisible(false)}
    >
      <View style={styles.imageModalOverlay}>
        <TouchableOpacity
          style={styles.imageModalBackground}
          activeOpacity={1}
          onPress={() => setImageModalVisible(false)}
        >
          <Image
            source={{ uri: selectedImage }}
            style={styles.fullSizeImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.closeImageButton}
          onPress={() => setImageModalVisible(false)}
        >
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </Modal>
  );

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
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>{title}</ThemedText>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              {/* Profile Image Section */}
              <View style={styles.imageSection}>
                <ThemedText style={styles.inputLabel}>Profile Image</ThemedText>
                {formData.profileImg ? (
                  <View style={styles.imagePreviewWrapper}>
                    <Image
                      source={{ uri: formData.profileImg }}
                      style={styles.formProfileImage}
                    />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={removeImage}
                    >
                      <Ionicons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.imageUploadButton,
                      { borderColor: Colors.blueAccent },
                    ]}
                    onPress={pickImage}
                  >
                    <Ionicons
                      name="image-outline"
                      size={32}
                      color={theme.text}
                      style={{ opacity: 0.5 }}
                    />
                    <ThemedText style={styles.uploadButtonText}>
                      Tap to add profile image
                    </ThemedText>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Full Name *</ThemedText>
                <View
                  style={[styles.inputWrapper, { backgroundColor: theme.card }]}
                >
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={Colors.blueAccent}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input]}
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
                    { backgroundColor: theme.card },
                  ]}
                >
                  <Ionicons
                    name="location-outline"
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
                  style={[styles.inputWrapper, { backgroundColor: theme.card }]}
                >
                  <Ionicons
                    name="call-outline"
                    size={20}
                    color={Colors.blueAccent}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input]}
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
                  style={[styles.inputWrapper, { backgroundColor: theme.card }]}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={Colors.blueAccent}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input]}
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
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.submitButtonText}>
                    {isEditMode ? "Update" : "Add Member"}
                  </ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </ThemedView>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.blueAccent} />
        <ThemedText style={styles.loadingText}>Loading members...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.searchContainer, { backgroundColor: theme.card }]}>
        <Ionicons name="search" size={20} color={Colors.blueAccent} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search members..."
          placeholderTextColor={theme.text + "80"}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== "" && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color={theme.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* Total Members Count */}
      <View style={styles.memberCountContainer}>
        <ThemedText style={styles.memberCountText}>
          Total Members: {filteredMembers.length}
        </ThemedText>
      </View>

      {filteredMembers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="people-outline"
            size={64}
            color={theme.text}
            style={{ opacity: 0.3 }}
          />
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
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {renderModal(false)}
      {renderModal(true)}
      {renderImageModal()}
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
    margin: 16,
    marginBottom: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  memberCountContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "flex-end",
  },
  memberCountText: {
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.7,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
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
    position: "relative",
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 22,
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
  imagePreviewContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  expandedProfileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginVertical: 8,
  },
  viewImageText: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 4,
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
  // Image related styles
  imageSection: {
    alignItems: "center",
    marginBottom: 16,
  },
  imageUploadButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  uploadButtonText: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    opacity: 0.7,
  },
  imagePreviewWrapper: {
    position: "relative",
  },
  formProfileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: Colors.blueAccent,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageModalBackground: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  fullSizeImage: {
    width: "90%",
    height: "80%",
  },
  closeImageButton: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});
