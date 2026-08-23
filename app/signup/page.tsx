import Link from "next/link";
import { FacktsMusicLogo } from "../../components/Branding";
import SignupForm from "../../components/SignupForm";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  return <main className="login-page">
    <section className="login-brand-panel"><Link href="/" className="login-brand-mark-lockup"><FacktsMusicLogo size={52} /></Link><span className="login-kicker">A FACKTS AFRICA PLATFORM</span><h1>Your music.<br />Your people.<br />Your history.</h1><p>Create a reusable creator identity and join the projects where your work is happening.</p><span className="login-brand-tagline">Move the music. Run the venture.</span></section>
    <section className="login-form-panel">{params.success ? <div className="login-card signup-success-card"><h2>Account created</h2><p>{params.success}</p><Link href="/login" className="login-submit-btn signup-success-action">Sign In <span aria-hidden="true">→</span></Link></div> : <SignupForm error={params.error} />}<p className="auth-switch">Already have an account? <Link href="/login">Sign In</Link></p></section>
  </main>;
}
