import "./globals.css";
import "./v1.css";
import "./polish.css";
import "./kreyoh-ui.css";
import "./responsive.css";

export const metadata = {
  title: "KREYOH",
  description: "Music Venture Operating System",
  applicationName: "KREYOH",
  manifest: "/manifest.webmanifest",

  icons: {
    icon: "/icons/kreyoh-192.png",
    apple: "/icons/kreyoh-192.png",
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
      <body>{children}</body>
    </html>
  );
}