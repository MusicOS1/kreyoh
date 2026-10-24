import {createClient} from "../../../../lib/supabase/server";
import {loadIdentityForUser} from "../../../../lib/returningUser";
import {isTransientAuthError} from "../../../../lib/authFailure";
export const dynamic="force-dynamic";
export async function GET() {
  const headers={"Cache-Control":"private, no-store"};
  try {
    const {data:{user},error}=await (await createClient()).auth.getUser();
    if(isTransientAuthError(error))return Response.json({unavailable:true},{status:503,headers});
    if(!user)return Response.json({identity:null},{headers});
    return Response.json({identity:await loadIdentityForUser(user)},{headers});
  } catch {return Response.json({unavailable:true},{status:503,headers});}
}
