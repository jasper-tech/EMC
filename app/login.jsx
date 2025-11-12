import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect } from "react";
import * as WebBrowser from "expo-web-browser";
// import * as Google from "expo-auth-session/providers/google";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import { router } from "expo-router";
import {
  signInWithEmailAndPassword,
  // GoogleAuthProvider,
  // signInWithCredential,
} from "firebase/auth";
import { auth } from "../firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

WebBrowser.maybeCompleteAuthSession();

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  // Google Sign-In configuration
  // const [request, response, promptAsync] = Google.useAuthRequest({
  //   androidClientId: "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com",
  //   iosClientId: "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com",
  //   webClientId: "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com",
  // });

  // Handle Google Sign-In response
  // useEffect(() => {
  //   if (response?.type === "success") {
  //     const { id_token } = response.params;
  //     handleGoogleSignIn(id_token);
  //   }
  // }, [response]);

  const handleLogin = async () => {
    // Validate input
    if (!formData.email || !formData.password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      // CLEAR PREVIOUS CREDENTIALS BEFORE SAVING NEW ONES
      await AsyncStorage.multiRemove([
        "savedEmail",
        "savedPassword",
        "savedName",
        "savedProfileImg",
      ]);

      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      console.log("User logged in:", userCredential.user.uid);

      // Save credentials if remember me is checked
      if (rememberMe) {
        await AsyncStorage.setItem("savedEmail", formData.email);
        await AsyncStorage.setItem("savedPassword", formData.password);

        // Get user's display name
        const displayName =
          userCredential.user.displayName || formData.email.split("@")[0];
        await AsyncStorage.setItem("savedName", displayName);

        // Try to get the base64 profile image from Firestore
        try {
          const userDoc = await getDoc(
            doc(db, "users", userCredential.user.uid)
          );
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.profileImg) {
              // Save the base64 image from Firestore
              await AsyncStorage.setItem(
                "savedProfileImg",
                userData.profileImg
              );
            } else if (userCredential.user.photoURL) {
              // Fallback to Firebase photoURL
              await AsyncStorage.setItem(
                "savedProfileImg",
                userCredential.user.photoURL
              );
            }
          } else if (userCredential.user.photoURL) {
            // Fallback if no Firestore document
            await AsyncStorage.setItem(
              "savedProfileImg",
              userCredential.user.photoURL
            );
          }
        } catch (firestoreError) {
          console.error("Error fetching user data:", firestoreError);
          // Fallback to Firebase photoURL
          if (userCredential.user.photoURL) {
            await AsyncStorage.setItem(
              "savedProfileImg",
              userCredential.user.photoURL
            );
          }
        }
      }

      // Navigate to dashboard after successful login
      router.replace("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      let errorMessage = "An error occurred during login";

      switch (error.code) {
        case "auth/invalid-email":
          errorMessage = "Invalid email address";
          break;
        case "auth/user-disabled":
          errorMessage = "This account has been disabled";
          break;
        case "auth/user-not-found":
          errorMessage = "No account found with this email";
          break;
        case "auth/wrong-password":
          errorMessage = "Incorrect password";
          break;
        case "auth/invalid-credential":
          errorMessage = "Invalid email or password";
          break;
        default:
          errorMessage = error.message;
      }

      Alert.alert("Login Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // const handleGoogleSignIn = async (idToken) => {
  //   setLoading(true);
  //   try {
  //     const credential = GoogleAuthProvider.credential(idToken);
  //     const userCredential = await signInWithCredential(auth, credential);

  //     console.log("User logged in with Google:", userCredential.user.uid);
  //     router.replace("/dashboard");
  //   } catch (error) {
  //     console.error("Google sign-in error:", error);
  //     Alert.alert("Google Sign-In Failed", error.message);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <MaterialIcons name="lock" size={60} color={Colors.blueAccent} />
            <ThemedText type="title" style={styles.title}>
              Welcome Back
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Login to your account
            </ThemedText>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Email</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(text) =>
                  setFormData({ ...formData, email: text })
                }
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Password</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                secureTextEntry
                value={formData.password}
                onChangeText={(text) =>
                  setFormData({ ...formData, password: text })
                }
                editable={!loading}
              />
            </View>

            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.rememberMeContainer}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <MaterialIcons
                  name={rememberMe ? "check-box" : "check-box-outline-blank"}
                  size={24}
                  color={Colors.blueAccent}
                />
                <ThemedText style={styles.rememberMeText}>
                  Remember me
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity style={styles.forgotPassword}>
                <ThemedText style={styles.forgotPasswordText}>
                  Forgot Password?
                </ThemedText>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.loginButton,
                loading && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.loginButtonText}>Login</ThemedText>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <ThemedText style={styles.dividerText}>OR</ThemedText>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign-In Button */}
            {/* <TouchableOpacity
              style={styles.googleButton}
              onPress={() => promptAsync()}
              disabled={loading || !request}
            >
              <MaterialIcons name="g-translate" size={24} color="#fff" />
              <ThemedText style={styles.googleButtonText}>
                Continue with Google
              </ThemedText>
            </TouchableOpacity> */}

            <View style={styles.signupContainer}>
              <ThemedText style={styles.signupText}>
                Don't have an account?{" "}
              </ThemedText>
              <TouchableOpacity onPress={() => router.push("/signup")}>
                <ThemedText style={styles.signupLink}>Sign Up</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
  },
  form: {
    width: "100%",
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
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  rememberMeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rememberMeText: {
    fontSize: 14,
  },
  forgotPassword: {},
  forgotPasswordText: {
    fontSize: 14,
    color: Colors.blueAccent,
  },
  loginButton: {
    backgroundColor: Colors.blueAccent,
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 10,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  signupText: {
    fontSize: 14,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.blueAccent,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e0e0e0",
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 14,
    opacity: 0.5,
  },
  googleButton: {
    backgroundColor: "#DB4437",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  googleButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
