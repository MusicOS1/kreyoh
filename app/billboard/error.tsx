"use client";
export default function BillboardError({reset}:{reset:()=>void}){return <main className="community-page"><h1>Music is temporarily unavailable</h1><p>We could not load this page. Please try again.</p><button onClick={reset}>Try again</button><p><a href="/billboard">Back to Billboard</a></p></main>;}
