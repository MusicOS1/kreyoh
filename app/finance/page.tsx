import AppShell from "../../components/AppShell";
import {getWorkspace} from "../../lib/workspace";
import {creatorDisplayName} from "../../lib/profileIdentity";
import {addProjectExpense,addRevenueRecord,recordMembershipFee,saveMembershipPledge,saveProjectBudget} from "./actions";
const first=(v:any)=>Array.isArray(v)?v[0]:v;
const isMembershipRevenue=(item:any)=>{
 const source=String(item.revenue_source||"").toLowerCase();
 return ["membership","member fee","member fees","membership fee","membership fees","contribution","contributions","member contribution","member contributions"].some(term=>source.includes(term));
};

export default async function FinancePage(){
 const{admin,project,membership}=await getWorkspace();
 if(!project||!membership)return <AppShell><div className="content empty-state"><h2>Project access required</h2></div></AppShell>;
 const[budgetResult,expensesResult,revenueResult,tracksResult,oppsResult,feesResult,membersResult,pledgeResult]=await Promise.all([
  admin.from("project_budgets").select("*").eq("project_id",project.id).maybeSingle(),
  admin.from("project_expenses").select("*,tracks(working_title)").eq("project_id",project.id).order("expense_date",{ascending:false}).limit(50),
  admin.from("revenue_records").select("*,tracks(working_title)").eq("project_id",project.id).order("created_at",{ascending:false}).limit(50),
  admin.from("tracks").select("id,working_title").eq("project_id",project.id).order("working_title"),
  admin.from("commercial_opportunities").select("id,organisation,opportunity_type").eq("project_id",project.id).order("created_at",{ascending:false}),
  admin.from("project_membership_fees").select("*,profiles!project_membership_fees_member_user_id_fkey(full_name,stage_name,nickname)").eq("project_id",project.id).order("created_at",{ascending:false}).limit(100),
  admin.from("project_members").select("user_id,profiles(full_name,stage_name,nickname)").eq("project_id",project.id).eq("status","active").order("joined_at",{ascending:true}),
  admin.from("project_membership_pledges").select("*").eq("project_id",project.id).maybeSingle(),
 ]);
 const budget=budgetResult.data,expenses=expensesResult.data||[],revenue=revenueResult.data||[],tracks=tracksResult.data||[],opportunities=oppsResult.data||[],fees=feesResult.data||[],members=membersResult.data||[],pledge=pledgeResult.data;
 const budgetAmount=Number(budget?.budget_amount||0),currency=pledge?.currency||budget?.currency||"KES";
 const paid=expenses.filter((x:any)=>x.payment_status==="paid"&&x.currency===currency).reduce((s:number,x:any)=>s+Number(x.amount||0),0);
 const committed=expenses.filter((x:any)=>x.payment_status==="committed"&&x.currency===currency).reduce((s:number,x:any)=>s+Number(x.amount||0),0);

 const legacyMembershipRevenue=revenue.filter((x:any)=>x.currency===currency&&x.payment_status!=="cancelled"&&isMembershipRevenue(x));
 const legacyMembershipPledge=legacyMembershipRevenue.reduce((s:number,x:any)=>s+Number(x.amount||0),0);
 const membershipPledged=pledge?Number(pledge.pledged_amount||0):legacyMembershipPledge;

 const allocatedToMembers=fees.filter((x:any)=>x.currency===currency&&x.payment_status!=="waived").reduce((s:number,x:any)=>s+Number(x.amount_due||0),0);
 const membershipPaid=fees.filter((x:any)=>x.currency===currency).reduce((s:number,x:any)=>s+Number(x.amount_paid||0),0);
 const membershipOutstanding=Math.max(0,membershipPledged-membershipPaid);
 const unallocatedPledge=Math.max(0,membershipPledged-allocatedToMembers);

 const commercialRevenue=revenue.filter((x:any)=>!isMembershipRevenue(x));
 const commercialExpected=commercialRevenue.filter((x:any)=>x.currency===currency&&x.payment_status!=="cancelled").reduce((s:number,x:any)=>s+Number(x.amount||0),0);
 const commercialReceived=commercialRevenue.filter((x:any)=>x.payment_status==="paid"&&x.currency===currency).reduce((s:number,x:any)=>s+Number(x.amount||0),0);
 const feeMembers=new Set(fees.map((x:any)=>x.member_user_id)).size,totalExpectedIncome=membershipPledged+commercialExpected,totalIncomeReceived=membershipPaid+commercialReceived;

 return <AppShell><style>{`
 .membership-fee-summary{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:14px 0}
 .membership-fee-summary article{padding:15px;border:1px solid rgba(255,255,255,.075);border-radius:14px;background:rgba(255,255,255,.025)}
 .membership-fee-summary span{display:block;color:rgba(255,255,255,.42);font-size:9px;font-weight:850;letter-spacing:.07em;text-transform:uppercase}
 .membership-fee-summary strong{display:block;margin-top:7px;font-size:18px}
 @media(max-width:1100px){.membership-fee-summary{grid-template-columns:repeat(3,minmax(0,1fr))}}
 @media(max-width:700px){.membership-fee-summary{grid-template-columns:1fr}}
 `}</style><div className="content operations-page">
  <div className="heading"><div><span className="eyebrow">{project.code} / ECONOMICS</span><h1>Project Finance</h1><p>Project economics: budget, spend, commercial revenue and the membership fees supporting participation, studio access and the wider venture.</p></div></div>

  <section className="finance-metrics">{[
   ["Project Budget",budgetAmount],["Actual Spend",paid],["Committed Spend",committed],["Membership Pledged",membershipPledged],["Membership Paid",membershipPaid],["Membership Outstanding",membershipOutstanding],["Commercial Expected",commercialExpected],["Commercial Received",commercialReceived],["Total Income Received",totalIncomeReceived]
  ].map(([label,value])=><article key={String(label)}><span>{label}</span><strong>{currency} {Number(value).toLocaleString("en-KE")}</strong></article>)}</section>

  <section className="membership-fee-summary">
   <article><span>Membership pledged</span><strong>{currency} {membershipPledged.toLocaleString("en-KE")}</strong></article>
   <article><span>Allocated internally</span><strong>{currency} {allocatedToMembers.toLocaleString("en-KE")}</strong></article>
   <article><span>Still to allocate</span><strong>{currency} {unallocatedPledge.toLocaleString("en-KE")}</strong></article>
   <article><span>Actually paid</span><strong>{currency} {membershipPaid.toLocaleString("en-KE")}</strong></article>
   <article><span>Outstanding</span><strong>{currency} {membershipOutstanding.toLocaleString("en-KE")}</strong></article>
  </section>

  <details className="beat-intake-disclosure" open><summary className="beat-intake-summary"><span>MEMBERSHIP PLEDGE</span><strong>Set total project membership pledge</strong><small>This is the overall commitment. Individual member allocations happen below.</small><b>Open +</b></summary>
   <form action={saveMembershipPledge} className="panel operations-form"><input name="pledged_amount" type="number" min="0" step="0.01" defaultValue={membershipPledged} required/><select name="currency" defaultValue={currency}><option>KES</option><option>USD</option></select><textarea name="notes" defaultValue={pledge?.notes||""} placeholder="Membership pledge notes"/><button>Save Membership Pledge</button></form>
  </details>

  <div className="platform-home-split">
   <details className="beat-intake-disclosure" open><summary className="beat-intake-summary"><span>BUDGET CONTROL</span><strong>Budget & expense</strong><b>Open +</b></summary>
    <form action={saveProjectBudget} className="panel operations-form"><input name="budget_amount" type="number" min="0" step="0.01" defaultValue={budgetAmount}/><select name="currency" defaultValue={currency}><option>KES</option><option>USD</option><option>EUR</option></select><button>Save budget</button></form>
    <form action={addProjectExpense} className="panel operations-form"><input name="amount" type="number" min="0.01" step="0.01" placeholder="Expense amount" required/><select name="currency" defaultValue={currency}><option>KES</option><option>USD</option></select><input name="category" required placeholder="Category"/><input name="vendor" placeholder="Vendor / person"/><input name="expense_date" type="date"/><select name="payment_status" defaultValue="committed"><option value="committed">Committed</option><option value="paid">Paid</option><option value="cancelled">Cancelled</option></select><select name="track_id" defaultValue=""><option value="">Project-wide</option>{tracks.map((t:any)=><option key={t.id} value={t.id}>{t.working_title}</option>)}</select><textarea name="notes" placeholder="Notes"/><button>Add expense</button></form>
   </details>

   <details className="beat-intake-disclosure" open><summary className="beat-intake-summary"><span>MEMBER ALLOCATION</span><strong>Allocate & collect membership</strong><small>Internal collection process under the project pledge.</small><b>Open +</b></summary>
    <form action={recordMembershipFee} className="panel operations-form">
     <select name="member_user_id" defaultValue="" required><option value="" disabled>Choose project member</option>{members.map((m:any)=>{const p=first(m.profiles);return <option key={m.user_id} value={m.user_id}>{creatorDisplayName(p)}</option>})}</select>
     <input name="fee_period" required placeholder="Fee period, e.g. August 2026"/><input name="amount_due" type="number" min="0" step="0.01" required placeholder="Amount allocated to member"/><input name="amount_paid" type="number" min="0" step="0.01" defaultValue="0" placeholder="Amount paid"/>
     <select name="currency" defaultValue={currency}><option>KES</option><option>USD</option></select>
     <select name="payment_status" defaultValue="expected"><option value="expected">Expected</option><option value="partially_paid">Partially Paid</option><option value="paid">Paid</option><option value="overdue">Overdue</option><option value="waived">Waived</option></select>
     <input name="due_date" type="date"/><input name="paid_date" type="date"/><input name="payment_reference" placeholder="Payment reference / M-Pesa code"/><textarea name="notes" placeholder="Internal membership notes"/><button>Save member allocation</button>
    </form>
   </details>
  </div>

  <details className="beat-intake-disclosure"><summary className="beat-intake-summary"><span>COMMERCIAL REVENUE</span><strong>Record non-membership revenue</strong><small>Streaming, sync, radio, TV, brands, live and other income.</small><b>Open +</b></summary>
   <form action={addRevenueRecord} className="panel operations-form"><input name="revenue_source" required placeholder="Revenue source"/><input name="amount" type="number" min="0" step="0.01" required placeholder="Amount"/><select name="currency" defaultValue={currency}><option>KES</option><option>USD</option></select><select name="payment_status" defaultValue="expected"><option value="expected">Expected</option><option value="invoiced">Invoiced</option><option value="partially_paid">Partially Paid</option><option value="paid">Paid</option><option value="overdue">Overdue</option><option value="cancelled">Cancelled</option></select><select name="track_id" defaultValue=""><option value="">Project-wide</option>{tracks.map((t:any)=><option key={t.id} value={t.id}>{t.working_title}</option>)}</select><select name="opportunity_id" defaultValue=""><option value="">No linked opportunity</option>{opportunities.map((o:any)=><option key={o.id} value={o.id}>{o.organisation||o.opportunity_type}</option>)}</select><input name="expected_date" type="date"/><input name="received_date" type="date"/><textarea name="notes" placeholder="Notes"/><button>Add revenue record</button></form>
  </details>

  <section className="platform-home-split">
   <article className="platform-home-section"><h2>Membership allocation ledger</h2><div className="home-list">{!fees.length&&<p>No membership fees recorded.</p>}{fees.map((x:any)=>{const p=first(x.profiles);return <div key={x.id}><time>{x.fee_period}</time><span><strong>{creatorDisplayName(p)} · {x.currency} {Number(x.amount_paid).toLocaleString("en-KE")} / {Number(x.amount_due).toLocaleString("en-KE")}</strong><small>{String(x.payment_status).replaceAll("_"," ")}{x.due_date?` · due ${x.due_date}`:""}{x.payment_reference?` · ${x.payment_reference}`:""}</small></span></div>})}</div></article>
   <article className="platform-home-section"><h2>Commercial revenue ledger</h2><div className="home-list">{!commercialRevenue.length&&<p>No commercial revenue recorded.</p>}{commercialRevenue.map((x:any)=><div key={x.id}><time>{x.received_date||x.expected_date||"Pending"}</time><span><strong>{x.revenue_source} · {x.currency} {Number(x.amount).toLocaleString("en-KE")}</strong><small>{x.payment_status}</small></span></div>)}</div></article>
  </section>

  {legacyMembershipRevenue.length>0&&<section className="platform-home-section"><span className="eyebrow">LEGACY MEMBERSHIP ENTRY</span><h2>Existing membership pledge detected</h2><p>{currency} {legacyMembershipPledge.toLocaleString("en-KE")} in older membership/contribution revenue records is being treated as membership, not commercial revenue. Save the project pledge above to formalise it.</p></section>}

  <section className="platform-home-section"><h2>Expense ledger</h2><div className="home-list">{!expenses.length&&<p>No expenses recorded.</p>}{expenses.map((x:any)=><div key={x.id}><time>{x.expense_date}</time><span><strong>{x.category} · {x.currency} {Number(x.amount).toLocaleString("en-KE")}</strong><small>{x.vendor||"Project expense"} · {x.payment_status}</small></span></div>)}</div></section>
 </div></AppShell>;
}
