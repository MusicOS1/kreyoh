import Link from "next/link";
import {loadFinanceOfficeData,fmtKES} from "../../../../../lib/financeOfficeData";
import {getThirdCultureMemberFinance} from "../../../../../lib/thirdCultureFinance";
import styles from "../../../financeUi.module.css";
export const metadata={title:"Third Culture Partner Finance | FACKTS Music"};
export default async function ThirdCulturePartnerFinance(){
 const [data,memberData]=await Promise.all([loadFinanceOfficeData(),getThirdCultureMemberFinance()]);
 const linked=data.projects.find((p:any)=>p.id===data.TUKO_PROJECT_ID);
 const movement=linked?data.totals.get(linked.id):null;
 const cultureBook=data.books.find((b:any)=>b.slug==="third_culture");
 const cultureTotals=cultureBook?data.bookTotals.get(cultureBook.id):null;
 const partnerLedgerReady=Boolean(cultureBook&&data.bookDataAvailable);
 return <main className={styles.root}>
  <header className={styles.head}><div><span className={styles.eyebrow}>PARTNER WORK / SEPARATE ENGAGEMENT</span>
   <h1>Third Culture</h1><p>External partner engagement managed during TUKO WATU WENGI. Not a FACKTS Music subsidiary, an owned artist roster or the ongoing FACKTS Music business.</p></div>
   <div className={styles.pills}><Link className={styles.button} href="/finance-office/reports/detail">Reports</Link><Link className={styles.buttonSecondary} href="/finance-office/platform">FACKTS business finance</Link></div>
  </header>
  <div className={styles.note}><strong>Temporary collaboration.</strong> The free Third Culture arrangement will end as agreed, with no automatic renewal or new project. FACKTS Music will continue operating with its own team and artists and may support other artists commercially. Historical Third Culture records stay separate for accountability.</div>
  <div className={styles.grid4}>
   <article className={styles.stat}><small>TUKO project money received</small><strong>{linked?fmtKES(movement?.received||0):"Not linked"}</strong><span>Project-book receipts, not FACKTS Music revenue</span></article>
   <article className={styles.stat}><small>TUKO project expenses</small><strong>{linked?fmtKES(movement?.spent||0):"Not linked"}</strong><span>Project-book spending, separate from FACKTS costs</span></article>
   <article className={styles.stat}><small>Third Culture members</small><strong>{memberData.members.length}</strong><span>Partner project memberships only</span></article>
   <article className={styles.stat}><small>Third Culture operating book</small><strong>{partnerLedgerReady?fmtKES((cultureTotals?.income||0)-(cultureTotals?.expense||0)):"Setup pending"}</strong><span>Independent partner book, not a FACKTS wallet</span></article>
  </div>
  <section className={styles.panel}>
   <div className={styles.panelTop}><h2>Partner account and linked project</h2><Link href="/finance-office/accounts">All accounts</Link></div>
   <div className={styles.items}>
    <Link href="/finance-office/books/third_culture" className={styles.item}><div><strong>Third Culture operating account</strong><small>Separate partner bookkeeping · {partnerLedgerReady?"Open records":"Ledger setup not approved"}</small></div><b>Open</b></Link>
    {linked?<Link href={"/finance-office/projects/"+linked.id} className={styles.item}><div><strong>{linked.name}</strong><small>Third Culture-managed production project · original creative ownership unchanged</small></div><b>Project records</b></Link>:<p>Linked project is unavailable. No alternative project is assumed.</p>}
    <Link href="/finance-office/members" className={styles.item}><div><strong>Third Culture member ledgers</strong><small>{memberData.accountCount} of {memberData.members.length} active members have existing finance records</small></div><b>Members</b></Link>
   </div>
  </section>
  <section className={styles.panel}><h2>When the partnership finishes</h2>
   <p>Close off the project accounts using verified records and the agreed partnership terms. Keep receipts and reports available for review. Do not automatically move Third Culture members, collections, royalties or ownership into the FACKTS Music business.</p>
   <div className={styles.quick}><Link href="/finance-office/reports/detail">Full transaction report</Link><Link href="/finance-office/platform">Permanent FACKTS finances</Link></div>
  </section>
 </main>;
}
