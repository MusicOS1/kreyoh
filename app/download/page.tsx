import type { Metadata } from "next";
import Link from "next/link";
import PublicNavigation from "../../components/PublicNavigation";
import PublicFooter from "../../components/PublicFooter";
import InstallAppButton from "../../components/InstallAppButton";

export const metadata: Metadata = {
  title: "Get FACKTS Music",
  description: "Install FACKTS Music on your device. Android APK downloads appear here after release testing.",
};

function releasedAndroidApk() {
  const raw = process.env.ANDROID_APK_DOWNLOAD_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const githubRelease = url.hostname === "github.com" &&
      url.pathname.startsWith("/MusicOS1/kreyoh/releases/download/");
    const officialDomain = url.hostname === "music.facktsafrica.co.ke";
    return url.protocol === "https:" &&
      (githubRelease || officialDomain) &&
      url.pathname.toLowerCase().endsWith(".apk") ? url.toString() : null;
  } catch {
    return null;
  }
}

export default function DownloadFacktsMusic() {
  const apk = releasedAndroidApk();
  return (
    <main className="public-site fm-download-page">
      <PublicNavigation />
      <section className="fm-download-content">
        <div className="fm-download-heading">
          <span className="fm-download-eyebrow">FACKTS MUSIC / YOUR DEVICE</span>
          <h1>Your music. <em>One tap away.</em></h1>
          <p>Keep the FACKTS Music you already know: listening, projects, conversations and your account. Choose the available installation method for your device.</p>
        </div>
        <div className="fm-download-grid">
          <article className="fm-download-card fm-download-primary">
            <span className="fm-download-eyebrow">ANDROID</span>
            <h2>Get FACKTS Music for Android</h2>
            <p>{apk ? "Download the tested Android APK." : "The Android APK is being prepared and tested. No unfinished installer is offered here."}</p>
            {apk ? <a className="fm-download-action" href={apk} rel="noopener noreferrer">Download Android APK</a> :
              <span className="fm-download-not-ready">APK download coming after device testing</span>}
            <small>App updates may be required when the Android package changes. Website features can update without reinstalling.</small>
          </article>
          <article className="fm-download-card">
            <span className="fm-download-eyebrow">INSTALL FROM BROWSER</span>
            <h2>Use FACKTS Music now</h2>
            <p>Install the existing web experience on supported Android phones, iPhones and computers. No APK needed for this option.</p>
            <InstallAppButton />
            <small>iPhone: open in Safari, then Share → Add to Home Screen. Desktop: use your browser’s install option where available.</small>
          </article>
        </div>
        <p className="fm-download-support">Need help installing? <Link href="/contact">Contact FACKTS Music support</Link>.</p>
      </section>
      <PublicFooter />
      <style>{`
        .fm-download-page{min-height:100vh;background:#0b0b0b;color:#fff}
        .fm-download-content{max-width:1040px;margin:auto;padding:clamp(44px,7vw,96px) 20px 96px}
        .fm-download-heading{max-width:700px;margin-bottom:38px}
        .fm-download-eyebrow{display:block;color:#ff8c3a;font-weight:700;font-size:11px;letter-spacing:.13em;text-transform:uppercase}
        .fm-download-heading h1{font-size:clamp(38px,5vw,66px);letter-spacing:-.05em;line-height:1.1;margin:16px 0}
        .fm-download-heading h1 em{font-style:normal;color:#ff6a00}
        .fm-download-heading p,.fm-download-card p{color:#b9b9bc;line-height:1.7}
        .fm-download-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}
        .fm-download-card{background:#121212;border:1px solid #313131;border-radius:18px;padding:clamp(22px,3vw,36px);display:flex;flex-direction:column;align-items:flex-start;gap:12px}
        .fm-download-primary{border-color:#80401b}
        .fm-download-card h2{font-size:clamp(22px,2.5vw,29px);letter-spacing:-.035em;margin:0}
        .fm-download-card p{margin:0}
        .fm-download-card small{margin-top:auto;color:#a1a1aa;line-height:1.6}
        .fm-download-action{display:inline-block;background:#ff6a00;color:#0b0b0b!important;padding:12px 18px;text-decoration:none;border-radius:10px;font-weight:750}
        .fm-download-not-ready{border:1px solid #494949;border-radius:10px;padding:12px 14px;color:#d0d0d0;font-size:13px}
        .fm-download-support{margin-top:28px;color:#aaa}
        .fm-download-support a{color:#ff934d}
        .fm-download-page .public-install-wrap{max-width:100%}
        @keyframes fmDownloadEnter{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .fm-download-heading{animation:fmDownloadEnter .42s ease-out both}
        .fm-download-card{animation:fmDownloadEnter .48s ease-out both}
        .fm-download-card:nth-child(2){animation-delay:.1s}
        @media(prefers-reduced-motion:reduce){.fm-download-heading,.fm-download-card{animation:none}}
        @media(max-width:680px){.fm-download-grid{grid-template-columns:1fr}.fm-download-content{padding-top:40px}.fm-download-card{min-height:0}}
      `}</style>
    </main>
  );
}
