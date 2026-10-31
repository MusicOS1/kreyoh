import {createClient} from "../../../../lib/supabase/server";
import {loadIdentityForUser} from "../../../../lib/returningUser";
import {recordServiceIncident} from "../../../../lib/diagnostics";
import {isTransientAuthError} from "../../../../lib/authFailure";
export const dynamic="force-dynamic";
export async function GET() {
  const headers={"Cache-Control":"private, no-store"};
  try {
    const {data:{user},error}=await (await createClient()).auth.getUser();
    if(isTransientAuthError(error)){await recordServiceIncident("session_status","service_unavailable");return Response.json({unavailable:true},{status:503,headers});}
    if(!user)return Response.json({identity:null},{headers});
    return Response.json({identity:await loadIdentityForUser(user)},{headers});
  } catch {await recordServiceIncident("session_status","network");return Response.json({unavailable:true},{status:503,headers});}
}
