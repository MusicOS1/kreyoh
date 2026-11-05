export type ChatAlerts={enabled:boolean;sound:"soft"|"pulse"|"off";vibrate:boolean;showSystem:boolean};
export const defaultAlerts:ChatAlerts={enabled:true,sound:"soft",vibrate:false,showSystem:false};
const key=(userId:string)=>"fm:alerts:"+userId;
const muteKey=(userId:string,other:string)=>"fm:chat:muted:"+userId+":"+other;
export function readChatAlerts(userId:string):ChatAlerts{
 try{
  const value=JSON.parse(window.localStorage.getItem(key(userId))||"null");
  if(!value||typeof value!=="object")return defaultAlerts;
  return {enabled:value.enabled!==false,sound:["soft","pulse","off"].includes(value.sound)?value.sound:"soft",vibrate:value.vibrate===true,showSystem:value.showSystem===true};
 }catch{return defaultAlerts;}
}
export function writeChatAlerts(userId:string,next:ChatAlerts){
 try{window.localStorage.setItem(key(userId),JSON.stringify(next));}catch{}
}
export function readChatMute(userId:string,other:string):boolean{
 try{return window.localStorage.getItem(muteKey(userId,other))==="1";}catch{return false;}
}
export function writeChatMute(userId:string,other:string,muted:boolean){
 try{window.localStorage.setItem(muteKey(userId,other),muted?"1":"0");}catch{}
}
// Original, intentionally gentle in-app chime; does not pause or duck music playback.
export function playChatTone(sound:ChatAlerts["sound"]){
 if(sound==="off"||typeof window==="undefined")return;
 try{
  const AudioContextClass=window.AudioContext;
  if(!AudioContextClass)return;
  const context=new AudioContextClass();
  const at=context.currentTime+.01;
  const notes=sound==="soft"?[660,880]:[520,780,1040];
  notes.forEach((frequency,i)=>{
   const oscillator=context.createOscillator(),gain=context.createGain();
   oscillator.type="sine";oscillator.frequency.value=frequency;
   const t=at+i*.11;
   gain.gain.setValueAtTime(.0001,t);
   gain.gain.exponentialRampToValueAtTime(.022,t+.014);
   gain.gain.exponentialRampToValueAtTime(.0001,t+.13);
   oscillator.connect(gain);gain.connect(context.destination);
   oscillator.start(t);oscillator.stop(t+.14);
  });
  void new Promise(resolve=>setTimeout(resolve,1000)).then(()=>context.close()).catch(()=>{});
 }catch{/* Sound is optional and may be blocked by the browser. */}
}
