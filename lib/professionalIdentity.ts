import type {SupabaseClient} from '@supabase/supabase-js';
import {missingApplicationsSchema,validProfession} from './professionalApplications';

// Identity enables personal workspace navigation only. Project and platform
// authority continue to come from memberships and explicit administrator grants.
export async function professionalIdentityTypes(
  admin:SupabaseClient,userId:string,declared:unknown,
):Promise<string[]>{
  const {data,error}=await admin.from('professional_applications')
    .select('profession').eq('user_id',userId).eq('status','approved');
  if(error&&!missingApplicationsSchema(error))
    throw new Error('Professional identity is temporarily unavailable. Please try again.');
  const existing=Array.isArray(declared)?declared.filter((value):value is string=>typeof value==='string'):[];
  const approved=(data||[]).map(row=>row.profession).filter((value):value is string=>typeof value==='string'&&validProfession(value));
  return [...new Set([...existing,...approved])];
}
