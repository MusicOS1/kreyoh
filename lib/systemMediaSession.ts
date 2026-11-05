/**
 * Browser / installed-PWA media controls for the shared FACKTS listener.
 * This is deliberately opt-in: project audio and video players remain separate.
 * A Service Worker cannot play audio or keep a browser alive after force-stop.
 */
export type SystemMediaActions = {
  play: () => void;
  pause: () => void;
  previous: () => void;
  next: () => void;
  stop: () => void;
  seek: (seconds:number) => void;
  seekBy: (seconds:number) => void;
};

function session(): MediaSession | null {
  return typeof navigator !== "undefined" && "mediaSession" in navigator
    ? navigator.mediaSession : null;
}

export function registerSystemMediaActions(actions:SystemMediaActions):()=>void {
  const media=session();
  if(!media)return ()=>{};
  const register=(action:MediaSessionAction,handler:MediaSessionActionHandler|null)=>{
    try{media.setActionHandler(action,handler);}catch{/* The browser may not support a particular action. */}
  };
  const handlers: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
    ["play",()=>actions.play()],
    ["pause",()=>actions.pause()],
    ["previoustrack",()=>actions.previous()],
    ["nexttrack",()=>actions.next()],
    ["stop",()=>actions.stop()],
    ["seekto",details=>{if(Number.isFinite(details.seekTime))actions.seek(details.seekTime!);}],
    ["seekbackward",details=>actions.seekBy(-(details.seekOffset||10))],
    ["seekforward",details=>actions.seekBy(details.seekOffset||10)],
  ];
  for(const [name,handler] of handlers)register(name,handler);
  return ()=>{
    for(const [name] of handlers)register(name,null);
    media.playbackState="none";
    media.metadata=null;
  };
}
export function updateSystemMediaTrack(track:{title:string;artist:string;artwork?:string}):void {
  const media=session();
  if(!media || typeof MediaMetadata==="undefined")return;
  const image=track.artwork||"/branding/fackts-music-logo.png";
  const imageUrl=(()=>{try{return new URL(image,location.origin).href;}catch{return "";}})();
  media.metadata=new MediaMetadata({
    title:track.title,
    artist:track.artist,
    album:"FACKTS Music",
    artwork:imageUrl?[{src:imageUrl,sizes:"512x512"}]:[],
  });
}
export function updateSystemPlaybackState(playing:boolean):void {
  const media=session();
  if(media)media.playbackState=playing?"playing":"paused";
}
export function updateSystemPlaybackPosition(audio:HTMLAudioElement):void {
  const media=session();
  if(!media || typeof media.setPositionState!=="function")return;
  const duration=audio.duration;
  if(!Number.isFinite(duration)||duration<=0)return;
  try{media.setPositionState({
    duration,
    playbackRate:audio.playbackRate,
    position:Math.min(duration,Math.max(0,audio.currentTime)),
  });}catch{/* Android may not expose position updates in all contexts. */}
}
