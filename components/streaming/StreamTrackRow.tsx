"use client";
import Link from "next/link";
import TrackWaveform from "../TrackWaveform";
import ReleaseComments from "../ReleaseComments";
import MusicPlayCount from "../MusicPlayCount";
import {ShareRelease,VoteButton,ReleaseVoteCount} from "../ReleaseControls";
import {PlayIcon} from "../Icons";
type Release={id:string;title:string;artist_id:string;artist_name:string;collection:string;has_cover:boolean;votes:number;plays?:number|null};
type Playlist={item_id:string;label:string;track_ids:string[]};
type Props={
 release:Release;rank?:number;userId?:string;active:boolean;isPlaying:boolean;
 liked:boolean;likePending:boolean;onLike:()=>void;onPlay:()=>void;
 onArtist?:()=>void;onSeek:(seconds:number)=>void;position:number;duration:number;
 playlists:Playlist[];onAddPlaylist:(id:string)=>void;playlistPending:(id:string)=>boolean;
 onMove?:(direction:-1|1)=>void;onRemove?:()=>void;isBillboard?:boolean;voted?:boolean;
 notice?:string;
};
export default function StreamTrackRow({release,rank,userId,active,isPlaying,liked,likePending,onLike,onPlay,onArtist,onSeek,position,duration,playlists,onAddPlaylist,playlistPending,onMove,onRemove,isBillboard=false,voted=false,notice}:Props){
 const cover=release.has_cover?"/api/releases/"+release.id+"/media?kind=cover":null;
 return <article className="fs-track" aria-label={release.title+" by "+release.artist_name}>
  <div className="fs-track-main">
   {rank!=null&&<span className="fs-track-rank" aria-label={"Position "+rank}>{rank}</span>}
   <button type="button" className="fs-track-cover" onClick={onPlay} aria-label={(active&&isPlaying?"Play or pause ":"Play ")+release.title}>
    {cover?<img src={cover} alt="" loading="lazy"/>:<span aria-hidden="true">♫</span>}
    <span className="fs-track-play"><PlayIcon size={19}/></span>
   </button>
   <div className="fs-track-info">
    <Link href={"/billboard/"+encodeURIComponent(release.id)} className="fs-track-title">{release.title}</Link>
    <div className="fs-track-byline">{onArtist?<button type="button" onClick={onArtist}>{release.artist_name}</button>:<span>{release.artist_name}</span>}{release.collection&&<span className="fs-track-collection"> · {release.collection}</span>}<span className="fs-track-play-count"> · <MusicPlayCount id={release.id} count={release.plays}/></span></div>
   </div>
   {active&&isPlaying&&<span className="fs-now-playing" aria-label="Now playing"><i/><i/><i/></span>}
  </div>
  <div className="fs-track-actions">
   {userId?
    <button type="button" onClick={onLike} aria-label={(liked?"Remove like from ":"Like ")+release.title} aria-pressed={liked} disabled={likePending}><span aria-hidden="true">{liked?"♥":"♡"}</span><span className="fs-action-label">{liked?"Liked":"Like"}</span></button>:
    <Link href="/login?next=/fan" aria-label={"Sign in to like "+release.title}>♡ <span className="fs-action-label">Like</span></Link>}
   <ReleaseComments releaseId={release.id} viewerId={userId} compact rowAction/>
   <ShareRelease id={release.id} title={release.title}/>
   <details className="fs-track-more"><summary aria-label={"More options for "+release.title}>•••</summary>
    <div className="fs-track-menu">
     <Link href={"/billboard/"+encodeURIComponent(release.id)}>Open song page</Link>
     {userId&&playlists.length>0&&<label>Add to playlist<select aria-label={"Add "+release.title+" to playlist"} defaultValue="" onChange={e=>{if(e.target.value)onAddPlaylist(e.target.value);e.target.value="";}}>
      <option value="">Choose playlist</option>{playlists.map(p=><option key={p.item_id} disabled={playlistPending(p.item_id)} value={p.item_id}>{p.label}</option>)}
     </select></label>}
     {onMove&&<><button type="button" onClick={()=>onMove(-1)}>Move up</button><button type="button" onClick={()=>onMove(1)}>Move down</button></>}
     {onRemove&&<button type="button" onClick={onRemove}>Remove from playlist</button>}
    </div>
   </details>
  </div>
  {isBillboard&&<div className="fs-track-chart"><ReleaseVoteCount id={release.id} count={release.votes}/>{userId?<VoteButton id={release.id} voted={voted} own={userId===release.artist_id}/>:<Link href="/login?next=/fan">Sign in to vote</Link>}</div>}
  {notice&&<p role="alert" className="fs-row-notice">{notice}</p>}
  <details className="fs-waveform"><summary>Waveform &amp; track feedback</summary>
   <TrackWaveform id={release.id} active={active} position={position} duration={duration} onStart={onPlay} onSeek={onSeek}/>
  </details>
 </article>;
}
