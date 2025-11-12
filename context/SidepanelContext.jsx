import React, { createContext, useContext, useState } from "react";

const SidePanelContext = createContext();

export const SidePanelProvider = ({ children }) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const openPanel = () => setIsPanelOpen(true);
  const closePanel = () => setIsPanelOpen(false);
  const togglePanel = () => setIsPanelOpen((prev) => !prev);

  return (
    <SidePanelContext.Provider
      value={{
        isPanelOpen,
        openPanel,
        closePanel,
        togglePanel,
      }}
    >
      {children}
    </SidePanelContext.Provider>
  );
};

export const useSidePanel = () => {
  const context = useContext(SidePanelContext);
  if (!context) {
    throw new Error("useSidePanel must be used within SidePanelProvider");
  }
  return context;
};
