// A failed network request is not evidence that a session was revoked.
export function isTransientAuthError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const value = error as { name?: string; status?: number; message?: string };
  return value.name === "AuthRetryableFetchError" || (value.status ?? 0) >= 500 ||
    value.status === 429 || value.name === "TypeError" || /fetch failed|network|timeout/i.test(value.message || "");
}
export const authRecoveryHtml = `<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reconnect | FACKTS Music</title><body style="background:#080809;color:#fff;font:18px system-ui;padding:8vh 24px"><main style="max-width:480px;margin:auto"><h1>Let’s reconnect.</h1><p>We couldn’t check your session. This does not mean you signed out.</p><p>Check your connection, then try this page again.</p><button style="font:inherit;min-height:48px;padding:10px 20px" onclick="location.reload()">Try again</button><p><a style="color:#ffad63" href="/">FACKTS Music home</a></p></main></body></html>`;
