import React from "react";
import Link from "next/link";
import { login } from "./actions";
import { KreyohMark, KreyohWordmark } from "../../components/Branding";
import LoginAtmosphere from "../../components/LoginAtmosphere";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
  }>;
}) {
  const params = await searchParams;

  return (
    <main className="login-page">
      <LoginAtmosphere />

      {/* Left Brand Panel */}
      <section className="login-brand-panel">
        <Link href="/" className="login-back-link">← Back to KREYOH</Link>
        <div className="login-brand-mark-lockup">
          <KreyohMark size={44} />
          <KreyohWordmark height={22} className="login-wordmark" />
        </div>

        <span className="login-kicker">
          MUSIC VENTURE OPERATING SYSTEM
        </span>

        <h1>
          Create.
          <br />
          Organise.
          <br />
          Operate.
        </h1>

        <p>
          KREYOH is where creative music projects are organized, coordinated, and turned into real operating ventures. Project 001 is the founding implementation.
        </p>

        <span className="login-brand-tagline">
          Run it on KREYOH.
        </span>
      </section>

      {/* Right Login Form Panel */}
      <section className="login-form-panel">
        <form action={login} className="login-card">
          <div>
            <span className="eyebrow">PROJECT 001 WORKSPACE</span>
            <h2>Welcome to KREYOH</h2>
            <p>Sign in to access your venture workspace.</p>
          </div>

          {params.error && (
            <div className="form-error-alert">
              {params.error}
            </div>
          )}

          <label>
            Email Address
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="contributor@kreyoh.com"
            />
          </label>

          <label>
            Password
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••••••"
            />
          </label>

          <button className="login-submit-btn" type="submit">
            Sign in to KREYOH →
          </button>
<p>
  New to KREYOH?{" "}
  <Link href="/signup">
    Create an account
  </Link>
</p>
          <small>
            Access is restricted to Project 001 verified participants.
          </small>
        </form>
      </section>
    </main>
  );
}
