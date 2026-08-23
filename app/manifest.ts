import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FACKTS Music",
    short_name: "FACKTS Music",
    description: "A FACKTS Africa platform for running and developing music projects.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#06101f",
    theme_color: "#06101f",
    icons: [
      {
        src: "/branding/fackts-music-logo.png",
        sizes: "1250x1250",
        type: "image/png",
      },
      {
        src: "/branding/fackts-music-logo.png",
        sizes: "1250x1250",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
