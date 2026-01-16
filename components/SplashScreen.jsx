import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { Colors } from "../constants/Colors";
import ThemedView from "./ThemedView";
import ThemedText from "./ThemedText";

const SplashScreen = ({ onSplashComplete }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Loading bar animation
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Dot animations for loading
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

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

    // Progress bar animation
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 4500,
      useNativeDriver: false,
    }).start();

    // Animated dots
    const createDotAnimation = (anim, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    createDotAnimation(dot1Anim, 0).start();
    createDotAnimation(dot2Anim, 200).start();
    createDotAnimation(dot3Anim, 400).start();

    // Set timer for 5 seconds
    const timer = setTimeout(() => {
      onSplashComplete();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <ThemedView style={styles.container}>
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

          {/* Modern Loading Indicator */}
          <View style={styles.loadingContainer}>
            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width: progressWidth,
                  },
                ]}
              />
            </View>

            {/* Animated Dots */}
            <View style={styles.dotsContainer}>
              <Animated.View
                style={[
                  styles.dot,
                  {
                    opacity: dot1Anim,
                    transform: [
                      {
                        scale: dot1Anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.3],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.dot,
                  {
                    opacity: dot2Anim,
                    transform: [
                      {
                        scale: dot2Anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.3],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.dot,
                  {
                    opacity: dot3Anim,
                    transform: [
                      {
                        scale: dot3Anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.3],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </View>
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
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    alignItems: "center",
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
    marginBottom: 48,
  },
  subtitle: {
    fontSize: 20,
    opacity: 0.9,
    letterSpacing: 2,
    marginBottom: 4,
  },
  loadingContainer: {
    width: 240,
    alignItems: "center",
    gap: 20,
  },
  progressBarContainer: {
    width: "100%",
    height: 4,
    backgroundColor: `${Colors.blueAccent}20`,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: Colors.blueAccent,
    borderRadius: 2,
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.blueAccent,
  },
  footer: {
    paddingBottom: 20,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    opacity: 0.6,
    letterSpacing: 1,
  },
});

export default SplashScreen;
