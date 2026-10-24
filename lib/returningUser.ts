import {cache} from "react";
import {createClient} from "./supabase/server";
import {createAdminClient} from "./supabase/admin";
import {isFanProfile} from "./fanProfile";
export const returningUser = cache(async () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return null;
  const supabase = await createClient();
  const {data:{user},error} = await supabase.auth.getUser();
  if (error || !user) return null;
  const admin=createAdminClient();
  const [profile,memberships] = await Promise.all([
    admin.from("profiles").select("creator_types").eq("id",user.id).maybeSingle(),
    admin.from("project_members").select("id",{count:"exact",head:true}).eq("user_id",user.id).eq("status","active"),
  ]);
  return {id:user.id,creator:(!profile.error&&!isFanProfile(profile.data))||Boolean(memberships.count)};
});
