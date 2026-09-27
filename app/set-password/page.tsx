"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  createBrowserClient,
} from "@supabase/ssr";

export default function SetPasswordPage() {
  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    ready,
    setReady,
  ] = useState(false);

  const [supabase] = useState(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    return url && key ? createBrowserClient(url, key) : null;
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function checkSession() {
      if (!supabase) { setMessage("Account access is temporarily unavailable. Please contact support."); return; }
      /*
       * Supabase invite links establish an
       * authenticated session when accepted.
       */
      const {
        data,
      } =
        await supabase.auth
          .getSession();

      if (
        !data.session
      ) {
        setMessage(
          "This link has expired or could not be verified. Request a new password reset link."
        );

        return;
      }

      setReady(true);
    }

    checkSession();
  }, []);

  async function submit(
    event: FormEvent
  ) {
    event.preventDefault();

    setMessage("");
    if (!supabase || saving) return;

    if (
      password.length < 8
    ) {
      setMessage(
        "Password must contain at least 8 characters."
      );

      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setMessage(
        "Passwords do not match."
      );

      return;
    }

    setSaving(true);
    const {
      error,
    } =
      await supabase.auth
        .updateUser({
          password,
        });

    setSaving(false);
    if (error) {
      setMessage(
        error.message
      );

      return;
    }

    /*
     * The account is now ready.
     */
    window.location.href =
      "/home";
  }

  return (
    <main className="login-page">
      <div
        className="login-backdrop-atmosphere"
        aria-hidden="true"
      />

      <section className="login-form-panel">
        <form
          className="login-card"
          onSubmit={submit}
        >
          <div>
            <span className="eyebrow">
              ACCOUNT ACCESS
            </span>

            <h2>
              Welcome to FACKTS Music
            </h2>

            <p>
              Set a new password for your FACKTS Music account.
            </p>
          </div>

          {message && (
            <div className="form-error-alert">
              {message}
            </div>
          )}

          {!ready && message && <a href="/forgot-password">Request a new link →</a>}
          {ready && (
            <>
              <label>
                New Password
                <input
                  type="password"
                  required
                  minLength={8}
                  value={
                    password
                  }
                  onChange={(
                    event
                  ) =>
                    setPassword(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
              </label>

              <label>
                Confirm Password
                <input
                  type="password"
                  required
                  minLength={8}
                  value={
                    confirmPassword
                  }
                  onChange={(
                    event
                  ) =>
                    setConfirmPassword(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                />
              </label>

              <button
                className="login-submit-btn"
                type="submit"
                disabled={saving}
              >
                {saving ? "Saving…" : "Save password →"}
              </button>
            </>
          )}
        </form>
      </section>
    </main>
  );
}
