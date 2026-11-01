import { notFound } from "next/navigation";
import AppShell from "../../../components/AppShell";
import ReleaseAudienceActions from "../../../components/ReleaseAudienceActions";
import {viewer,chart} from "../../../lib/community";
import Link from "next/link";
import PublicNavigation from "../../../components/PublicNavigation";
import PublicFooter from "../../../components/PublicFooter";
import MixtapeThemeToggle from "../../../components/MixtapeThemeToggle";
import MixtapeArtistStage from "../../../components/MixtapeArtistStage";
import { creatorDisplayName } from "../../../lib/profileIdentity";
import {creditedToArtist,releaseHasArtist} from "../../../lib/releaseArtistMatch";
import { createAdminClient } from "../../../lib/supabase/admin";

const first = (value: any) => Array.isArray(value) ? value[0] : value;
function mediaEmbed(url?: string | null, music = false) { if(!url)return null; try{const p=new URL(url),h=p.hostname.replace(/^www\./,"").toLowerCase();if(h==="youtu.be")return`https://www.youtube.com/embed/${p.pathname.slice(1).split("/")[0]}`;if(h.includes("youtube.com"))return`https://www.youtube.com/embed/${p.searchParams.get("v")||p.pathname.split("/").filter(Boolean).pop()}`;if(h.includes("vimeo.com"))return`https://player.vimeo.com/video/${p.pathname.split("/").filter(Boolean).pop()}`;if(music&&h.includes("spotify.com"))return`https://open.spotify.com/embed${p.pathname}`;if(music&&h.includes("music.apple.com"))return`https://embed.music.apple.com${p.pathname}${p.search}`;if(music&&h.includes("soundcloud.com"))return`https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23f5a623&auto_play=false&hide_related=true&show_comments=false`;}catch{}return null;}

