import Link from "next/link";
import { login } from "./actions";
import { FacktsMusicLogo } from "../../components/Branding";
import LoginAtmosphere from "../../components/LoginAtmosphere";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  return <main className="login-page"><LoginAtmosphere />
    <section className="login-brand-panel"><Link href="/" className="login-back-link">← Back to FACKTS Music</Link><div className="login-brand-mark-lockup"><FacktsMusicLogo size={54} /></div><span className="login-kicker">PROJECT OPERATING ROOM</span><h1>Create.<br />Develop.<br />Move.</h1><p>One shared place for the people, sound, sessions and decisions behind the music.</p><span className="login-brand-tagline">A FACKTS Africa platform.</span></section>
    <section className="login-form-panel"><form action={login} className="login-card"><div><span className="eyebrow">WELCOME BACK</span><h2>Sign in to FACKTS Music</h2><p>Continue to your role-aware workspace.</p></div>{params.error && <div className="form-error-alert">{params.error}</div>}{params.message && <div className="form-success-alert">{params.message}</div>}<label>Email Address<input name="email" type="email" required autoComplete="email" placeholder="you@example.com" /></label><label>Password<input name="password" type="password" required autoComplete="current-password" placeholder="••••••••••••" /></label><div className="auth-inline-links"><Link href="/forgot-password">Forgot password?</Link></div><button className="login-submit-btn" type="submit">Sign In →</button><p>New here? <Link href="/signup">Create Account</Link></p></form></section>
  </main>;
}
