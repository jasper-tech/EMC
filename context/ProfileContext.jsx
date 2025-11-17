import React, { createContext, useState, useContext, useEffect } from "react";
import { useAuth } from "./AuthContext";

const ProfileContext = createContext();

export const ProfileProvider = ({ children }) => {
  const [profileImage, setProfileImage] = useState(null);
  const { user } = useAuth();

  // Clear profile image when user logs out
  useEffect(() => {
    if (!user) {
      setProfileImage(null);
    }
  }, [user]);

  const updateProfileImage = (image) => {
    setProfileImage(image);
  };

  const clearProfileImage = () => {
    setProfileImage(null);
  };

  return (
    <ProfileContext.Provider
      value={{
        profileImage,
        updateProfileImage,
        clearProfileImage,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export { ProfileContext };

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
};
