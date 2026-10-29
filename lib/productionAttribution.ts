import {creatorDisplayName} from './profileIdentity';
const first=(value:any)=>Array.isArray(value)?value[0]:value;
export function productionAttribution(track:any){
 const credits=track?.track_contributors||[];
 const names=(roles:string[])=>[...new Set<string>(credits.filter((c:any)=>roles.includes(String(c.contribution_role||'').toLowerCase().replaceAll(' ','_'))).map((c:any)=>creatorDisplayName(first(c.profiles))))].join(', ');
 return {artist:names(['artist','primary_artist','recording_artist','lead_artist'])||'Recording artist not recorded',featured:names(['featured_artist','featured','feature']),producer:names(['producer','co_producer']),others:credits.filter((c:any)=>!['artist','primary_artist','recording_artist','lead_artist','featured_artist','featured','feature','producer','co_producer'].includes(String(c.contribution_role||'').toLowerCase().replaceAll(' ','_'))).map((c:any)=>`${creatorDisplayName(first(c.profiles))} (${c.contribution_role})`).join(', '),masterEvidence:(track?.track_rights_checks||[]).find((r:any)=>r.check_key==='master_ownership')?.evidence_note||'Not documented'};
}
