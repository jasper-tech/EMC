import { StyleSheet, View } from "react-native";
import React, { useContext } from "react";
import { Colors } from "../constants/Colors";
import { ThemeContext } from "../context/ThemeContext";

const ThemedCard = ({ style, ...props }) => {
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;
  return (
    <View
      style={[
        {
          backgroundColor: theme.uiBackground,
        },
        styles.card,

        style,
      ]}
      {...props}
    />
  );
};

export default ThemedCard;
const styles = StyleSheet.create({
  card: {
    borderRadius: 5,
    padding: 20,
  },
});
