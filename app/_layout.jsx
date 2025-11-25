import { StyleSheet } from "react-native";
import React, { useContext } from "react";
import { Stack, usePathname } from "expo-router";
import { Colors } from "../constants/Colors";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider, ThemeContext } from "../context/ThemeContext";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { SidePanelProvider } from "../context/SidepanelContext";
import { SplashProvider } from "../context/SplashContext";
import AppWrapper from "../components/AppWrapper";

// Create a separate component that uses hooks
const LayoutContent = () => {
  const { scheme } = useContext(ThemeContext);
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const theme = Colors[scheme] ?? Colors.light;

  // Define routes that should NOT have the AppWrapper (auth screens)
  const authRoutes = ["/", "/login", "/signup", "/verification-required"];
  const isAuthRoute = authRoutes.includes(pathname);

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <GestureHandlerRootView
        style={{ flex: 1, backgroundColor: theme.background }}
      >
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        {/* You can add a loading spinner here if needed */}
      </GestureHandlerRootView>
    );
  }

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      {isAuthRoute ? (
        // Render without AppWrapper for auth routes
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.navBackground },
            headerTintColor: Colors.blueAccent,
            headerTitleStyle: { color: theme.text },
            animation: "fade",
            animationDuration: 200,
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              headerTitle: "",
              headerBackVisible: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="login"
            options={{
              headerTitle: "Login",
            }}
          />

          <Stack.Screen
            name="signup"
            options={{
              headerTitle: "Sign Up",
            }}
          />
          <Stack.Screen
            name="verification-required"
            options={{
              headerTitle: "Verification",
              gestureEnabled: false,
              headerBackVisible: false,
            }}
          />
        </Stack>
      ) : (
        <AppWrapper>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: theme.navBackground },
              headerTintColor: Colors.blueAccent,
              headerTitleStyle: { color: theme.text },
              animation: "fade",
              animationDuration: 200,
            }}
          >
            <Stack.Screen
              name="dashboard"
              options={{
                headerTitle: "",
                headerBackVisible: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="about"
              options={{
                headerTitle: "About",
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="reports"
              options={{
                headerTitle: "Reports",
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="finances"
              options={{
                headerTitle: "Finances",
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="withdrawal"
              options={{
                headerTitle: "Withdrawal",
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="members"
              options={{
                headerTitle: "Union Members",
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="collect-payments"
              options={{
                headerTitle: "Collect Payments",
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="yearly-reports"
              options={{
                headerTitle: "Yearly Reports",
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="track-payments"
              options={{
                headerTitle: "Track Payments",
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="financial-logs"
              options={{
                headerTitle: "Track Financial Logs",
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="forgotpassword"
              options={{
                headerTitle: "Forgot Password",
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="verification-required"
              options={{
                headerTitle: "Verification",
                gestureEnabled: false,
                headerBackVisible: false,
              }}
            />
            <Stack.Screen
              name="generate-reports"
              options={{
                headerTitle: "Generate Reports",
                gestureEnabled: false,
                // headerBackVisible: false,
              }}
            />
          </Stack>
        </AppWrapper>
      )}
    </>
  );
};

const RootLayout = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <SplashProvider>
            <SidePanelProvider>
              {/* <ProfileProvider> */}
              <LayoutContent />
              {/* </ProfileProvider> */}
            </SidePanelProvider>
          </SplashProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
};

export default RootLayout;

const styles = StyleSheet.create({});
