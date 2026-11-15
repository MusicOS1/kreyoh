"use client";
import {useCallback,useEffect,useState} from "react";
import styles from "./payments.module.css";

export default function PaymentReturn({reference}:{reference:string}){
  const [state,setState]=useState("checking");
  const [error,setError]=useState("");
  const verify=useCallback(async()=>{
    if(!/^FMPS-[0-9a-f]{32}$/.test(reference)){setState("invalid");return;}
    setState("checking");setError("");
    try{
      const response=await fetch("/api/payments/verify",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({reference})});
      const body=await response.json();
      if(!response.ok)throw new Error(body.error||"Verification failed.");
      setState(body.state);
    }catch(err){setState("unknown");setError(err instanceof Error?err.message:"Verification unavailable.");}
  },[reference]);
  useEffect(()=>{void verify();},[verify]);
  return <div className={styles.return}>
    {state==="checking"?<p>Checking with Paystack. A checkout redirect is not proof of payment.</p>:
      state==="paid"?<><strong className={styles.paid}>Payment confirmed</strong><p>Your transaction has been verified and recorded against the project invoice.</p></>:
      state==="already_paid"?<p>This invoice has already been settled. Contact the finance administrator if you made another payment.</p>:
      state==="failed"?<p>The payment did not complete. No money has been marked received.</p>:
      state==="pending"?<p>We are still awaiting M-PESA confirmation. Please check your phone before trying again.</p>:
      <p role="alert">{error||"Unable to verify this payment. Keep your M-PESA confirmation and contact project finance."}</p>}
    {state!=="paid"&&<button type="button" className={styles.primary} onClick={()=>void verify()}>Check payment again</button>}
    <p className={styles.note}>Reference: {reference||"unavailable"}</p>
  </div>;
}
