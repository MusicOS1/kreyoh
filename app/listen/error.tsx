"use client";
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="community-page"><h1>Your music needs a moment</h1><p>We could not load your library. Please try again.</p><button onClick={reset}>Try again</button></main>;}
