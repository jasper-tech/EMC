import { Platform, StyleSheet } from "react-native";
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

const LayoutContent = () => {
  const { scheme } = useContext(ThemeContext);
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const theme = Colors[scheme] ?? Colors.light;

  //  AppWrapper (auth screens)
  const authRoutes = ["/", "/login", "/signup", "/verification-required"];
  const isAuthRoute = authRoutes.includes(pathname);

  if (authLoading) {
    return (
      <GestureHandlerRootView
        style={{ flex: 1, backgroundColor: theme.background }}
      >
        {Platform.OS !== "web" && (
          <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        )}
      </GestureHandlerRootView>
    );
  }

  return (
    <>
      {Platform.OS !== "web" && (
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      )}

      {isAuthRoute ? (
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
              name="notifications"
              options={{
                headerTitle: "Notifications",
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
              name="studentunion"
              options={{
                headerTitle: "EPSU ",
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="mission"
              options={{
                headerTitle: "Mission Statement",
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="vision"
              options={{
                headerTitle: "Vision Statement",
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="epsuvc"
              options={{
                headerTitle: "EPSU Verse & Theme",
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="anthem"
              options={{
                headerTitle: "EPSU Anthem and Pledge",
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
              }}
            />
            <Stack.Screen
              name="settings"
              options={{
                headerTitle: "Privacy & Settings",
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="reportbug"
              options={{
                headerTitle: "Send a report",
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="viewissues"
              options={{
                headerTitle: "Reported Issues",
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="disclaimer"
              options={{
                headerTitle: "Disclaimer",
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="events"
              options={{
                headerTitle: "Events",
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="birthdays"
              options={{
                headerTitle: "Birthdays",
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="programs"
              options={{
                headerTitle: "Programs",
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="addprogram"
              options={{
                headerTitle: "Add A program",
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="viewprograms"
              options={{
                headerTitle: "Scheduled Programs",
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="memberinfo"
              options={{
                headerTitle: "Your Info",
                gestureEnabled: false,
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
              <LayoutContent />
            </SidePanelProvider>
          </SplashProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
};

export default RootLayout;

const styles = StyleSheet.create({});
