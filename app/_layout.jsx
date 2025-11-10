import { StyleSheet, Text, View } from "react-native";
import React, { useContext } from "react";
import { Stack } from "expo-router";
import { Colors } from "../constants/Colors";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, ThemeContext } from "../context/ThemeContext";

const LayoutContent = () => {
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.navBackground },
          headerShown: false,
          headerTintColor: theme.title,
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerTitle: "",
            headerBackVisible: false,
          }}
        />
        <Stack.Screen
          name="about"
          options={{
            headerTitle: "",
          }}
        />
        <Stack.Screen
          name="reports"
          options={{
            headerTitle: "",
          }}
        />
      </Stack>
    </>
  );
};

const RootLayout = () => {
  return (
    <ThemeProvider>
      <LayoutContent />
    </ThemeProvider>
  );
};

export default RootLayout;

const styles = StyleSheet.create({});
