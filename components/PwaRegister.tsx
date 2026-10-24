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

  }, [pathname]);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then(items => items.filter(item => item.active?.scriptURL === new URL("/sw.js", location.href).href).forEach(item => void item.unregister())).catch(() => {});
      if ("caches" in window) caches.keys().then(keys => keys.filter(key => key.startsWith("fackts-music-shell-")).forEach(key => void caches.delete(key))).catch(() => {});
    } else if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", {updateViaCache:"none"}).then(registration => registration.update()).catch(() => {});
    }
    const installed = () => {try {localStorage.setItem("fackts-music-installed", "1");} catch {}};
    window.addEventListener("appinstalled", installed);
    return () => window.removeEventListener("appinstalled", installed);
  }, []);
  return null;
}
