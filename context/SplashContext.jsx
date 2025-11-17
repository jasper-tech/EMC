import React, { createContext, useState, useContext } from "react";

const SplashContext = createContext();

export const SplashProvider = ({ children }) => {
  const [hasShownSplash, setHasShownSplash] = useState(false);

  const markSplashAsShown = () => {
    setHasShownSplash(true);
  };

  return (
    <SplashContext.Provider
      value={{
        hasShownSplash,
        markSplashAsShown,
      }}
    >
      {children}
    </SplashContext.Provider>
  );
};

export const useSplash = () => {
  const context = useContext(SplashContext);
  if (!context) {
    throw new Error("useSplash must be used within a SplashProvider");
  }
  return context;
};
