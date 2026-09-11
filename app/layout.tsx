import "./globals.css";
import "./v1.css";
import "./polish.css";
import "./kreyoh-ui.css";
import "./responsive.css";
import "./creator-operations.css";
import "./fackts-music-premium.css";
import "./afroplug-v3.css";
import PwaRegister from "../components/PwaRegister";
import GlobalVideoPlayer from "../components/GlobalVideoPlayer";
import WorkspaceChromeEnhancer from "../components/WorkspaceChromeEnhancer";
import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://music.facktsafrica.co.ke";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "FACKTS Music", template: "%s | FACKTS Music" },
  description: "The operating platform around African music creation — creators, projects, sessions, credits and discovery.",
  applicationName: "FACKTS Music",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/branding/fackts-music-logo.png",
    apple: "/branding/fackts-music-logo.png",
  },
  openGraph: {
    siteName: "FACKTS Music",
    type: "website",
    title: "FACKTS Music — Make music. Build the world around it.",
    description: "Creators, projects, sessions, credits and discovery in one living music ecosystem.",
    images: ["/branding/fackts-music-logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/branding/fackts-music-logo.png"],
  },
};

export const viewport = {
  themeColor: "#080809",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="fm-v3-root">
      <body className="fm-v3-body">
        {children}
        <GlobalVideoPlayer />
        <WorkspaceChromeEnhancer />
        <PwaRegister />
      </body>
    </html>
  );
}
