"use client";
import {useState} from "react";
import styles from "./payments.module.css";

export default function PaymentCheckout({token,assignedEmail,disabled}:{token:string;assignedEmail:string;disabled:boolean}){
  const [email,setEmail]=useState(assignedEmail);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function pay(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setError("");
    try{
      const response=await fetch("/api/payments/checkout",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({token,email})
      });
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"Checkout failed.");
      const url=new URL(result.checkout_url);
      if(url.protocol!=="https:"||url.hostname!=="checkout.paystack.com")throw new Error("Invalid checkout URL.");
      window.location.assign(url.href);
    }catch(err){setError(err instanceof Error?err.message:"Unable to open Paystack checkout.");setBusy(false);}
  }
  return <form onSubmit={pay} className={styles.form}>
    <label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)}
      autoComplete="email" required disabled={busy||!!assignedEmail} placeholder="you@example.com"/></label>
    <p className={styles.note}>Paystack will request your M-PESA phone number and prompt you to approve the payment on your phone.</p>
    <button className={styles.primary} disabled={busy||disabled} type="submit">{busy?"Opening secure checkout…":"Pay with M-PESA"}</button>
    {error&&<p role="alert" className={styles.error}>{error}</p>}
  </form>;
}
