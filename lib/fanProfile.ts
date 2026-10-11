// A navigation preference, never an authorization check.
export function isFanProfile(profile:{creator_types?:unknown}|null|undefined){
 const types=profile?.creator_types;
 return Array.isArray(types)&&types.length>0&&types.every(type=>type==='Fan'||type==='Listener');
}
