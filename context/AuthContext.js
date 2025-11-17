import React, { createContext, useState, useEffect, useContext } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!mounted) return;

      if (firebaseUser && firebaseUser.emailVerified) {
        setUser(firebaseUser);

        // Save user identity for quick login (without password)
        await AsyncStorage.setItem("userEmail", firebaseUser.email);
        await AsyncStorage.setItem(
          "userName",
          firebaseUser.displayName || firebaseUser.email.split("@")[0]
        );
      } else {
        setUser(null);
        // Clear only password on sign out, keep identity
        await AsyncStorage.removeItem("userPassword");
      }

      if (mounted) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const value = {
    user,
    loading,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
