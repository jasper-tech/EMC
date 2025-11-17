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

        await AsyncStorage.setItem("userEmail", firebaseUser.email);
        await AsyncStorage.setItem(
          "userName",
          firebaseUser.displayName || firebaseUser.email.split("@")[0]
        );

        await AsyncStorage.setItem(
          `userName_${firebaseUser.uid}`,
          firebaseUser.displayName || firebaseUser.email.split("@")[0]
        );
      } else {
        setUser(null);
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
