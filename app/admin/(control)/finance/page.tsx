import Link from "next/link";
import {createAdminClient} from "../../../../lib/supabase/admin";
import {requireControlRoomPermission} from "../../../../lib/controlRoom";
import {readAllRows} from "../../../../lib/recordReads";
import {FINANCE_BOOKS,TUKO_PROJECT_ID,summariseProjects,recordedBookTotals} from "../../../../lib/financeBackoffice";
import styles from "./finance.module.css";

const fmt=(n:number)=>"KES "+n.toLocaleString("en-KE",{maximumFractionDigits:2});
const first=(x:any)=>Array.isArray(x)?x[0]:x;

export default async function FinanceBackOffice(){
 await requireControlRoomPermission("finance");
 const admin=createAdminClient();
 // This is portfolio authority from an explicit platform grant, not a project Artist/Admin role.
 const [projectsR,revenuesR,membersR,expensesR,booksR]=await Promise.all([
   readAllRows(()=>admin.from("projects").select("id,code,name,owner_id,status").order("name").order("id")),
   readAllRows(()=>admin.from("revenue_records").select("id,project_id,amount,currency,payment_status,revenue_source").order("id")),
   readAllRows(()=>admin.from("project_membership_transactions").select("id,project_id,amount,currency,status").order("id")),
   readAllRows(()=>admin.from("project_expenses").select("id,project_id,amount,currency,payment_status").order("id")),
   admin.from("finance_books").select("id,slug,name,description").in("slug",FINANCE_BOOKS.map(book=>book.slug))
 ]);
 const fail=Boolean(projectsR.error||revenuesR.error||membersR.error||expensesR.error);
 const projects=projectsR.data||[];
 const ownerIds=[...new Set(projects.map((p:any)=>p.owner_id).filter(Boolean))] as string[];
 const owners=ownerIds.length?await admin.from("profiles").select("id,full_name,stage_name,email").in("id",ownerIds):{data:[],error:null};
 const ownerById=new Map((owners.data||[]).map((p:any)=>[p.id,p]));
 const totals=fail?new Map():summariseProjects(projects as any[],revenuesR.data||[],membersR.data||[],expensesR.data||[]);
 const books=booksR.error?[]:booksR.data||[];
 const ids=books.map((book:any)=>book.id);
 const entriesR=ids.length?await readAllRows(()=>admin.from("finance_book_entries").select("id,book_id,entry_type,amount_kes,status").in("book_id",ids).order("id")):{data:[],error:booksR.error,count:0};
 const bookTotals=recordedBookTotals(entriesR.data||[]);
 const ready=!booksR.error&&!entriesR.error&&books.length===2;
 return <main className={styles.root}>
  <header className={styles.head}><span className={styles.kicker}>FACKTS MUSIC / CONTROL ROOM / FINANCE</span>
   <h1>Finance Back Office</h1>
   <p>One simple workspace for the finance leader. Platform operations, Third Culture, and independently owned music projects stay in separate accounts. Access requires an explicit Control Room Finance grant from the Super Admin.</p>
   <div className={styles.actions}><Link className={styles.secondary} href="/admin/administrators">Super Admin: assign Finance, Sales or Operations roles</Link></div>
  </header>
  <div className={styles.callout}><strong>Account boundaries:</strong> FACKTS Music is the platform. Third Culture is a separate organisation managing TUKO WATU WENGI. Other projects keep their individual owners and independent project finance records. Figures here are recorded project movements, not bank balances, profit, or artist payouts.</div>
  <section className={styles.section} aria-label="Platform and organisation accounts">
   <div className={styles.sectionHead}><div><h2>Platform & organisation</h2><p>Operating accounts separate from every music project's ledger.</p></div></div>
   <div className={styles.grid}>{FINANCE_BOOKS.map(def=>{
    const book=books.find((b:any)=>b.slug===def.slug);
    const sums=book?bookTotals.get(book.id):null;
    return <article key={def.slug} className={styles.card}>
      <span className={styles.kicker}>{def.slug==="fackts_music_platform"?"PLATFORM":"MANAGED ORGANISATION"}</span>
      <h3>{def.name}</h3><p>{def.caption}. {def.slug==="third_culture"?"TUKO WATU WENGI project accounts remain separately itemised below.":"Not an artist project, royalty pool or merchant settlement account."}</p>
      {ready&&book?<div className={styles.money}><div><span>Recorded money in</span><strong>{fmt(sums?.income||0)}</strong></div><div><span>Recorded money out</span><strong>{fmt(sums?.expense||0)}</strong></div></div>:
      <p role="status">Account ledger awaits the reviewed finance migration. No opening balance or transactions are assumed.</p>}
      <div className={styles.actions}><Link href={"/admin/finance/books/"+def.slug}>{ready?"Open account":"View account setup"}</Link></div>
    </article>;
   })}</div>
  </section>
  <section className={styles.section} aria-label="Individual music project finances">
   <div className={styles.sectionHead}><div><h2>Music project accounts</h2><p>Each project's original financial ledger stays intact. No cross-project sharing or blended balances.</p></div><strong>{fail?"—":projects.length+" accounts"}</strong></div>
   {fail||owners.error?<div className={styles.empty} role="alert">Project finance data is temporarily unavailable. Totals are withheld rather than estimated.</div>:
   <div className={styles.tableWrap}><table className={styles.table}>
    <thead><tr><th>Project</th><th>Financial owner</th><th>Money received (recorded)</th><th>Money spent (recorded)</th><th>Next action</th></tr></thead>
    <tbody>{projects.map((p:any)=>{
      const owner=ownerById.get(p.owner_id);
      const name=p.id===TUKO_PROJECT_ID?"Third Culture":owner?.stage_name||owner?.full_name||owner?.email||"Owner unassigned — review";
      const sums=totals.get(p.id)||{received:0,spent:0};
      return <tr key={p.id}>
       <td><strong>{p.name}</strong><small>{p.code||"Project"} · {p.status}</small></td>
       <td>{name}{p.id===TUKO_PROJECT_ID?<small>Designated finance organisation; original owner field not changed</small>:null}</td>
       <td>{fmt(sums.received)}</td><td>{fmt(sums.spent)}</td>
       <td><Link href={"/admin/finance/projects/"+p.id}>Open finance →</Link></td>
      </tr>;
    })}</tbody>
   </table></div>}
   <p>Paid Paystack invoices are already included in posted revenue records. They are not added again as separate income. Unverified payments, expected revenue, and unconfirmed expenses are excluded from the totals.</p>
  </section>
 </main>;
}
