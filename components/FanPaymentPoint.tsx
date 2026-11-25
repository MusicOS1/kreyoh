import Link from "next/link";
import styles from "./FanPaymentPoint.module.css";
export default function FanPaymentPoint({artistName,kind="artist"}:{
 artistName:string;kind?:"artist"|"release";
}){
 return <section className={styles.point} aria-label="Fan payment and support">
  <div className={styles.heading}><div><span className={styles.label}>FACKTS MUSIC · FAN SUPPORT</span>
    <h2>{kind==="release"?"Support this release":"Support "+artistName}</h2></div>
    <span className={styles.status}>Fan payments coming soon</span>
  </div>
  <p>Fans can already listen, follow, like, comment and share. Paid contributions and subscriptions are being prepared but are not yet available for this {kind==="release"?"release":"artist"}.</p>
  <div className={styles.controls}>
    <span aria-disabled="true" className={styles.disabledAction}>Pay to support · not available yet</span>
    <Link href="/fan-support">How fan payments will work</Link>
  </div>
  <small>No money will be requested on this screen. There is no live fan payment link or artist payout claim.</small>
 </section>;
}
