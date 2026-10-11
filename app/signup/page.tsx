import Link from "next/link";
import { FacktsMusicLogo } from "../../components/Branding";
import SignupForm from "../../components/SignupForm";
import LoginAtmosphere from "../../components/LoginAtmosphere";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string; next?: string }> }) {
  const params = await searchParams;
  return <main className="login-page"><LoginAtmosphere />
    <section className="login-brand-panel"><Link href="/" className="login-brand-mark-lockup"><FacktsMusicLogo size={52} /></Link><span className="login-kicker">A FACKTS AFRICA PLATFORM</span><h1>Your music.<br />Your people.<br />Your history.</h1><p>Find your next favourite, follow artists, or build your creative career.</p><span className="login-brand-tagline">Move the music. Run the venture.</span></section>
    <section className="login-form-panel">{params.success ? <div className="login-card signup-success-card"><h2>Account created</h2><p>{params.success}</p><Link href={`/login?next=${encodeURIComponent(params.next||"/home")}`} className="login-submit-btn signup-success-action">Sign In <span aria-hidden="true">→</span></Link></div> : <SignupForm error={params.error} next={params.next} />}<p className="auth-switch">Already have an account? <Link href={`/login?next=${encodeURIComponent(params.next||"/home")}`}>Sign In</Link></p></section>
  </main>;
}
