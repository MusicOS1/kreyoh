import type {SupabaseClient} from '@supabase/supabase-js';
import {hasAnyRole} from './workspace';
export function sessionIsRelevant(session:any,userId:string,roles:string[]){
 return hasAnyRole(roles,['Super Admin','Admin','Project Lead','A&R','Manager','Project Coordinator'])||[session.created_by,session.engineer_id,session.producer_id,session.ar_id,...(session.session_participants||[]).map((p:any)=>p.user_id)].includes(userId);
}
export async function requireSessionParticipation(admin:SupabaseClient,projectId:string,sessionId:string,userId:string,roles:string[]){
 const {data,error}=await admin.from('studio_sessions').select('id,created_by,engineer_id,producer_id,ar_id,session_participants(user_id)').eq('id',sessionId).eq('project_id',projectId).maybeSingle();
 if(error||!data||!sessionIsRelevant(data,userId,roles))throw new Error('You are not assigned to this session.');
 return data;
}

// Counts and lists share this same project and participation boundary.
export async function loadProjectSessions(admin:SupabaseClient,projectId:string,userId:string,roles:string[],details=false){
 const {readAllRows}=await import('./recordReads');
 const columns=details?'*,tracks(id,working_title),session_participants(*,profiles!session_participants_user_id_fkey(full_name,stage_name)),session_contributions(id,track_id,contribution_type,description,created_at,profiles!session_contributions_contributor_id_fkey(full_name,stage_name),tracks(working_title)),project_tasks(id,title,status,due_date,profiles!project_tasks_assignee_id_fkey(full_name,stage_name))':'*,tracks(id,working_title),session_participants(user_id)';
 const result=await readAllRows(()=>admin.from('studio_sessions').select(columns).eq('project_id',projectId).order('starts_at',{ascending:false}).order('id'));
 if(result.error)return result;
 const data=(result.data||[]).filter((session:any)=>sessionIsRelevant(session,userId,roles));
 return {data,error:null,count:data.length};
}
