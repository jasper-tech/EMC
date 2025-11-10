import { Text } from "react-native";
import React, { useContext } from "react";
import { Colors } from "../constants/Colors";
import { ThemeContext } from "../context/ThemeContext";

const ThemedText = ({ style, type = "default", ...props }) => {
  const { scheme } = useContext(ThemeContext);
  const theme = Colors[scheme] ?? Colors.light;

  const getTextColor = () => {
    switch (type) {
      case "title":
        return theme.title;
      case "default":
      default:
        return theme.text;
    }
  };

  return (
    <Text
      style={[
        {
          color: getTextColor(),
        },
        style,
      ]}
      {...props}
    />
  );
};

export default ThemedText;
