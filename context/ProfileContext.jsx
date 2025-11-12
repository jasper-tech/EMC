import React, { createContext, useState, useContext } from "react";

const ProfileContext = createContext();

export const ProfileProvider = ({ children }) => {
  const [profileImage, setProfileImage] = useState(null);

  const updateProfileImage = (image) => {
    setProfileImage(image);
  };

  return (
    <ProfileContext.Provider value={{ profileImage, updateProfileImage }}>
      {children}
    </ProfileContext.Provider>
  );
};

// Export the context itself for direct use
export { ProfileContext };

// Custom hook for easier usage
export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
};
