"use client";
import Link from "next/link";
import styles from "./MusicHelper.module.css";
import {useActionState,useState} from "react";
import {askMusicHelper,type HelpState} from "../app/help/actions";
import {MUSIC_HELP} from "../lib/musicHelp";
async function helpAction(_previous:HelpState,form:FormData):Promise<HelpState>{
  try{return await askMusicHelper({},form);}
  catch{return {error:'Help could not be loaded. Check your connection and try again.'};}
}
export default function MusicHelper({aiEnabled}:{aiEnabled:boolean}) {
  const [state,action,pending]=useActionState(helpAction,{});
  const [question,setQuestion]=useState("");
  return <div className={`content music-helper ${styles.root}`}><span className="eyebrow">FACKTS MUSIC HELP</span><h1>Where do you want to go?</h1><p>Ask how to find a project, review a split, or complete your next task.</p>
    <form action={action} className={`panel ${styles.form}`}><label>Your question<textarea name="question" value={question} onChange={e=>setQuestion(e.target.value)} maxLength={1000} required placeholder="How do I confirm my share?"/></label><button disabled={pending}>{pending?"Finding help…":"Ask helper"}</button><small>{aiEnabled?"AI navigation help is available. Your question is sent to the AI service; project files and split values are not attached.":"Built-in navigation guide. AI answers are not enabled."}</small></form>
    {state.error&&<p role="alert">{state.error}</p>}
    {state.answer&&<section className={`panel ${styles.answer}`} aria-live="polite"><small>{state.mode}</small><h2>{state.question||"Help"}</h2><p style={{whiteSpace:"pre-line"}}>{state.answer}</p><div className={styles.related}>{state.links?.map(link=><Link key={link.href} href={link.href}>{link.title} →</Link>)}</div></section>}
    <h2>Quick help</h2><div className={styles.topics}>{MUSIC_HELP.map(topic=><details key={topic.href}><summary>{topic.title}</summary><p>{topic.answer}</p><Link href={topic.href}>Open →</Link><button type="button" onClick={()=>setQuestion(topic.title)}>Ask about this</button></details>)}</div>
  </div>;
}
