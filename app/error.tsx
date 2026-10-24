"use client";
export default function AppError({reset}:{reset:()=>void}) {
  return <main className="content" role="alert"><h1>We couldn’t load this page.</h1><p>Check your connection and try again. A connection problem does not mean you signed out.</p><button className="login-submit-btn" onClick={reset}>Try again</button></main>;
}
