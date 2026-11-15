"use client";
import {useState} from "react";
import styles from "./payments.module.css";

export default function PaymentLinkCopy({token}:{token:string}){
  const [copied,setCopied]=useState(false);
  const link="/payments/pay/"+token;
  return <span className={styles.links}>
    <a href={link} target="_blank" rel="noopener noreferrer">Open checkout</a>
    <button type="button" onClick={async()=>{
      try{await navigator.clipboard.writeText(window.location.origin+link);setCopied(true);}
      catch{setCopied(false);}
    }}>{copied?"Copied!":"Copy link"}</button>
  </span>;
}
