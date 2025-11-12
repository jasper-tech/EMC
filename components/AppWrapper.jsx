import React from "react";
import { View, StyleSheet } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import SidePanel from "./SidePanel";
import { useSidePanel } from "../context/SidepanelContext";
import { useAuth } from "../context/AuthContext";

const AppWrapper = ({ children }) => {
  const { isPanelOpen, openPanel, closePanel } = useSidePanel();
  const { user, userProfile } = useAuth();

  // Swipe gesture to open panel from left edge
  const swipeGesture = Gesture.Pan()
    .onEnd((event) => {
      // Only trigger if swiping from left edge (first 50px)
      // and swipe distance is > 100px
      if (event.translationX > 100 && event.velocityX > 0) {
        openPanel();
      }
    })
    .runOnJS(true);

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={styles.container}>
        {children}

        {/* Global Side Panel */}
        <SidePanel
          userName={
            userProfile?.fullName || user?.email?.split("@")[0] || "User"
          }
          userRole={userProfile?.role || "Member"}
          userAvatar={userProfile?.photoURL}
          isOpen={isPanelOpen}
          onClose={closePanel}
        />
      </View>
    </GestureDetector>
  );
};

export default AppWrapper;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
