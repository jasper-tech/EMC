import React, { createContext, useState, useEffect, useContext } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingVerification, setPendingVerification] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Check email verification status
        await firebaseUser.reload(); // Refresh to get latest verification status

        if (firebaseUser.emailVerified) {
          // User is verified - proceed normally
          setUser(firebaseUser);
          setPendingVerification(false);

          // Fetch user profile from Firestore
          try {
            const userDocRef = doc(db, "users", firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
              setUserProfile(userDoc.data());
            } else {
              // If user doesn't exist in Firestore yet, set basic profile
              setUserProfile({
                displayName:
                  firebaseUser.displayName ||
                  firebaseUser.email?.split("@")[0] ||
                  "User",
                email: firebaseUser.email,
                role: "Member", // Default role
              });
            }
          } catch (error) {
            console.error("Error fetching user profile:", error);
            setUserProfile({
              displayName:
                firebaseUser.displayName ||
                firebaseUser.email?.split("@")[0] ||
                "User",
              email: firebaseUser.email,
              role: "Member",
            });
          }
        } else {
          // User is not verified - set pending verification state
          setUser(null);
          setUserProfile(null);
          setPendingVerification(true);
        }
      } else {
        // No user signed in
        setUser(null);
        setUserProfile(null);
        setPendingVerification(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    user,
    userProfile,
    loading,
    pendingVerification,
    setPendingVerification,
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
