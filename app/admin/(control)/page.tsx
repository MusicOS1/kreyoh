import Link from "next/link";
import {createAdminClient} from "../../../lib/supabase/admin";

const since=(days:number)=>new Date(Date.now()-days*86400000).toISOString();
const first=(value:any)=>Array.isArray(value)?value[0]:value;
const nice=(value:string)=>value.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase());

export default async function ControlRoomOverview(){
  const admin=createAdminClient();
  const now=new Date();
  const [users,newUsers,projects,beats,claims,sessions,online,activeToday,activeWeek,events]=await Promise.all([
    admin.from("profiles").select("id",{count:"exact",head:true}),
    admin.from("profiles").select("id",{count:"exact",head:true}).gte("created_at",since(7)),
    admin.from("projects").select("id",{count:"exact",head:true}).eq("status","active"),
    admin.from("beats").select("id",{count:"exact",head:true}),
    admin.from("beat_claims").select("id",{count:"exact",head:true}).in("status",["claimed","confirmed","converted_to_track"]),
    admin.from("studio_sessions").select("id",{count:"exact",head:true}).gte("starts_at",now.toISOString()),
    admin.from("user_presence").select("user_id,last_active_at,current_path,profiles(full_name,stage_name,avatar_url,creator_types)").gte("last_active_at",new Date(Date.now()-5*60000).toISOString()).order("last_active_at",{ascending:false}).limit(8),
    admin.from("profiles").select("id",{count:"exact",head:true}).gte("last_active_at",since(1)),
    admin.from("profiles").select("id",{count:"exact",head:true}).gte("last_active_at",since(7)),
    admin.from("platform_events").select("id,event_name,category,created_at,profiles(full_name,stage_name)").order("created_at",{ascending:false}).limit(8),
  ]);
  const metrics=[["Total Users",users.count],["Online Now",online.data?.length],["Active Today",activeToday.count],["Active This Week",activeWeek.count],["New Signups",newUsers.count],["Active Projects",projects.count],["Beats Uploaded",beats.count],["Beat Claims",claims.count],["Sessions Scheduled",sessions.count]];
  return <>
    <section className="control-hero"><div><span className="control-eyebrow">SYSTEM OVERVIEW</span><h1>The whole room,<br/>under control.</h1><p>Live operational visibility across creators, projects, music development and platform health.</p></div><div className="control-hero-status"><span>LIVE SYSTEM</span><strong>{new Intl.DateTimeFormat("en-KE",{dateStyle:"full"}).format(now)}</strong></div></section>
    <section className="control-metrics control-metrics-nine">{metrics.map(([label,value])=><article key={String(label)}><span>{label}</span><strong>{value||0}</strong><small>Real system data</small></article>)}</section>
    <section className="control-grid"><article className="control-panel"><header><div><span className="control-eyebrow">LIVE NOW</span><h2>People currently active</h2></div><Link href="/admin/users">Open users</Link></header><div className="control-table">{!online.data?.length&&<p className="control-empty">No active presence in the last five minutes.</p>}{(online.data||[]).map((item:any)=>{const p=first(item.profiles);return <div className="control-row" key={item.user_id}><span className="control-live-dot"/><div><strong>{p?.stage_name||p?.full_name||"Creator"}</strong><small>{(p?.creator_types||[]).join(" · ")||"Creator"} · {item.current_path||"Inside FACKTS Music"}</small></div><span className="control-status">online</span></div>})}</div></article>
    <article className="control-panel"><header><div><span className="control-eyebrow">RECENT MOVEMENT</span><h2>Meaningful activity</h2></div><Link href="/admin/activity">Full feed</Link></header><div className="control-table">{!events.data?.length&&<p className="control-empty">Activity will appear as people use the platform.</p>}{(events.data||[]).map((item:any)=>{const p=first(item.profiles);return <div className="control-row" key={item.id}><span className="control-activity-dot"/><div><strong>{p?.stage_name||p?.full_name||"System"}</strong><small>{nice(item.event_name)} · {item.category}</small></div><time>{new Date(item.created_at).toLocaleDateString("en-KE")}</time></div>})}</div></article></section>
  </>;
}
