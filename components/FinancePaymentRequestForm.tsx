"use client";
import {useState} from "react";
import {FINANCE_REQUEST_TYPES,supportsRecurring} from "../lib/financePaymentRequests";
import {createFinancePaymentRequest} from "../app/finance-office/(portal)/payment-requests/actions";
import styles from "../app/finance-office/financeUi.module.css";
export default function FinancePaymentRequestForm({enabled,projects}:{
 enabled:boolean;projects:{id:string;name:string}[];
}){
 const [category,setCategory]=useState<string>("platform_access");
 const [receiver,setReceiver]=useState<"fackts_music"|"project">("fackts_music");
 const recurring=supportsRecurring(category);
 const isArtistSupport=category==="artist_support"||category==="release_support";
 const changeCategory=(next:string)=>{
  setCategory(next);
  const item=FINANCE_REQUEST_TYPES.find(x=>x.code===next);
  setReceiver(item?.defaultAccount||"fackts_music");
 };
 return <form action={createFinancePaymentRequest} className={styles.financeForm}>
  <label>What is the payment for?<select name="purpose_code" value={category}
    onChange={e=>changeCategory(e.target.value)} required disabled={!enabled}>
   {FINANCE_REQUEST_TYPES.map(item=><option value={item.code} key={item.code}>{item.name}</option>)}
  </select></label>
  <label>Who receives the money?<select name="receiver_scope" value={receiver}
     onChange={e=>setReceiver(e.target.value as "fackts_music"|"project")}
     required disabled={!enabled||isArtistSupport}>
    <option value="fackts_music">FACKTS Music business</option>
    <option value="project">Named artist / project</option>
  </select>
   {isArtistSupport&&<input type="hidden" name="receiver_scope" value="project"/>}
  </label>
  {receiver==="project"&&<label className={styles.formWide}>Which artist or project?
   <select name="project_id" required disabled={!enabled} defaultValue="">
    <option value="">Choose the correct project</option>
    {projects.map(project=><option key={project.id} value={project.id}>{project.name}</option>)}
   </select>
   <small>Do not treat an independent artist's support as FACKTS-owned income.</small>
  </label>}
  <label>Amount in KES<input type="number" name="amount_kes" min={3} max={1000000}
    step={1} required disabled={!enabled} placeholder="e.g. 150"/></label>
  <label>How often?<select name="recurrence" disabled={!enabled} required defaultValue="one_time" key={category}>
   <option value="one_time">One-time</option>
   {recurring&&<option value="monthly">Monthly plan — not active</option>}
   {recurring&&<option value="yearly">Annual plan — not active</option>}
  </select></label>
  <label className={styles.formWide}>What exactly is being paid for?<textarea name="description"
    minLength={5} maxLength={400} required disabled={!enabled}
    placeholder="Service, access or support purpose, with clear terms."/>
  </label>
  <label>Payer's email (optional)<input type="email" name="payer_email" maxLength={254} disabled={!enabled}/></label>
  <label>Expiry date (optional)<input type="date" name="expiry_date" disabled={!enabled}/></label>
  <div className={styles.formWide}>
   <p><strong>Draft only.</strong> No Paystack checkout, card authorization or recurring charge is created by saving this request.</p>
  </div>
  <button type="submit" disabled={!enabled}>Save payment-request draft</button>
 </form>;
}
