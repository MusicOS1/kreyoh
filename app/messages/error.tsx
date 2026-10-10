"use client";
export default function MessageError({reset}:{reset:()=>void}){return <main className="community-page"><h1>Messages could not be loaded</h1><p>Please try again in a moment.</p><button onClick={reset}>Try again</button></main>;}
