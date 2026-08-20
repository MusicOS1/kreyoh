import React from "react";
import { login } from "./actions";
import { KreyohMark, KreyohWordmark } from "../../components/Branding";

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
      {/* Background Atmosphere for Login */}
      <div className="login-backdrop-atmosphere" aria-hidden="true" />

      {/* Left Brand Panel */}
      <section className="login-brand-panel">
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

          <small>
            Access is restricted to Project 001 verified participants.
          </small>
        </form>
      </section>
    </main>
  );
}