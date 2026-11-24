import Link from "next/link";
import PublicNavigation from "../../components/PublicNavigation";
import PublicFooter from "../../components/PublicFooter";
import styles from "./support.module.css";
export const metadata={title:"Fan support | FACKTS Music",description:"Understand how fan support is planned on FACKTS Music. No fan payments are currently accepted."};
export default function FanSupport(){
 return <><PublicNavigation/><main className={styles.page}>
  <header className={styles.hero}><span>FACKTS MUSIC · FAN PAYMENTS</span><h1>Support the music you love</h1>
   <p>Listening, sharing and following are available today. Paid ways to support artists and releases are being prepared.</p>
   <strong>No fan charges are currently enabled.</strong>
  </header>
  <div className={styles.grid}>
   <article><span>01 · THE ARTIST</span><h2>Support an artist</h2><p>Planned: optional one-time support from an artist profile, credited to the correct artist only after verified payment and agreed terms.</p><div>Not accepting payments yet</div></article>
   <article><span>02 · A RELEASE</span><h2>Support a song</h2><p>Planned: one-time support for a specific published release with a clear amount, purpose and receipt.</p><div>Not accepting payments yet</div></article>
   <article><span>03 · THE PLATFORM</span><h2>Fan membership</h2><p>Planned: a fan subscription when its price, benefits, renewal terms and cancellation process have been approved.</p><div>Not accepting subscriptions yet</div></article>
  </div>
  <section className={styles.info}><h2>What happens when payments launch?</h2>
   <p>You will see the exact price and terms <strong>before</strong> checkout. A successful payment will be confirmed by the payment provider and recorded separately from studio-session fees. Artist payments will follow agreed revenue splits and payout controls.</p>
   <p>Until then, no fan wallet, points balance, donations, paid unlocks or automatic artist payouts are being offered.</p>
   <div><Link href="/creators">Discover artists</Link><Link href="/billboard">Listen to releases</Link></div>
  </section>
 </main><PublicFooter/></>;
}
