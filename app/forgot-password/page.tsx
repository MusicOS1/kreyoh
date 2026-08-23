import Link from "next/link";
import { requestReset } from "./actions";
import { FacktsMusicLogo } from "../../components/Branding";
export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return <main className="login-page"><section className="login-brand-panel"><FacktsMusicLogo size={54} /><h1>Find your way back to the music.</h1><p>We will send a secure password reset link to your email.</p></section><section className="login-form-panel"><form action={requestReset} className="login-card"><h2>Reset password</h2>{params.error && <div className="form-error-alert">{params.error}</div>}<label>Email Address<input name="email" type="email" required autoComplete="email" /></label><button className="login-submit-btn">Send Reset Link →</button><Link href="/login">← Back to Sign In</Link></form></section></main>;
}
