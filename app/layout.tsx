import "./globals.css";
import "./v1.css";
import "./polish.css";
import "./kreyoh-ui.css";
import "./responsive.css";
import PwaRegister from "../components/PwaRegister";

export const metadata = {
  title: "FACKTS Music",
  description: "Run and develop creative music projects in one place.",
  applicationName: "FACKTS Music",
  manifest: "/manifest.webmanifest",

  icons: {
    icon: "/branding/fackts-music-logo.png",
    apple: "/branding/fackts-music-logo.png",
  },
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
