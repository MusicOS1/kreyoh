"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installation is progressive enhancement; auth and app navigation remain unaffected.
      });
    }
  }, []);

  return null;
}
