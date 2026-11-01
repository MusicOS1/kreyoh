"use client";
import {HomeIcon,UsersIcon,DiscIcon,ActivityIcon,MusicIcon,ClockIcon,SearchIcon,LayersIcon,MicIcon} from "../Icons";

type NavProps={
 active:string; onSelect:(tab:string)=>void; onSearch:()=>void; userId?:string;
 lists:{item_id:string;label:string}[]; playlistId:string; onPlaylist:(id:string)=>void;
};
const explore=[
 {id:"For You",label:"Discover",Icon:HomeIcon},
 {id:"Artists",label:"Artists",Icon:UsersIcon},
 {id:"Albums & EPs",label:"Albums & EPs",Icon:DiscIcon},
 {id:"Billboard",label:"Billboard",Icon:ActivityIcon},
 {id:"Shows",label:"Shows",Icon:MicIcon},
] as const;
const personal=[
 {id:"My Library",label:"Liked songs",Icon:MusicIcon},
 {id:"Following",label:"Following",Icon:UsersIcon},
 {id:"Recently played",label:"Recently played",Icon:ClockIcon},
] as const;
export function StreamSidebar({active,onSelect,onSearch,userId,lists,playlistId,onPlaylist}:NavProps){
 return <aside className="fs-sidebar" aria-label="Music navigation">
  <div className="fs-sidebar-brand"><span className="fs-sidebar-mark">F</span><span>FACKTS <b>MUSIC</b><small>Music · People · Possibility</small></span></div>
  <button className="fs-sidebar-search" type="button" onClick={onSearch}><SearchIcon size={18}/> Search music</button>
  <nav aria-label="Explore FACKTS Music" className="fs-navgroup">
   {explore.map(({id,label,Icon})=><button key={id} type="button" onClick={()=>onSelect(id)} className={active===id?"fs-active":""} aria-current={active===id?"page":undefined}><Icon size={19}/><span>{label}</span></button>)}
  </nav>
  <div className="fs-sidebar-divider"/>
  <div className="fs-sidebar-caption">YOUR LIBRARY</div>
  {userId?
   <nav className="fs-navgroup" aria-label="Your music">
    {personal.map(({id,label,Icon})=><button key={id} type="button" onClick={()=>onSelect(id)} className={active===id?"fs-active":""} aria-current={active===id?"page":undefined}><Icon size={18}/><span>{label}</span></button>)}
    {lists.length>0&&<div className="fs-playlists"><div className="fs-sidebar-caption">PLAYLISTS</div>{lists.map(list=><button className={active==="My Library"&&playlistId===list.item_id?"fs-active":""} type="button" key={list.item_id} onClick={()=>onPlaylist(list.item_id)}><LayersIcon size={17}/><span>{list.label}</span></button>)}</div>}
   </nav>:
   <p className="fs-sidebar-hint">Sign in to save tracks, follow artists and build your library.</p>}
  <div className="fs-sidebar-footer">REAL ARTISTS. REAL MUSIC.</div>
 </aside>;
}
export function StreamMobileNav({active,onSelect,onSearch,userId}:Pick<NavProps,"active"|"onSelect"|"onSearch"|"userId">){
 const items=[
  {id:"For You",label:"Home",Icon:HomeIcon,action:()=>onSelect("For You")},
  {id:"Search",label:"Search",Icon:SearchIcon,action:onSearch},
  {id:"Artists",label:"Artists",Icon:UsersIcon,action:()=>onSelect("Artists")},
  {id:"Billboard",label:"Charts",Icon:ActivityIcon,action:()=>onSelect("Billboard")},
  {id:"My Library",label:"Library",Icon:MusicIcon,action:()=>onSelect(userId?"My Library":"For You")},
 ];
 return <nav className="fs-mobile-nav" aria-label="Music mobile navigation">
  {items.map(({id,label,Icon,action})=><button type="button" key={id} aria-current={active===id?"page":undefined} onClick={action}><Icon size={20}/><span>{label}</span></button>)}
 </nav>;
}
