"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js", { scope: "/", updateViaCache: "none" })
          .then((registration) => {
            console.log("PWA ServiceWorker registered with scope:", registration.scope);
          })
          .catch((error) => {
            console.error("PWA ServiceWorker registration failed:", error);
          });
      });
    }
  }, []);

  return null;
}
