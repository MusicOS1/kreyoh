import Link from "next/link";
import styles from "./FinanceJourneyPanel.module.css";

export default function FinanceJourneyPanel({projectName,isProjectAdmin}:{
  projectName:string;isProjectAdmin:boolean;
}){
 return <section className={styles.root} aria-label="Finance, earnings and payments">
   <div className={styles.heading}>
     <span className={styles.eyebrow}>MUSIC, SUPPORT & MONEY</span>
     <h2>Where your money stands</h2>
     <p>This is the finance record for <strong>{projectName}</strong>. Project collections, membership dues and expenses are not automatically the artist's earnings.</p>
   </div>
   <div className={styles.items}>
     <article><strong>Project finances</strong><p>Existing verified income, expenses and member contributions appear in this project's financial report.</p><Link href="/finance?view=summary">Open simple tracker</Link></article>
     <article><strong>Artist earnings & payouts</strong><p><b>Not tracked yet.</b> There is no verified artist allocation, fee breakdown or payout ledger. No amount is being labelled payable to you.</p><Link href="/splits">Review recorded split proposals</Link></article>
     <article><strong>Payment links</strong><p>{isProjectAdmin?"You can issue one-time payment requests for authorised project services. Amounts are verified by Paystack.":"A Project Lead or project administrator issues payment links. Ask them to create a request for an approved service; you cannot set an arbitrary live charge."}</p><Link href="/payments">{isProjectAdmin?"Create or review a payment link":"How to request a payment link"}</Link></article>
     <article><strong>Release & fan support</strong><p>Publish through approval, then fans can discover, listen, follow, like, comment and share. Paid fan support is not activated.</p><Link href="/billboard/submit">Manage releases & support</Link></article>
   </div>
 </section>;
}
