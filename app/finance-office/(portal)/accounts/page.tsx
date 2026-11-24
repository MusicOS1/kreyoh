import Link from "next/link";
import {loadFinanceOfficeData,fmtKES} from "../../../../lib/financeOfficeData";
import styles from "../../financeUi.module.css";
export default async function AccountsPage(){
 const data=await loadFinanceOfficeData();
 return <main className={styles.root}>
  <header className={styles.head}><div><span className={styles.eyebrow}>FINANCE OFFICE / ACCOUNTS</span><h1>Finance accounts</h1>
    <p>Separate books for the FACKTS Music platform, Third Culture and every independent project.</p></div>
   <Link className={styles.buttonSecondary} href="/finance-office">Overview</Link></header>
  <div className={styles.note}>An account here means a <strong>financial ledger</strong>, not a new bank account or payment wallet. No funds are transferred between projects by viewing this page.</div>
  <section className={styles.grid2}>{data.financeBooks.map(def=>{
   const book=data.books.find((b:any)=>b.slug===def.slug);
   const amount=book?data.bookTotals.get(book.id):null;
   return <article className={styles.panel} key={def.slug}>
    <span className={styles.eyebrow}>{def.slug==="fackts_music_platform"?"PLATFORM":"ORGANISATION"}</span>
    <h2>{def.name}</h2><p>{def.caption}</p>
    <div className={styles.stat}><small>{data.bookReady?"Net recorded movement":"Ledger setup"}</small>
     <strong>{data.bookReady?fmtKES((amount?.income||0)-(amount?.expense||0)):"Not activated"}</strong>
     <span>{data.bookReady?"Not a bank balance":"Operating-book migration not yet approved"}</span></div>
    <Link className={styles.button} href={"/finance-office/books/"+def.slug}>Open account</Link>
   </article>;
  })}</section>
  <section className={styles.panel} id="projects"><div className={styles.panelTop}><div><h2>Music project accounts</h2>
    <p>Each artist or project owner retains their own project ledger.</p></div><strong>{data.projects.length} projects</strong></div>
   <div className={styles.tableWrap}><table className={styles.table}>
    <thead><tr><th>Project</th><th>Finance owner / organisation</th><th>Money in</th><th>Money out</th><th>Action</th></tr></thead>
    <tbody>{data.projects.map((p:any)=>{
      const totals=data.totals.get(p.id);
      return <tr key={p.id}><td><strong>{p.name}</strong><small>{p.code}</small></td>
       <td>{p.id===data.TUKO_PROJECT_ID?"Third Culture":data.ownerById.get(p.owner_id)||"Owner to confirm"}</td>
       <td className={styles.moneyIn}>{fmtKES(totals?.received||0)}</td>
       <td className={styles.moneyOut}>{fmtKES(totals?.spent||0)}</td>
       <td><Link href={"/finance-office/projects/"+p.id}>Open ledger →</Link></td>
      </tr>;
    })}</tbody>
   </table></div>
  </section>
 </main>;
}
