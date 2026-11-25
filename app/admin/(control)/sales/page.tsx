import Link from "next/link";
import {createAdminClient} from "../../../../lib/supabase/admin";
import {readAllRows} from "../../../../lib/recordReads";
import {requireControlRoomPermission} from "../../../../lib/controlRoom";
import styles from "../finance/finance.module.css";

const fmt=(value:number|string|null,currency:string)=>currency+" "+Number(value||0).toLocaleString("en-KE",{maximumFractionDigits:2});
export default async function SalesBackOffice(){
 // Sales access never grants financial ledgers, invoice issue or personal administrator rights.
 await requireControlRoomPermission("commercial");
 const admin=createAdminClient();
 const [projectsR,oppsR]=await Promise.all([
  readAllRows(()=>admin.from("projects").select("id,name,code,status").order("name").order("id")),
  readAllRows(()=>admin.from("commercial_opportunities")
   .select("id,project_id,organisation,opportunity_type,estimated_value,negotiated_value,contracted_value,currency,status,next_action,follow_up_date,created_at")
   .order("created_at",{ascending:false}).order("id"))
 ]);
 const unavailable=Boolean(projectsR.error||oppsR.error);
 const projects=new Map((projectsR.data||[]).map((p:any)=>[p.id,p]));
 const opportunities=oppsR.data||[];
 const active=opportunities.filter((o:any)=>!["lost","completed","cancelled"].includes(String(o.status).toLowerCase()));
 return <main className={styles.root}>
  <header className={styles.head}><span className={styles.kicker}>FACKTS MUSIC / CONTROL ROOM / SALES</span>
   <h1>Sales & partnerships</h1>
   <p>One view of commercial opportunities across music projects. Sales staff can see leads and follow-ups here without receiving Finance Back Office, payments or ownership permissions.</p>
   <div className={styles.actions}><Link className={styles.secondary} href="/admin/enquiries">Open enquiries</Link></div>
  </header>
  <div className={styles.callout}>Pipeline figures are potential or contracted values, <strong>not received revenue</strong>. Project and artist earnings stay separate from sales opportunities.</div>
  {unavailable?<div className={styles.empty} role="alert">Sales records are unavailable. Counts and values are withheld until they can be verified.</div>:<>
   <div className={styles.grid}>
    <article className={styles.card}><span className={styles.kicker}>ALL OPPORTUNITIES</span><h3>{opportunities.length}</h3><p>Recorded in project commercial pipelines.</p></article>
    <article className={styles.card}><span className={styles.kicker}>ACTIVE OPPORTUNITIES</span><h3>{active.length}</h3><p>Awaiting a decision, delivery or follow-up.</p></article>
   </div>
   <section className={styles.section}><div className={styles.sectionHead}><div><h2>Opportunities & next actions</h2><p>Each opportunity remains attached to its original project.</p></div></div>
    {!opportunities.length?<div className={styles.empty}>No opportunities recorded yet. Leads can be entered in the existing project opportunity workflow by authorised project members.</div>:
     <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Client / opportunity</th><th>Project</th><th>Status</th><th>Pipeline value</th><th>Next step</th></tr></thead>
      <tbody>{opportunities.map((o:any)=><tr key={o.id}>
        <td><strong>{o.organisation||o.opportunity_type||"Unnamed opportunity"}</strong><small>{o.opportunity_type||"Commercial"}</small></td>
        <td>{projects.get(o.project_id)?.name||"Project not found"}</td>
        <td>{String(o.status||"identified").replaceAll("_"," ")}</td>
        <td>{fmt(o.contracted_value??o.negotiated_value??o.estimated_value,o.currency||"KES")}<small>Not a collected payment</small></td>
        <td>{o.next_action||"Follow up"}<small>{o.follow_up_date||"No date set"}</small></td>
      </tr>)}</tbody>
     </table></div>}
   </section>
  </>}
 </main>;
}
