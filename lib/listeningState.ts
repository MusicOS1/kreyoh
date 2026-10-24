export type ListeningState={version:1;ids:string[];selected:string;position:number;updatedAt:number};
export function restoreListening(value:unknown,allowedIds:string[],now=Date.now()):ListeningState|null {
  if(!value||typeof value!=="object")return null;
  const state=value as Partial<ListeningState>;
  if(state.version!==1||!Array.isArray(state.ids)||typeof state.selected!=="string"||!Number.isFinite(state.position)||state.position!<0||!Number.isFinite(state.updatedAt)||now-state.updatedAt!>30*86400000)return null;
  const allowed=new Set(allowedIds);
  const ids=[...new Set(state.ids.filter((id):id is string=>typeof id==="string"&&allowed.has(id)))].slice(0,1000);
  if(!ids.includes(state.selected))return null;
  return {version:1,ids,selected:state.selected,position:Math.min(state.position!,86400),updatedAt:state.updatedAt!};
}
export function readPreference<T>(key:string):T|null {try{return JSON.parse(localStorage.getItem(key)||"null") as T|null;}catch{return null;}}
export function writePreference(key:string,value:unknown){try{localStorage.setItem(key,JSON.stringify(value));}catch{/* Private mode / full storage must not break music. */}}
