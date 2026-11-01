import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FACKTS Music",
    short_name: "FACKTS Music",
    description: "A FACKTS Africa platform for running and developing music projects.",
    id: "/",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone","minimal-ui"],
    categories: ["music","entertainment"],
    shortcuts: [{name:"Listen",url:"/listen",description:"Public music"},{name:"My music",url:"/fan",description:"Your listening room"},{name:"Workspace",url:"/workspace",description:"Projects and beats"}],
    orientation: "any",
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
