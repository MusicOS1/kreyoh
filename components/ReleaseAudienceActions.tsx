'use client';
import {useState,useRef} from 'react';
import Link from 'next/link';
import {useListening} from './ListeningProvider';
import {backgroundInteraction} from '../lib/backgroundInteraction';
type Playlist={item_id:string;label:string;track_ids:string[]};
export default function ReleaseAudienceActions({releaseId,artistId,userId,saved=false,following=false,playlists=[],listenOnly=false}:{releaseId?:string;artistId:string;userId?:string;saved?:boolean;following?:boolean;playlists?:Playlist[];listenOnly?:boolean}){
 const {play}=useListening();const [isSaved,setSaved]=useState(saved),[isFollowing,setFollowing]=useState(following),[playlist,setPlaylist]=useState(''),[pending,setPending]=useState<string[]>([]),[notice,setNotice]=useState('');const lock=useRef(new Set<string>());
 async function change(kind:string){if(lock.current.has(kind))return;lock.current.add(kind);setPending([...lock.current]);setNotice('');try{
  let result:{ok:boolean;error?:string};
  if(kind==='following'){const response=await fetch('/api/fan/follow',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({artistId,following:!isFollowing}),signal:AbortSignal.timeout(15000)});result=await response.json();}
  else if(kind==='playlist')result=await backgroundInteraction('playlistAdd',{id:playlist,releaseId});
  else result=await backgroundInteraction('library',{kind:'saved',id:releaseId,enabled:!isSaved});
  if(!result.ok)throw Error(result.error||'Could not save.');if(kind==='following')setFollowing(v=>!v);if(kind==='saved')setSaved(v=>!v);setNotice(kind==='playlist'?'Added to playlist.':'Saved.');
 }catch(e){setNotice(e instanceof Error?e.message:'Please retry.');}finally{lock.current.delete(kind);setPending([...lock.current]);}}
 return <div className="community-actions">{releaseId&&<button type="button" onClick={()=>play(releaseId)}>Listen</button>}{!listenOnly&&<>{userId?<>{releaseId&&<button type="button" disabled={pending.includes('saved')} aria-pressed={isSaved} onClick={()=>void change('saved')}>{isSaved?'Saved · Remove':'Save song'}</button>}{userId!==artistId&&<button type="button" disabled={pending.includes('following')} aria-pressed={isFollowing} onClick={()=>void change('following')}>{isFollowing?'Following · Unfollow':'Follow artist'}</button>}{releaseId&&playlists.length>0&&<><label>Add to playlist<select aria-label="Existing playlist" value={playlist} onChange={e=>setPlaylist(e.target.value)}><option value="">Choose playlist</option>{playlists.map(p=><option key={p.item_id} value={p.item_id}>{p.label}</option>)}</select></label><button type="button" disabled={!playlist||pending.includes('playlist')} onClick={()=>void change('playlist')}>Add to playlist</button></>}</>:<Link href={'/login?next='+encodeURIComponent(releaseId?'/billboard/'+releaseId:'/creators/'+artistId)}>Sign in to follow and save</Link>}</>}{notice&&<small role="status">{notice}</small>}</div>;
}
