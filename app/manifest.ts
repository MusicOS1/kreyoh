import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KREYOH",
    short_name: "KREYOH",
    description: "The operating system for a founding music venture.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#06101f",
    theme_color: "#06101f",
    icons: [
      {
        src: "/icons/kreyoh-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/kreyoh-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/kreyoh-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
