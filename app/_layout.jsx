import { StyleSheet } from "react-native";
import React, { useContext } from "react";
import { Stack } from "expo-router";
import { Colors } from "../constants/Colors";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider, ThemeContext } from "../context/ThemeContext";
import { AuthProvider } from "../context/AuthContext";
import { SidePanelProvider } from "../context/SidepanelContext";
import { ProfileProvider } from "../context/ProfileContext";
import AppWrapper from "../components/AppWrapper";

const LayoutContent = () => {
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
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
              headerTitle: "",
            }}
          />
          <Stack.Screen
            name="signup"
            options={{
              headerTitle: "Sign Up",
            }}
          />
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
            name="members"
            options={{
              headerTitle: "EPSU Members",
              gestureEnabled: false,
            }}
          />
        </Stack>
      </AppWrapper>
    </>
  );
};

const RootLayout = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <SidePanelProvider>
            <ProfileProvider>
              <LayoutContent />
            </ProfileProvider>
          </SidePanelProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
};

export default RootLayout;

const styles = StyleSheet.create({});
