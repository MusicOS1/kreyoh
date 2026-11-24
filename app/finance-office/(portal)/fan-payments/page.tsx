import Link from "next/link";
import {requireControlRoomPermission} from "../../../../lib/controlRoom";
import styles from "../../financeUi.module.css";

const channels=[
 {title:"Fan subscriptions",where:"Fan account / listening experience",description:"A fan subscribes to an approved FACKTS Music plan. No price, recurring charge or subscription access is live."},
 {title:"Support an artist",where:"Public artist profile",description:"A fan chooses an approved one-time contribution. Artist attribution and the agreed share must be recorded before checkout can be enabled."},
 {title:"Support a release",where:"Public song or album page",description:"A fan supports a named public release. Payments will require a fixed purpose and server-verified receipt."},
];
export default async function FanPayments(){
 await requireControlRoomPermission("finance");
 return <main className={styles.root}>
  <header className={styles.head}>
   <div><span className={styles.eyebrow}>FINANCE OFFICE / FAN PAYMENTS</span>
    <h1>Fan payment points</h1>
    <p>Planned fan subscription and artist-support payments for the FACKTS Music platform, separate from studio and project-service invoices and the Third Culture partner engagement.</p></div>
   <div className={styles.pills}><Link href="/finance-office/platform" className={styles.buttonSecondary}>FACKTS business finances</Link><Link href="/finance-office/payments" className={styles.buttonSecondary}>Service payment links</Link></div>
  </header>
  <div className={styles.note} role="status"><strong>Not taking fan payments yet.</strong> No dedicated verified fan-payment ledger or subscriptions are active. Nothing on this page collects money or counts ordinary project-service receipts as fan support.</div>
  <div className={styles.grid4}>
   <article className={styles.stat}><small>Fan payment services</small><strong>0 live</strong><span>Three planned entry points, none enabled</span></article>
   <article className={styles.stat}><small>Fan revenue</small><strong>Not tracked</strong><span>No verified dedicated fan-payment records</span></article>
   <article className={styles.stat}><small>Artist payouts</small><strong>Not enabled</strong><span>Requires agreed splits and verified payee accounts</span></article>
   <article className={styles.stat}><small>Payment links</small><strong>Not issued</strong><span>Fan-specific checkout is not configured</span></article>
  </div>
  <section className={styles.panel}>
   <div className={styles.panelTop}><h2>Where fans would pay</h2><Link href="/fan-support">View public fan experience</Link></div>
   <div className={styles.grid2}>{channels.map(channel=><article className={styles.stat} key={channel.title}>
    <small>{channel.where}</small>
    <strong style={{fontSize:19}}>{channel.title}</strong>
    <p>{channel.description}</p>
    <span className={styles.status}>Coming soon · no charges</span>
   </article>)}</div>
  </section>
  <section className={styles.panel}>
   <h2>What Finance will manage</h2>
   <div className={styles.items}>
    <div className={styles.item}><div><strong>1. Approved prices and purposes</strong><small>No price or donation amount has been assigned by this preview.</small></div><span className={styles.status}>Approval needed</span></div>
    <div className={styles.item}><div><strong>2. Verified Paystack receipts</strong><small>Only successful payments confirmed on the server will enter the fan ledger.</small></div><span className={styles.status}>Not integrated</span></div>
    <div className={styles.item}><div><strong>3. Artist and platform shares</strong><small>Allocate to the correct artist/release after the commercial agreement is recorded.</small></div><span className={styles.status}>Rules needed</span></div>
    <div className={styles.item}><div><strong>4. Refunds, settlement and payouts</strong><small>Keep these separately recorded. A paid checkout is not an artist payout.</small></div><span className={styles.status}>Not integrated</span></div>
   </div>
   <div className={styles.note}>Existing Paystack project invoices are for approved studio/production services only. They cannot safely be reused as subscriptions, fan donations or automatic artist disbursements.</div>
  </section>
 </main>;
}
