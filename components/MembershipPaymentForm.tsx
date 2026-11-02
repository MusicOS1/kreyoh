"use client";

import {useActionState,useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {recordMembershipPaymentWithFeedback} from "../app/finance/actions";

type Member={id:string;name:string;position:string};
const initial:{ok:boolean;message:string;code?:string}={ok:false,message:""};

export default function MembershipPaymentForm({members,month,projectName}:{
 members:Member[];month:string;projectName:string;
}){
 const [state,action,pending]=useActionState(recordMembershipPaymentWithFeedback,initial);
 const [token,setToken]=useState("");
 const [connected,setConnected]=useState(true);
 const form=useRef<HTMLFormElement>(null);
 const router=useRouter();
 useEffect(()=>{
  setToken(crypto.randomUUID());
  setConnected(navigator.onLine);
  const online=()=>setConnected(true),offline=()=>setConnected(false);
  window.addEventListener("online",online);window.addEventListener("offline",offline);
  return ()=>{window.removeEventListener("online",online);window.removeEventListener("offline",offline);};
 },[]);
 useEffect(()=>{
  if(!state.ok)return;
  form.current?.reset();
  setToken(crypto.randomUUID());
  router.refresh();
 },[state.ok,state.code,router]);
 return <form action={action} ref={form} className="panel operations-form membership-payment-form"
  aria-label={"Record membership payment for "+projectName}>
  <p className="finance-payment-heading"><strong>Record member payment</strong><small>Project: {projectName} · Month: {month}</small></p>
  <input type="hidden" name="payment_entry_token" value={token}/>
  <label>Member
   <select name="member_user_id" required defaultValue="">
    <option value="" disabled>Choose project member</option>
    {members.map(m=><option key={m.id} value={m.id}>{m.name} · {m.position}</option>)}
   </select>
  </label>
  <label>Amount (KES)<input name="amount" type="number" min="0.01" step="0.01" required placeholder="Amount received"/></label>
  <label>Payment month<input name="payment_period" type="month" defaultValue={month} required/></label>
  <label>Payment date<input name="transaction_date" type="date" defaultValue={new Date().toISOString().slice(0,10)} required/></label>
  <label>Method<select name="payment_method" defaultValue="M-Pesa">
    <option>M-Pesa</option><option>Cash</option><option>Bank Transfer</option><option>Card</option><option>Other</option>
   </select></label>
  <label>Payment reference<input name="payment_reference" maxLength={120} placeholder="M-Pesa / bank reference (required except cash)"/></label>
  <label>Note (optional)<textarea name="note" placeholder="Advance payment, correction or supporting information"/></label>
  {!connected&&<p role="alert">Your device appears offline. Reconnect and check the ledger before retrying an uncertain payment.</p>}
  <button type="submit" disabled={pending||!connected||!token}>{pending?"Checking and recording…":"Record payment"}</button>
  {state.message&&<p role="status" className={state.ok?"finance-payment-success":"finance-payment-error"}>
   {state.message}{state.ok&&state.code&&<> <a href={"/finance?view=details#payment-ledger"}>View payment ledger</a></>}
  </p>}
  <small>Do not resubmit after a connection timeout until you have checked the payment reference in the ledger.</small>
 </form>;
}
