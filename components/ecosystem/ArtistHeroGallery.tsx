"use client";
import {useState} from "react";
import Link from "../ProjectNavigationLink";
import styles from "./ArtistHomePremium.module.css";

type Props={
 name:string;projectName:string;projectSummary:string;projectHref:string;
 photos:string[];hasProject:boolean;hasProjects:boolean;
};
export default function ArtistHeroGallery({name,projectName,projectSummary,projectHref,photos,hasProject,hasProjects}:Props){
 const [selected,setSelected]=useState(0);
 const [failed,setFailed]=useState<string[]>([]);
 const index=Math.min(selected,Math.max(photos.length-1,0));
 const current=photos[index];
 const showImage=Boolean(current&&!failed.includes(current));
 function choose(delta:number){if(photos.length>1)setSelected(i=>(i+delta+photos.length)%photos.length);}
 return <section className={styles.hero} aria-label="Your artist and current project">
   <div className={styles.heroVisual} aria-hidden="true">
     {showImage?<img src={current} alt="" onError={()=>setFailed(old=>old.includes(current)?old:[...old,current])}/>:
       <div className={styles.heroPlaceholder}><span>F</span></div>}
   </div>
   <div className={styles.heroOverlay}/>
   <div className={styles.heroContent}>
     <span className={styles.kicker}>{hasProject?"CURRENT PROJECT":hasProjects?"YOUR WORKSPACE":"WELCOME TO FACKTS MUSIC"}</span>
     <h2>{projectName}</h2>
     <p>{projectSummary}</p>
     <Link href={projectHref} className={styles.primaryAction}>{hasProject?"Continue project":hasProjects?"Choose a project":"Create your first project"} <span aria-hidden="true">↗</span></Link>
   </div>
   <div className={styles.heroIdentity}>
     <strong>{name}</strong>
     <span>Artist workspace</span>
     {!photos.length&&<Link href="/settings#artist-profile-photos">Add your profile photos ↗</Link>}
   </div>
   {photos.length>1&&<div className={styles.galleryControls} aria-label="Your uploaded profile photos">
     <button type="button" onClick={()=>choose(-1)} aria-label="Previous photo">‹</button>
     <div className={styles.galleryThumbnails}>
       {photos.map((photo,i)=><button type="button" key={photo} aria-label={"Show photo "+(i+1)} aria-pressed={index===i} className={index===i?styles.selected:""} onClick={()=>setSelected(i)}>
         <img src={photo} alt="" loading="lazy" onError={e=>{e.currentTarget.style.opacity="0";}}/>
       </button>)}
     </div>
     <button type="button" onClick={()=>choose(1)} aria-label="Next photo">›</button>
   </div>}
   {photos.length===1&&<Link className={styles.galleryEdit} href="/settings#artist-profile-photos">Manage photos ↗</Link>}
 </section>;
}
