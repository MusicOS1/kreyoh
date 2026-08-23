"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function PwaRegister() {
  const pathname = usePathname();

  useEffect(() => {
    const adminSurface = pathname.startsWith("/admin");
    const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

    if (manifest) {
      manifest.href = adminSurface
        ? "/admin-manifest.webmanifest"
        : "/manifest.webmanifest";
    }

    if (theme) {
      theme.content = adminSurface ? "#f3ecdf" : "#06101f";
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installation is progressive enhancement; auth and app navigation remain unaffected.
      });
    }
  }, [pathname]);

  return null;
}
