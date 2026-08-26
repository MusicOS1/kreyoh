import "./globals.css";
import "./v1.css";
import "./polish.css";
import "./kreyoh-ui.css";
import "./responsive.css";
import "./creator-operations.css";
import PwaRegister from "../components/PwaRegister";
import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://music.facktsafrica.co.ke";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "FACKTS Music", template: "%s | FACKTS Music" },
  description: "Run and develop creative music projects in one place.",
  applicationName: "FACKTS Music",
  manifest: "/manifest.webmanifest",

  icons: {
    icon: "/branding/fackts-music-logo.png",
    apple: "/branding/fackts-music-logo.png",
  },
  openGraph: { siteName: "FACKTS Music", type: "website", images: ["/branding/fackts-music-logo.png"] },
  twitter: { card: "summary_large_image", images: ["/branding/fackts-music-logo.png"] },
};

export const viewport = {
  themeColor: "#06101f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}<PwaRegister /></body>
    </html>
  );
}