export default async function PublicCreatorPage({params}:{params:Promise<{userId:string}>}) {
 const {userId:handle}=await params,admin=createAdminClient();
 const fields="id,stage_name,nickname,avatar_url,hero_image_url,bio,epk_tagline,location,skills_genres,social_links,streaming_links,top_songs,photo_catalog,interview_title,interview_url,achievements,creator_types,profile_visibility,public_slug";
 let {data:profile}=await admin.from("profiles").select(fields).eq("public_slug",handle).eq("profile_visibility","public").eq("account_status","active").maybeSingle();
 if(!profile&&/^[0-9a-f-]{36}$/i.test(handle))({data:profile}=await admin.from("profiles").select(fields).eq("id",handle).eq("profile_visibility","public").eq("account_status","active").maybeSingle());
 if(!profile)notFound();
 const [published,sessionUser]=await Promise.all([chart(),viewer()]);
 const name=creatorDisplayName(profile),verifiedReleases=published.filter((song:any)=>releaseHasArtist(song,profile.id,name)),photos=(profile.photo_catalog||[]).slice(0,5),interview=mediaEmbed(profile.interview_url);
 const sourceRows=verifiedReleases.length?await admin.from('music_releases').select('id,source_track_id').in('id',verifiedReleases.map((r:any)=>r.id)):{data:[],error:null};
 const sourceTitles=new Map((sourceRows.data||[]).filter((r:any)=>r.source_track_id).map((r:any)=>[r.source_track_id,verifiedReleases.find((song:any)=>song.id===r.id)?.title]));
 const sourceIds=[...sourceTitles.keys()];
 const {data:creditData=[],error:creditsError}=sourceIds.length?await admin.from('track_contributors').select('id,contribution_role,track_id').eq('user_id',profile.id).eq('approved',true).in('track_id',sourceIds):{data:[],error:null};
 const credits=(creditData||[]).map((c:any)=>({...c,tracks:{working_title:sourceTitles.get(c.track_id)}}));
 const {data:follow}=sessionUser?await admin.from('fan_music_library').select('item_id').eq('user_id',sessionUser.id).eq('kind','following').eq('item_id',profile.id).maybeSingle():{data:null};
 const content=<main className="public-creator-shell fm-mixtape-profile"><div className="content creator-profile-page public-creator-page">
  <div className="fm-mixtape-profile-toolbar"><Link href="/creators">← Meet more artists</Link><MixtapeThemeToggle/></div>
  <MixtapeArtistStage className="mx-profile-stage" name={name} portrait={profile.hero_image_url||profile.avatar_url}
     description={profile.epk_tagline||profile.bio||"Independent creator on FACKTS Music."}
     location={profile.location} genres={profile.skills_genres||[]}
     actions={<ReleaseAudienceActions artistId={profile.id} userId={sessionUser?.id} following={Boolean(follow)}/>}
   />
  <nav className="fm-mixtape-profile-nav" aria-label="Artist profile sections"><a href="#artist-music">Music</a><a href="#artist-story">About</a><a href="#artist-credits">Credits</a></nav>
  <section id="artist-music" className="fm-creator-published panel" aria-label="Official FACKTS releases"><div className="creator-section-heading"><span className="eyebrow">RELEASED ON FACKTS MUSIC</span><h2>{name}'s music</h2><p>These releases update automatically when this artist publishes an approved track.</p></div>
    {verifiedReleases.length?<div className="fm-creator-published-list">{verifiedReleases.map(song=><article key={song.id}>
     <Link className="fm-creator-release-art" href={"/billboard/"+song.id} aria-label={"View "+song.title}>{song.has_cover?<img src={"/api/releases/"+song.id+"/media?kind=cover"} alt=""/>:<span>♫</span>}</Link>
     <div><strong>{song.title}</strong><small>{song.collection||"Single"}</small><span>{song.genre||"Independent music"}</span></div>
     <ReleaseAudienceActions releaseId={song.id} artistId={profile.id} userId={sessionUser?.id} listenOnly/>
     <Link href={"/billboard/"+song.id}>Open ↗</Link>
    </article>)}</div>:<p className="fm-creator-empty-releases">No published FACKTS releases yet. Once this artist's music is approved, it will appear here automatically.</p>}
   <aside className="mx-profile-behind" aria-label="Behind the music"><span>BEHIND THE SOUND</span><h3>Meet {name}.</h3><p>{profile.epk_tagline||profile.bio||"Explore the story and released music of this artist."}</p>{verifiedReleases.length>0&&<Link href={"/billboard/"+verifiedReleases[0].id}>Latest release: {verifiedReleases[0].title} ↗</Link>}</aside>
   </section>
  {!!photos.length&&<section className="creator-photo-catalog"><div className="creator-section-heading"><span className="eyebrow">MEDIA</span><h2>Photo catalogue</h2></div><div>{photos.map((photo:string,index:number)=><img src={photo} alt={`${name} ${index+1}`} key={photo}/>)}</div></section>}
  <section id="artist-story" className="creator-profile-grid compact"><article className="panel"><span className="eyebrow">PROFILE</span><h2>Creative identity</h2><p>{profile.bio||"Bio coming soon."}</p><dl><div><dt>Location</dt><dd>{profile.location||"Not listed"}</dd></div><div><dt>Sound</dt><dd>{(profile.skills_genres||[]).join(" · ")||"Not listed"}</dd></div></dl><div className="public-profile-links">{profile.social_links?.primary&&<a href={profile.social_links.primary} target="_blank" rel="noreferrer">Social ↗</a>}{profile.streaming_links?.primary&&<a href={profile.streaming_links.primary} target="_blank" rel="noreferrer">Streaming ↗</a>}</div></article><article className="panel creator-top-five"><span className="eyebrow">TOP FIVE</span><h2>Selected music</h2><div className="creator-song-list">{!(profile.top_songs||[]).length&&<p>No selected songs yet.</p>}{(profile.top_songs||[]).map((song:any,index:number)=>{const src=mediaEmbed(song.url,true);return <div className="creator-song-player" key={`${song.title}-${index}`}><div className="creator-song-heading"><span>{String(index+1).padStart(2,"0")}</span><strong>{song.title}</strong>{song.url&&<a href={song.url} target="_blank" rel="noreferrer">Open ↗</a>}</div>{src?<iframe src={src} title={`${song.title} player`} loading="lazy" allow="autoplay; encrypted-media; picture-in-picture"/>:song.url&&<a className="creator-song-fallback" href={song.url} target="_blank" rel="noreferrer">Play on original platform ↗</a>}</div>})}</div></article></section>
  {(profile.interview_url||profile.interview_title)&&<section className="panel creator-interview compact"><div><span className="eyebrow">FEATURED INTERVIEW</span><h2>{profile.interview_title||`Meet ${name}`}</h2></div>{interview?<iframe src={interview} title={profile.interview_title||`${name} interview`} allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen/>:<a className="secondary-button-inline" href={profile.interview_url} target="_blank" rel="noreferrer">Watch interview ↗</a>}</section>}
  <section id="artist-credits" className="panel compact-public-credits"><div className="creator-panel-heading"><div><span className="eyebrow">APPROVED CREDITS</span><h2>Music history</h2></div><span>{(credits??[]).length} records</span></div><div className="creator-credit-list">{(creditsError||sourceRows.error)&&<p role="alert">Public credits could not be loaded.</p>}{(credits??[]).map((credit:any,index:number)=><div className="creator-credit-row premium" key={credit.id}><span className="creator-credit-index">{String(index+1).padStart(2,"0")}</span><strong>{first(credit.tracks)?.working_title||"Untitled track"}</strong><span>{String(credit.contribution_role).replaceAll("_"," ")}</span><b>Approved</b></div>)}</div><p className="public-credit-privacy">Credits are visible; project files and internal records remain private.</p></section>
  {!!profile.achievements?.length&&<section className="panel creator-achievements compact"><span className="eyebrow">HIGHLIGHTS</span><h2>Achievements</h2><ul>{profile.achievements.map((item:string)=><li key={item}>{item}</li>)}</ul></section>}
 </div></main>;
 return sessionUser?<AppShell>{content}</AppShell>:<><PublicNavigation/>{content}<PublicFooter/></>;
}
