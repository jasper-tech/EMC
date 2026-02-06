import React, { useState, useEffect, useContext, useRef } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Dimensions,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeContext } from "../context/ThemeContext";
import { Colors } from "../constants/Colors";
import ThemedText from "../components/ThemedText";
import ThemedView from "../components/ThemedView";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { CustomAlert } from "../components/CustomAlert";
import ConfirmationModal from "../components/ConfirmationModal";

const { width, height } = Dimensions.get("window");
const isWeb = Platform.OS === "web";
const isTablet = width >= 768;

const MemberInfo = ({ navigation }) => {
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;
  const accentColors = Colors;

  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(0.98)).current;
  const inputFocusAnim = useRef(new Animated.Value(0)).current;

  // Alert states
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

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingChanges, setPendingChanges] = useState({});

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    birthDate: "",
    role: "",
    dateJoined: "",
  });

  const [originalData, setOriginalData] = useState({});

  useEffect(() => {
    loadUserData();

    // Start entrance animations
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
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleInputFocus = () => {
    Animated.timing(inputFocusAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleInputBlur = () => {
    Animated.timing(inputFocusAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  // Alert helper
  const showAlert = (config) => {
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

  const loadUserData = async () => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;

      if (!currentUser) {
        showAlert({
          type: "danger",
          title: "Error",
          message: "User not logged in",
          onConfirm: () => navigation.goBack(),
        });
        return;
      }

      // Try to load from AsyncStorage first for faster display
      const cachedData = await AsyncStorage.getItem(
        `userProfile_${currentUser.uid}`
      );
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        setUserData(parsedData);
        setFormData(parsedData);
        setOriginalData(parsedData);
      }

      // Then load from Firestore for latest data
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));

      if (userDoc.exists()) {
        const data = userDoc.data();
        const userInfo = {
          id: currentUser.uid,
          fullName:
            data.fullName ||
            currentUser.displayName ||
            currentUser.email.split("@")[0],
          email: currentUser.email,
          phone: data.phone || "Not set",
          address: data.address || "Not set",
          birthDate: data.birthDate || "",
          role: data.role || "Member",
          dateJoined: data.dateJoined || new Date().toISOString().split("T")[0],
          profileImg: data.profileImg || null,
          isExecutive: data.isExecutive || false,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        };

        setUserData(userInfo);
        setFormData(userInfo);
        setOriginalData(userInfo);

        // Cache the data
        await AsyncStorage.setItem(
          `userProfile_${currentUser.uid}`,
          JSON.stringify(userInfo)
        );

        // Also update members collection if it exists
        if (data.phone || data.address) {
          await syncWithMembersCollection(currentUser.uid, userInfo);
        }
      } else {
        // Create basic user document if it doesn't exist
        const basicInfo = {
          id: currentUser.uid,
          fullName: currentUser.displayName || currentUser.email.split("@")[0],
          email: currentUser.email,
          phone: "Not set",
          address: "Not set",
          role: "Member",
          dateJoined: new Date().toISOString().split("T")[0],
          profileImg: null,
          isExecutive: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setUserData(basicInfo);
        setFormData(basicInfo);
        setOriginalData(basicInfo);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      showAlert({
        type: "failed",
        title: "Error",
        message: "Failed to load user data",
      });
    } finally {
      setLoading(false);
    }
  };

  const syncWithMembersCollection = async (uid, userData) => {
    try {
      const { collection, query, where, getDocs, updateDoc } = await import(
        "firebase/firestore"
      );

      const membersRef = collection(db, "members");
      const q = query(membersRef, where("uid", "==", uid));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const memberDoc = snapshot.docs[0];
        const memberRef = doc(db, "members", memberDoc.id);

        await updateDoc(memberRef, {
          fullname: userData.fullName,
          phone: userData.phone,
          address: userData.address,
          birthDate: userData.birthDate,
          profileImg: userData.profileImg,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error syncing with members collection:", error);
    }
  };

  // Image compression helper
  const compressImage = async (uri) => {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }], // Resize to max 800px width
        {
          compress: 0.3,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );
      return manipResult;
    } catch (error) {
      console.error("Error compressing image:", error);
      return null;
    }
  };

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        showAlert({
          type: "danger",
          title: "Permission required",
          message: "Please grant photo library access.",
        });
        return;
      }

      setUploadingImage(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: false, // Don't get base64 immediately
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        // Compress the image first
        const compressed = await compressImage(asset.uri);

        if (!compressed || !compressed.base64) {
          throw new Error(
            "Failed to process image. Please try a different image."
          );
        }

        const base64String = `data:image/jpeg;base64,${compressed.base64}`;

        // Check size
        const sizeInBytes = base64String.length * 0.75;
        const sizeInMB = sizeInBytes / (1024 * 1024);

        console.log(`Compressed image size: ${sizeInMB.toFixed(2)} MB`);

        if (sizeInMB > 0.9) {
          showAlert({
            type: "danger",
            title: "Image Too Large",
            message: `Even after compression, the image is ${sizeInMB.toFixed(
              2
            )}MB. Please select a smaller image.`,
          });
          setUploadingImage(false);
          return;
        }

        // Update form data
        setFormData((prev) => ({
          ...prev,
          profileImg: base64String,
        }));

        // Save the image
        await saveProfileImage(base64String);
      } else {
        setUploadingImage(false);
      }
    } catch (error) {
      console.error("Error picking image:", error);

      let errorMessage = "Failed to pick image. ";

      if (error.message.includes("process")) {
        errorMessage +=
          "The image could not be processed. Try a different image.";
      } else if (error.message.includes("memory")) {
        errorMessage +=
          "The image is too large. Please select a smaller image.";
      } else {
        errorMessage += "Please try again.";
      }

      showAlert({
        type: "failed",
        title: "Error",
        message: errorMessage,
      });

      setUploadingImage(false);
    }
  };

  const saveProfileImage = async (base64Image) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("User not logged in");
      }

      // Validate base64 string
      if (!base64Image || !base64Image.startsWith("data:image")) {
        throw new Error("Invalid image data");
      }

      // Update Firestore
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        profileImg: base64Image,
        updatedAt: new Date().toISOString(),
      });

      // Update AsyncStorage
      const updatedData = { ...formData, profileImg: base64Image };
      await AsyncStorage.setItem(
        `userProfile_${currentUser.uid}`,
        JSON.stringify(updatedData)
      );

      // Sync with members collection
      await syncWithMembersCollection(currentUser.uid, updatedData);

      // Update local state
      setUserData(updatedData);

      showAlert({
        type: "success",
        title: "Success",
        message: "Profile picture updated successfully!",
      });
    } catch (error) {
      console.error("Error saving profile image:", error);

      let errorMessage = "Failed to save profile image. ";

      if (error.code === "permission-denied") {
        errorMessage += "You don't have permission to update your profile.";
      } else if (error.code === "unavailable") {
        errorMessage += "Network error. Please check your connection.";
      } else if (
        error.message.includes("too large") ||
        error.code === "invalid-argument"
      ) {
        errorMessage +=
          "The image is too large for storage. Please select a smaller image.";
      } else if (error.message.includes("Invalid image")) {
        errorMessage +=
          "The image data is invalid. Please try a different image.";
      } else {
        errorMessage += "Please try again.";
      }

      showAlert({
        type: "failed",
        title: "Error",
        message: errorMessage,
      });

      // Revert the form data if save failed
      setFormData((prev) => ({
        ...prev,
        profileImg: userData?.profileImg || "",
      }));
    } finally {
      setUploadingImage(false);
    }
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      showAlert({
        type: "danger",
        title: "Error",
        message: "Full name is required",
      });
      return false;
    }

    // Validate birth date format if provided
    if (formData.birthDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(formData.birthDate)) {
        showAlert({
          type: "danger",
          title: "Error",
          message: "Birth date must be in YYYY-MM-DD format",
        });
        return false;
      }
    }

    return true;
  };

  const prepareSaveChanges = () => {
    if (!validateForm()) {
      return;
    }

    // Check if there are actual changes
    const hasChanges =
      formData.fullName !== originalData.fullName ||
      formData.phone !== originalData.phone ||
      formData.address !== originalData.address ||
      formData.birthDate !== originalData.birthDate;

    if (!hasChanges) {
      showAlert({
        type: "info",
        title: "No Changes",
        message: "No changes were made to your profile.",
        onConfirm: () => setEditing(false),
      });
      return;
    }

    // Store pending changes for confirmation
    setPendingChanges({
      fullName: formData.fullName.trim(),
      phone: formData.phone.trim() || "Not set",
      address: formData.address.trim() || "Not set",
      birthDate: formData.birthDate || "",
    });

    // Show confirmation modal
    setShowConfirmModal(true);
  };

  const executeSaveChanges = async () => {
    try {
      setSaving(true);
      const currentUser = auth.currentUser;

      // Prepare update data
      const updateData = {
        fullName: pendingChanges.fullName,
        phone: pendingChanges.phone,
        address: pendingChanges.address,
        updatedAt: new Date().toISOString(),
      };

      // Only update birthDate if it's changed
      if (pendingChanges.birthDate !== originalData.birthDate) {
        updateData.birthDate = pendingChanges.birthDate || "";
      }

      // Update Firestore
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, updateData);

      // Update AsyncStorage
      const updatedData = { ...userData, ...updateData };
      await AsyncStorage.setItem(
        `userProfile_${currentUser.uid}`,
        JSON.stringify(updatedData)
      );

      // Also update AsyncStorage for side panel
      await AsyncStorage.setItem(
        `userName_${currentUser.uid}`,
        pendingChanges.fullName
      );

      // Sync with members collection
      await syncWithMembersCollection(currentUser.uid, updatedData);

      // Update state
      setUserData(updatedData);
      setOriginalData(updatedData);
      setFormData(updatedData);
      setEditing(false);
      setShowConfirmModal(false);

      showAlert({
        type: "success",
        title: "Success",
        message: "Profile updated successfully!",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      showAlert({
        type: "failed",
        title: "Error",
        message: "Failed to update profile",
      });
    } finally {
      setSaving(false);
      setPendingChanges({});
    }
  };

  const handleCancel = () => {
    setFormData(originalData);
    setEditing(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    try {
      const birth = new Date(birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();

      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birth.getDate())
      ) {
        age--;
      }
      return age;
    } catch (error) {
      return null;
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.blueAccent} />
          <ThemedText style={styles.loadingText}>Loading profile...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* Custom Alert */}
      <CustomAlert {...alertConfig} visible={alertVisible} />

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setPendingChanges({});
        }}
        onConfirm={executeSaveChanges}
        type="info"
        title="Confirm Changes"
        message="Are you sure you want to save these changes to your profile?"
        confirmText="Save Changes"
        cancelText="Cancel"
        isLoading={saving}
      />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => (editing ? prepareSaveChanges() : setEditing(true))}
          disabled={saving}
        >
          {editing ? (
            saving ? (
              <ActivityIndicator size="small" color={Colors.blueAccent} />
            ) : (
              <Ionicons name="checkmark" size={24} color={Colors.blueAccent} />
            )
          ) : (
            <Ionicons name="create-outline" size={22} color={theme.text} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.animatedContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
              maxWidth: isWeb ? 800 : "100%",
              alignSelf: "center",
              width: "100%",
            },
          ]}
        >
          {/* Profile Image Section */}
          <View style={styles.profileImageSection}>
            <TouchableOpacity
              style={styles.profileImageContainer}
              onPress={editing ? pickImage : undefined}
              disabled={!editing || uploadingImage}
            >
              {userData?.profileImg ? (
                <Image
                  source={{ uri: userData.profileImg }}
                  style={styles.profileImage}
                />
              ) : (
                <View
                  style={[
                    styles.profileImagePlaceholder,
                    { backgroundColor: theme.uiBackground },
                  ]}
                >
                  <Ionicons
                    name="person"
                    size={isWeb ? 56 : 48}
                    color={theme.text}
                    style={{ opacity: 0.5 }}
                  />
                </View>
              )}

              {editing && (
                <View style={styles.imageEditOverlay}>
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons
                      name="camera"
                      size={isWeb ? 28 : 24}
                      color="#fff"
                    />
                  )}
                </View>
              )}
            </TouchableOpacity>

            <ThemedText style={styles.profileName}>
              {userData?.fullName}
            </ThemedText>
            <View style={styles.roleBadge}>
              <Ionicons
                name="shield-checkmark"
                size={isWeb ? 18 : 16}
                color={
                  userData?.isExecutive ? Colors.goldAccent : Colors.goldAccent
                }
              />
              <ThemedText style={styles.roleText}>{userData?.role}</ThemedText>
            </View>
          </View>

          {/* Personal Information */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>
              Personal Information
            </ThemedText>

            <View style={styles.infoCard}>
              {/* Full Name */}
              <View style={styles.inputContainer}>
                <ThemedText
                  style={[styles.label, { color: accentColors.blueAccent }]}
                >
                  Full Name
                </ThemedText>
                <Animated.View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: theme.uiBackground,
                      borderColor: editing
                        ? `${accentColors.blueAccent}40`
                        : `${accentColors.blueAccent}20`,
                      shadowColor: accentColors.blueAccent,
                      transform: [
                        {
                          scale: inputFocusAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.02],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={isWeb ? 22 : 18}
                    color={accentColors.blueAccent}
                    style={styles.inputIcon}
                  />
                  {editing ? (
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="Enter your full name"
                      placeholderTextColor={theme.text + "80"}
                      value={formData.fullName}
                      onChangeText={(text) =>
                        setFormData({ ...formData, fullName: text })
                      }
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      editable={!loading}
                    />
                  ) : (
                    <ThemedText
                      style={[styles.inputText, { color: theme.text }]}
                    >
                      {userData?.fullName}
                    </ThemedText>
                  )}
                </Animated.View>
              </View>

              {/* Email (Non-editable) */}
              <View style={styles.inputContainer}>
                <ThemedText
                  style={[styles.label, { color: accentColors.blueAccent }]}
                >
                  Email Address
                </ThemedText>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: theme.uiBackground + "80",
                      borderColor: `${accentColors.blueAccent}20`,
                      opacity: 0.8,
                    },
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={isWeb ? 22 : 18}
                    color={accentColors.blueAccent}
                    style={styles.inputIcon}
                  />
                  <ThemedText
                    style={[
                      styles.inputText,
                      { color: theme.text, opacity: 0.7 },
                    ]}
                  >
                    {userData?.email}
                  </ThemedText>
                </View>
              </View>

              {/* Phone */}
              <View style={styles.inputContainer}>
                <ThemedText
                  style={[styles.label, { color: accentColors.blueAccent }]}
                >
                  Phone Number
                </ThemedText>
                <Animated.View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: theme.uiBackground,
                      borderColor: editing
                        ? `${accentColors.blueAccent}40`
                        : `${accentColors.blueAccent}20`,
                      shadowColor: accentColors.blueAccent,
                      transform: [
                        {
                          scale: inputFocusAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.02],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Ionicons
                    name="call-outline"
                    size={isWeb ? 22 : 18}
                    color={accentColors.blueAccent}
                    style={styles.inputIcon}
                  />
                  {editing ? (
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="Enter phone number"
                      placeholderTextColor={theme.text + "80"}
                      keyboardType="phone-pad"
                      value={formData.phone}
                      onChangeText={(text) =>
                        setFormData({ ...formData, phone: text })
                      }
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      editable={!loading}
                    />
                  ) : (
                    <ThemedText
                      style={[styles.inputText, { color: theme.text }]}
                    >
                      {userData?.phone}
                    </ThemedText>
                  )}
                </Animated.View>
              </View>

              {/* Address */}
              <View style={styles.inputContainer}>
                <ThemedText
                  style={[styles.label, { color: accentColors.blueAccent }]}
                >
                  Address
                </ThemedText>
                <Animated.View
                  style={[
                    styles.inputWrapper,
                    styles.textAreaWrapper,
                    {
                      backgroundColor: theme.uiBackground,
                      borderColor: editing
                        ? `${accentColors.blueAccent}40`
                        : `${accentColors.blueAccent}20`,
                      shadowColor: accentColors.blueAccent,
                      transform: [
                        {
                          scale: inputFocusAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.02],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Ionicons
                    name="location-outline"
                    size={isWeb ? 22 : 18}
                    color={accentColors.blueAccent}
                    style={styles.inputIcon}
                  />
                  {editing ? (
                    <TextInput
                      style={[
                        styles.input,
                        styles.textArea,
                        { color: theme.text },
                      ]}
                      placeholder="Enter your address"
                      placeholderTextColor={theme.text + "80"}
                      value={formData.address}
                      onChangeText={(text) =>
                        setFormData({ ...formData, address: text })
                      }
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      multiline
                      numberOfLines={isWeb ? 4 : 3}
                      editable={!loading}
                    />
                  ) : (
                    <ThemedText
                      style={[
                        styles.inputText,
                        styles.textArea,
                        { color: theme.text },
                      ]}
                    >
                      {userData?.address}
                    </ThemedText>
                  )}
                </Animated.View>
              </View>

              {/* Birth Date */}
              <View style={styles.inputContainer}>
                <ThemedText
                  style={[styles.label, { color: accentColors.blueAccent }]}
                >
                  Birth Date
                </ThemedText>
                <Animated.View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: theme.uiBackground,
                      borderColor: editing
                        ? `${accentColors.blueAccent}40`
                        : `${accentColors.blueAccent}20`,
                      shadowColor: accentColors.blueAccent,
                      transform: [
                        {
                          scale: inputFocusAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.02],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Ionicons
                    name="gift-outline"
                    size={isWeb ? 22 : 18}
                    color={Colors.purpleAccent}
                    style={styles.inputIcon}
                  />
                  {editing ? (
                    <View style={styles.birthDateContainer}>
                      <TextInput
                        style={[styles.input, { color: theme.text }]}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={theme.text + "80"}
                        value={formData.birthDate}
                        onChangeText={(text) =>
                          setFormData({ ...formData, birthDate: text })
                        }
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                        editable={!loading}
                      />
                      {formData.birthDate &&
                        calculateAge(formData.birthDate) && (
                          <ThemedText style={styles.ageText}>
                            {calculateAge(formData.birthDate)} years
                          </ThemedText>
                        )}
                    </View>
                  ) : (
                    <View style={styles.birthDateContainer}>
                      <ThemedText
                        style={[styles.inputText, { color: theme.text }]}
                      >
                        {userData?.birthDate
                          ? formatDate(userData.birthDate)
                          : "Not set"}
                      </ThemedText>
                      {userData?.birthDate &&
                        calculateAge(userData.birthDate) && (
                          <ThemedText style={styles.ageText}>
                            ({calculateAge(userData.birthDate)} years)
                          </ThemedText>
                        )}
                    </View>
                  )}
                </Animated.View>
              </View>
            </View>
          </View>

          {/* Account Information */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>
              Account Information
            </ThemedText>

            <View style={styles.infoCard}>
              {/* Date Joined */}
              <View style={styles.inputContainer}>
                <ThemedText
                  style={[styles.label, { color: accentColors.blueAccent }]}
                >
                  Date Joined
                </ThemedText>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: theme.uiBackground + "80",
                      borderColor: `${accentColors.blueAccent}20`,
                      opacity: 0.8,
                    },
                  ]}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={isWeb ? 22 : 18}
                    color={accentColors.blueAccent}
                    style={styles.inputIcon}
                  />
                  <ThemedText style={[styles.inputText, { color: theme.text }]}>
                    {formatDate(userData?.dateJoined)}
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Edit Mode Actions */}
      {editing && (
        <View
          style={[styles.editActions, { backgroundColor: theme.navBackground }]}
        >
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.cancelButton,
              {
                backgroundColor: theme.uiBackground,
                borderColor: theme.border || Colors.border,
              },
            ]}
            onPress={handleCancel}
            disabled={saving}
          >
            <Ionicons name="close" size={isWeb ? 22 : 20} color={theme.text} />
            <ThemedText
              style={[styles.cancelButtonText, { color: theme.text }]}
            >
              Cancel
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.saveButton]}
            onPress={prepareSaveChanges}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="save-outline"
                  size={isWeb ? 22 : 20}
                  color="#fff"
                />
                <ThemedText style={styles.saveButtonText}>
                  Save Changes
                </ThemedText>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ThemedView>
  );
};

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
    fontSize: isWeb ? 18 : 16,
    opacity: 0.6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: isWeb ? 40 : 16,
    paddingTop: Platform.OS === "ios" ? 50 : 16,
    paddingBottom: 16,
  },
  editButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingBottom: 100,
  },
  animatedContent: {
    paddingHorizontal: isWeb ? 40 : 16,
    paddingTop: isWeb ? 32 : 24,
  },
  profileImageSection: {
    alignItems: "center",
    paddingVertical: isWeb ? 40 : 32,
    paddingHorizontal: 16,
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: isWeb ? 20 : 16,
  },
  profileImage: {
    width: isWeb ? 140 : 120,
    height: isWeb ? 140 : 120,
    borderRadius: isWeb ? 70 : 60,
    borderWidth: 4,
    borderColor: Colors.blueAccent + "30",
  },
  profileImagePlaceholder: {
    width: isWeb ? 140 : 120,
    height: isWeb ? 140 : 120,
    borderRadius: isWeb ? 70 : 60,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: Colors.border,
  },
  imageEditOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: Colors.blueAccent,
    width: isWeb ? 44 : 40,
    height: isWeb ? 44 : 40,
    borderRadius: isWeb ? 22 : 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  profileName: {
    fontSize: isWeb ? 28 : 24,
    fontWeight: "bold",
    marginBottom: isWeb ? 12 : 8,
    textAlign: "center",
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: isWeb ? 8 : 6,
    paddingHorizontal: isWeb ? 16 : 12,
    paddingVertical: isWeb ? 8 : 6,
    borderRadius: 12,
    backgroundColor: Colors.blueAccent + "15",
  },
  roleText: {
    fontSize: isWeb ? 16 : 14,
    fontWeight: "600",
  },
  section: {
    marginBottom: isWeb ? 32 : 24,
  },
  sectionTitle: {
    fontSize: isWeb ? 20 : 18,
    fontWeight: "600",
    marginBottom: isWeb ? 16 : 12,
    opacity: 0.8,
  },
  infoCard: {
    borderRadius: isWeb ? 20 : 16,
    padding: isWeb ? 24 : 16,
    backgroundColor: Colors.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: isWeb ? 12 : 8,
    elevation: 3,
  },
  inputContainer: {
    marginBottom: isWeb ? 24 : 20,
  },
  label: {
    fontSize: isWeb ? 16 : 14,
    fontWeight: "600",
    marginBottom: isWeb ? 12 : 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: isWeb ? 12 : 16,
    paddingHorizontal: isWeb ? 20 : 16,
    paddingVertical: isWeb ? 16 : 12,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  textAreaWrapper: {
    alignItems: "flex-start",
    minHeight: isWeb ? 100 : 80,
  },
  inputIcon: {
    marginRight: isWeb ? 16 : 12,
  },
  input: {
    flex: 1,
    fontSize: isWeb ? 18 : 16,
    padding: 0,
    ...(isWeb && {
      outlineStyle: "none",
    }),
  },
  inputText: {
    flex: 1,
    fontSize: isWeb ? 18 : 16,
  },
  textArea: {
    height: isWeb ? 80 : 60,
    textAlignVertical: "top",
  },
  birthDateContainer: {
    flex: 2,
    alignItems: "flex-end",
    gap: 4,
  },
  birthDateDisplay: {
    flex: 2,
    alignItems: "flex-end",
    gap: 4,
  },
  ageText: {
    fontSize: 12,
    color: Colors.purpleAccent,
    fontStyle: "italic",
  },
  editActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    padding: 16,
    backgroundColor: Colors.navBackground,
    borderTopWidth: 1,
    borderTopColor: Colors.border + "20",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    minHeight: 50,
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: Colors.blueAccent,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default MemberInfo;
