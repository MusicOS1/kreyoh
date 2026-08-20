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

  const supabase =
    createBrowserClient(
      process.env
        .NEXT_PUBLIC_SUPABASE_URL!,
      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

  useEffect(() => {
    async function checkSession() {
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
          "Your invitation session could not be found. The invite may have expired. Please ask the Project Lead to resend your invitation."
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

    const {
      error,
    } =
      await supabase.auth
        .updateUser({
          password,
        });

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
      "/workspace";
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
              PROJECT 001
            </span>

            <h2>
              Welcome to KREYOH
            </h2>

            <p>
              Create your password
              to finish joining
              the project.
            </p>
          </div>

          {message && (
            <div className="form-error-alert">
              {message}
            </div>
          )}

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
              >
                Join Project 001 →
              </button>
            </>
          )}
        </form>
      </section>
    </main>
  );
}