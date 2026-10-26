import type {SupabaseClient} from '@supabase/supabase-js';
export async function requireStudioScope(admin:SupabaseClient,projectId:string,sessionId:string|null,trackId:string|null,members:string[]=[]){
  if(sessionId){
    const {data,error}=await admin.from('studio_sessions').select('id').eq('id',sessionId).eq('project_id',projectId).maybeSingle();
    if(error||!data)throw new Error('Session not found in this project.');
  }
  if(trackId){
    const {data,error}=await admin.from('tracks').select('id').eq('id',trackId).eq('project_id',projectId).maybeSingle();
    if(error||!data)throw new Error('Track not found in this project.');
  }
  const unique=[...new Set(members.filter(Boolean))];
  if(unique.length){
    const {data,error}=await admin.from('project_members').select('user_id').eq('project_id',projectId).eq('status','active').in('user_id',unique);
    if(error||unique.some(id=>!data?.some(row=>row.user_id===id)))throw new Error('Choose active members of this project.');
  }
}
