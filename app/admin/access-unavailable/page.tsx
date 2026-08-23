import Link from "next/link";

export default function ControlRoomAccessUnavailable() {
  return (
    <main className="control-denied-page">
      <section className="control-denied-card">
        <span>FACKTS MUSIC</span>
        <h1>Access unavailable.</h1>
        <p>This account cannot open this area.</p>
        <Link href="/workspace">Return to workspace</Link>
      </section>
    </main>
  );
}
