export type RepeatMode = 'off' | 'all' | 'one';
export function nextPlaybackIndex(count:number,current:number,shuffle:boolean,repeat:RepeatMode,played:number[],ended:boolean,random=Math.random()):number|null {
 if(count<1)return null;
 if(ended&&repeat==='one')return current;
 if(!shuffle){if(current+1<count)return current+1;return !ended||repeat==='all'?0:null;}
 const available=Array.from({length:count},(_,i)=>i).filter(i=>i!==current&&!played.includes(i));
 if(available.length)return available[Math.min(available.length-1,Math.floor(random*available.length))];
 if(ended&&repeat==='off')return null;
 const fresh=Array.from({length:count},(_,i)=>i).filter(i=>i!==current);
 return fresh.length?fresh[Math.min(fresh.length-1,Math.floor(random*fresh.length))]:0;
}
