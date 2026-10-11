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

export function moveQueueTrack<T>(items:T[],from:number,to:number):T[]{
 if(from<0||from>=items.length||to<0||to>=items.length||from===to)return items;
 const next=[...items];const [item]=next.splice(from,1);next.splice(to,0,item);return next;
}
