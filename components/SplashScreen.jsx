import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { Colors } from "../constants/Colors";
import ThemedView from "./ThemedView";
import ThemedText from "./ThemedText";

const SplashScreen = ({ onSplashComplete }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Set timer for 5 seconds
    const timer = setTimeout(() => {
      onSplashComplete();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.backgroundGraphics}>
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
        <View style={[styles.circle, styles.circle3]} />
      </View>

      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
            },
          ]}
        >
          <ThemedText style={styles.title}>EMC</ThemedText>

          <View style={styles.subtitleContainer}>
            <ThemedText style={styles.subtitle}>...epsu management</ThemedText>
          </View>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <ThemedText style={styles.subtitle}>beta-version</ThemedText>

        <ThemedText style={styles.footerText}>by jasper-tech</ThemedText>
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 60,
  },
  backgroundGraphics: {
    ...StyleSheet.absoluteFillObject,
  },
  circle: {
    position: "absolute",
    borderRadius: 500,
    backgroundColor: `${Colors.blueAccent}08`,
  },
  circle1: {
    width: 300,
    height: 300,
    top: -150,
    right: -100,
  },
  circle2: {
    width: 200,
    height: 200,
    bottom: 100,
    left: -50,
    backgroundColor: `${Colors.blueAccent}05`,
  },
  circle3: {
    width: 150,
    height: 150,
    bottom: -50,
    right: 50,
    backgroundColor: `${Colors.blueAccent}03`,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    alignItems: "center",
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${Colors.blueAccent}15`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    borderWidth: 3,
    borderColor: `${Colors.blueAccent}20`,
  },
  title: {
    fontSize: 72,
    fontWeight: "bold",
    letterSpacing: 4,
    color: Colors.blueAccent,
    marginBottom: 16,
  },
  subtitleContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 20,
    opacity: 0.9,
    letterSpacing: 2,
    marginBottom: 4,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${Colors.blueAccent}15`,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.blueAccent,
  },
  footer: {
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 14,
    opacity: 0.6,
    letterSpacing: 1,
  },
});

export default SplashScreen;
