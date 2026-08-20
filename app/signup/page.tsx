import Link from "next/link";
import { signup } from "./actions";
import {
  KreyohMark,
  KreyohWordmark,
} from "../../components/Branding";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
}) {
  const params = await searchParams;

  return (
    <main className="login-page">
      <div
        className="login-backdrop-atmosphere"
        aria-hidden="true"
      />

      <section className="login-brand-panel">
        <Link
          href="/"
          className="login-brand-mark-lockup"
          style={{
            textDecoration: "none",
          }}
        >
          <KreyohMark size={44} />

          <KreyohWordmark
            height={22}
            className="login-wordmark"
          />
        </Link>

        <span className="login-kicker">
          MUSIC VENTURE OPERATING SYSTEM
        </span>

        <h1>
          Your music.
          <br />
          Your people.
          <br />
          Your venture.
        </h1>

        <p>
          Create your KREYOH account and build your
          professional profile. Project access and
          permissions are assigned separately by
          project administrators.
        </p>

        <span className="login-brand-tagline">
          Run it on KREYOH.
        </span>
      </section>

      <section className="login-form-panel">
        <form
          action={signup}
          className="login-card"
        >
          <div>
            <span className="eyebrow">
              CREATE YOUR ACCOUNT
            </span>

            <h2>Join KREYOH</h2>

            <p>
              Create your profile. Projects come next.
            </p>
          </div>

          {params.error && (
            <div className="form-error-alert">
              {params.error}
            </div>
          )}

          {params.success && (
            <div
              className="form-error-alert"
              style={{
                borderColor:
                  "rgba(34, 197, 94, 0.35)",
              }}
            >
              {params.success}
            </div>
          )}

          {!params.success && (
            <>
              <label>
                Full Name
                <input
                  name="full_name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Your full name"
                />
              </label>

              <label>
                Stage / Professional Name
                <input
                  name="stage_name"
                  type="text"
                  placeholder="Optional"
                />
              </label>

              <label>
                I mainly work as
                <select
                  name="creative_role"
                  defaultValue="Artist"
                  className="dark-select"
                >
                  <option value="Artist">
                    Artist
                  </option>

                  <option value="Producer">
                    Producer
                  </option>

                  <option value="Engineer">
                    Engineer
                  </option>

                  <option value="A&R">
                    A&R / Creative
                  </option>
                </select>

                <small>
                  This describes your profile only.
                  Project permissions are assigned by
                  the project team.
                </small>
              </label>

              <label>
                Email Address
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </label>

              <label>
                Password
                <input
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                />
              </label>

              <label>
                Confirm Password
                <input
                  name="confirm_password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Repeat password"
                />
              </label>

              <button
                className="login-submit-btn"
                type="submit"
              >
                Create KREYOH Account →
              </button>
            </>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              marginTop: "6px",
            }}
          >
            <span>
              Already have an account?{" "}
              <Link href="/login">
                Sign in
              </Link>
            </span>

            <Link href="/">
              ← Back to KREYOH
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}