"use client";
import {useActionState,useState} from "react";
import {backgroundFormAction} from "../lib/backgroundInteraction";
import {fanHeroAreas,type FanHeroArea,type FanHeroConfig} from "../lib/fanHeroConfig";

type Artwork={id:string;title:string;artist_name:string;has_cover:boolean};
function SingleHeroEditor({area,config,artwork}:{area:FanHeroArea;config:FanHeroConfig;artwork:Artwork[]}){
 const [state,action,pending]=useActionState(backgroundFormAction<{message:string;ok:boolean}>("hero",{message:"",ok:false}),{message:"",ok:false});
 const [title,setTitle]=useState(config.title),[eyebrow,setEyebrow]=useState(config.eyebrow),
  [description,setDescription]=useState(config.description),[image,setImage]=useState(config.image),
  [releaseId,setReleaseId]=useState(config.releaseId),[layout,setLayout]=useState(config.layout),
  [ctaLabel,setCtaLabel]=useState(config.ctaLabel),[ctaHref,setCtaHref]=useState(config.ctaHref),
  [enabled,setEnabled]=useState(config.enabled);
 const selection=fanHeroAreas.find(item=>item.id===area)!;
 const artworkUrl=releaseId?"/api/releases/"+releaseId+"/media?kind=cover":image||"/branding/fackts-creative-community.jpg";
 return <form className="hero-admin-editor" action={action}>
  <input type="hidden" name="area" value={area}/>
  <div className="hero-admin-settings">
   <div className="hero-admin-header"><div><span className="eyebrow">CONTROL ROOM / VISUAL EDITOR</span><h3>{selection.label}</h3></div>
    <label className="hero-admin-switch"><input type="checkbox" name="enabled" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/> Publish custom hero</label>
   </div>
   <div className="hero-admin-fields">
    <label>Headline <input name="title" required={enabled} maxLength={100} value={title} placeholder={selection.fallback} onChange={e=>setTitle(e.target.value)}/></label>
    <label>Eyebrow <input name="eyebrow" maxLength={70} value={eyebrow} placeholder="FACKTS MUSIC / YOUR SPACE" onChange={e=>setEyebrow(e.target.value)}/></label>
    <label className="hero-admin-wide">Supporting text <textarea name="description" maxLength={300} rows={3} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Give the hero a real purpose, not generic copy." /></label>
    <label>Layout <select name="layout" value={layout} onChange={e=>setLayout(e.target.value as FanHeroConfig["layout"])}>
      <option value="editorial">Editorial · blended artwork</option>
      <option value="immersive">Immersive · full photography</option>
      <option value="spotlight">Spotlight · floating cover</option>
     </select></label>
    <label>Use a published song cover <select name="releaseId" value={releaseId} onChange={e=>setReleaseId(e.target.value)}>
      <option value="">Use my image URL below</option>{artwork.filter(item=>item.has_cover).map(item=><option key={item.id} value={item.id}>{item.title} · {item.artist_name}</option>)}
     </select></label>
    <label className="hero-admin-wide">Image URL (optional when a song is selected) <input name="image" value={image} maxLength={600} onChange={e=>setImage(e.target.value)} placeholder="https://… or /branding/fackts-creative-community.jpg"/></label>
    <label>Button label <input name="ctaLabel" value={ctaLabel} maxLength={45} onChange={e=>setCtaLabel(e.target.value)} placeholder="Explore music"/></label>
    <label>Button destination <input name="ctaHref" value={ctaHref} maxLength={250} onChange={e=>setCtaHref(e.target.value)} placeholder="/listen"/></label>
   </div>
   <p className="hero-admin-hint">Use the cover selector for artwork already on FACKTS. For new photography, host the image securely and paste its URL. Hero copy and layout can be changed here at any time.</p>
   <div className="hero-admin-save"><button type="submit" disabled={pending}>{pending?"Saving…":"Save hero"}</button>{state.message&&<span role="status" className={state.ok?"hero-admin-success":"hero-admin-error"}>{state.message}</span>}</div>
  </div>
  <aside className={"hero-admin-preview hero-preview-"+layout}>
    <span className="eyebrow">LIVE DESIGN PREVIEW</span>
    <div className="hero-admin-preview-canvas">
     <img src={artworkUrl} alt="Chosen hero artwork"/>
     <div className="hero-admin-preview-copy">
      <small>{eyebrow||"FACKTS MUSIC"}</small><h4>{title||selection.fallback}</h4><p>{description||"Describe what your visitors will find here."}</p>
      <b>{ctaLabel||"Start listening"} →</b>
     </div>
    </div>
    <span>Preview only · {enabled?"Custom hero enabled":"Default automatic hero active"}</span>
  </aside>
 </form>;
}
export default function HeroAdminPanel({configs,artwork}:{configs:Record<FanHeroArea,FanHeroConfig>;artwork:Artwork[]}){
 const [selected,setSelected]=useState<FanHeroArea>("for-you");
 return <section className="hero-admin-panel">
   <header><span className="eyebrow">FACKTS MUSIC / EDITORIAL SYSTEM</span><h2>Hero studio</h2><p>Control every listening hero. Pick the actual artwork, edit the copy and CTA, and choose how the image blends into the layout. Nothing new is published until you save it.</p></header>
   <div className="hero-admin-tabs" role="group" aria-label="Hero locations">{fanHeroAreas.map(item=><button type="button" key={item.id} aria-pressed={selected===item.id} onClick={()=>setSelected(item.id)}>{item.label}{configs[item.id].enabled&&<span aria-label="Customised">●</span>}</button>)}</div>
   <SingleHeroEditor key={selected} area={selected} config={configs[selected]} artwork={artwork}/>
 </section>;
}
