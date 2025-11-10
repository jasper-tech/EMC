import { View } from "react-native";
import React, { useContext } from "react";
import { Colors } from "../constants/Colors";
import { ThemeContext } from "../context/ThemeContext";

const ThemedView = ({ style, ...props }) => {
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;
  return (
    <View
      style={[
        {
          backgroundColor: theme.background,
        },
        style,
      ]}
      {...props}
    />
  );
};

export default ThemedView;
