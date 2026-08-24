"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function PwaRegister() {
  const pathname = usePathname();

  useEffect(() => {
    const adminSurface = pathname.startsWith("/admin");
    const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

    if (theme) {
      theme.content = adminSurface ? "#f3ecdf" : "#06101f";
    }

    if ("serviceWorker" in navigator && process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((items) => items.forEach((item) => item.unregister()));
      if ("caches" in window) caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
    } else if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installation is progressive enhancement; auth and app navigation remain unaffected.
      });
    }
    const installed=()=>localStorage.setItem("fackts-music-installed","1");
    window.addEventListener("appinstalled",installed);
    return()=>window.removeEventListener("appinstalled",installed);
  }, [pathname]);

  return null;
}
