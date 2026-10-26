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
