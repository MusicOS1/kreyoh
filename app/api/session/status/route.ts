import {createClient} from "../../../../lib/supabase/server";
import {createAdminClient} from "../../../../lib/supabase/admin";
import {isFanProfile} from "../../../../lib/fanProfile";
import {isTransientAuthError} from "../../../../lib/authFailure";
export const dynamic="force-dynamic";
export async function GET() {
  const headers={"Cache-Control":"private, no-store"};
  try {
    const {data:{user},error}=await (await createClient()).auth.getUser();
    if(isTransientAuthError(error))return Response.json({unavailable:true},{status:503,headers});
    if(!user)return Response.json({identity:null},{headers});
    const admin=createAdminClient();
    const [profile,memberships]=await Promise.all([
      admin.from("profiles").select("creator_types").eq("id",user.id).maybeSingle(),
      admin.from("project_members").select("id",{head:true,count:"exact"}).eq("user_id",user.id).eq("status","active"),
    ]);
    if(profile.error||memberships.error)return Response.json({unavailable:true},{status:503,headers});
    return Response.json({identity:{id:user.id,creator:!isFanProfile(profile.data)||Boolean(memberships.count)}},{headers});
  } catch {return Response.json({unavailable:true},{status:503,headers});}
}
