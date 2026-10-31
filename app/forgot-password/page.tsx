import Link from "next/link";
import { requestReset } from "./actions";
import { FacktsMusicLogo } from "../../components/Branding";
export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string }> }) {
  const params = await searchParams;
  return <main className="login-page"><section className="login-brand-panel"><FacktsMusicLogo size={54} /><h1>Find your way back to the music.</h1><p>We will send a secure password reset link to your email.</p></section><section className="login-form-panel"><form action={requestReset} className="login-card"><h2>Reset password</h2>{params.error && <div className="form-error-alert" role="alert">{params.error}</div>}{params.sent==="1" && <p role="status">If this email belongs to a FACKTS Music account, a password-reset link has been requested. Check your inbox and spam folder. The link returns to music.facktsafrica.co.ke.</p>}<label>Email Address<input name="email" type="email" required autoComplete="email" /></label><button className="login-submit-btn">Send Reset Link →</button><Link href="/login">← Back to Sign In</Link></form></section></main>;
}
