/**
 * Mobile Menu Context — manages sidebar visibility on mobile
 */

"use client";

import React, { createContext, useContext, useState } from "react";

interface MobileMenuContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const MobileMenuContext = createContext<MobileMenuContextType | undefined>(
  undefined,
);

export function MobileMenuProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <MobileMenuContext.Provider
      value={{
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen((prev) => !prev),
      }}>
      {children}
    </MobileMenuContext.Provider>
  );
}

export function useMobileMenu() {
  const context = useContext(MobileMenuContext);
  if (context === undefined) {
    throw new Error("useMobileMenu must be used within MobileMenuProvider");
  }
  return context;
}
