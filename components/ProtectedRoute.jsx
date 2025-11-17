// components/ProtectedRoute.js
import { useAuth } from "../context/AuthContext";
import { router, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Colors } from "../constants/Colors";

export function ProtectedRoute({ children }) {
  const { user, userProfile, loading, pendingVerification } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup =
      segments[0] === "(auth)" ||
      segments[0] === "login" ||
      segments[0] === "signup" ||
      segments[0] === "verification-required";

    // Define which routes are public (don't require authentication)
    const publicRoutes = ["index", "login", "signup", "verification-required"];
    const isPublicRoute = publicRoutes.includes(segments[0]);

    if (!user && !isPublicRoute) {
      // Redirect to login if not authenticated and trying to access protected route
      console.log("No user, redirecting to index");
      router.replace("/");
    } else if (
      user &&
      pendingVerification &&
      segments[0] !== "verification-required"
    ) {
      // Redirect to verification if not verified
      console.log("User not verified, redirecting to verification");
      router.replace("/verification-required");
    } else if (user && !pendingVerification && isPublicRoute) {
      // Redirect to dashboard if authenticated and trying to access auth routes
      console.log("User authenticated, redirecting to dashboard");
      router.replace("/dashboard");
    }
  }, [user, loading, pendingVerification, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={Colors.blueAccent} />
      </View>
    );
  }

  return children;
}
