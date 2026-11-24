import {createClient} from "./supabase/server";
import {getControlRoomPermissions} from "./controlRoom";

// A finance appointment is a scoped platform permission, never inferred from
// membership in Third Culture or a separate music production project.
export async function getFinancePortalAccess(){
 const supabase=await createClient();
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)return {user:null,authorised:false,superAdmin:false};
 const permissions=await getControlRoomPermissions(user.id);
 return {user,authorised:permissions.includes("finance")||permissions.includes("all"),
   superAdmin:permissions.includes("all")};
}
