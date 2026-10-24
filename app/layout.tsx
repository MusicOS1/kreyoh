import "./globals.css";
import "./v1.css";
import "./polish.css";
import "./kreyoh-ui.css";
import "./responsive.css";
import "./creator-operations.css";
import "./fackts-music-premium.css";
import "./afroplug-v3.css";
import "./activation-shell-fixes.css";
import "./member-experience.css";
import "./community.css";
import "./release-comments.css";
import "./fan-premium.css";
import "./fan-polish.css";
import "./music-admin-heros.css";
import "./music-ecosystem.css";
import SessionExperience from "../components/SessionExperience";
import ListeningProvider from "../components/ListeningProvider";
import PwaRegister from "../components/PwaRegister";
import GlobalVideoPlayer from "../components/GlobalVideoPlayer";
import type { Metadata } from "next";

const siteUrl=process.env.NEXT_PUBLIC_SITE_URL||"https://music.facktsafrica.co.ke";

export const metadata:Metadata={
  metadataBase:new URL(siteUrl),
  title:{default:"FACKTS Music",template:"%s | FACKTS Music"},
  description:"The operating platform around African music creation — creators, projects, sessions, credits and discovery.",
  applicationName:"FACKTS Music",
  manifest:"/manifest.webmanifest",
  icons:{icon:"/branding/fackts-music-logo.png",apple:"/branding/fackts-music-logo.png"},
  openGraph:{
    siteName:"FACKTS Music",
    type:"website",
    title:"FACKTS Music — Make music. Build the world around it.",
    description:"Creators, projects, sessions, credits and discovery in one living music ecosystem.",
    images:["/branding/fackts-music-logo.png"],
  },
  twitter:{card:"summary_large_image",images:["/branding/fackts-music-logo.png"]},
};

export const viewport={themeColor:"#080809",width:"device-width",initialScale:1,viewportFit:"cover"};

export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){
  return<html lang="en" data-scroll-behavior="smooth" className="fm-v3-root">
    <body className="fm-v3-body">
      {process.env.NODE_ENV==='development'&&process.env.LOCAL_DEMO_DATA==='true'&&<aside style={{padding:'8px 16px',background:'#302719',color:'#d9bc8a',font:'12px system-ui',textAlign:'center'}} role="status">Local demo · synthetic records · no production data</aside>}
      <SessionExperience><ListeningProvider>{children}</ListeningProvider></SessionExperience>
      <GlobalVideoPlayer/>
      <PwaRegister/>
    </body>
  </html>;
}
