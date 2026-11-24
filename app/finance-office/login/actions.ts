"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {createClient} from "../../../lib/supabase/server";
import {createAdminClient} from "../../../lib/supabase/admin";
import {hasControlRoomPermission} from "../../../lib/controlRoom";
import {classifyAuthFailure,recordAuthDiagnostic} from "../../../lib/diagnostics";

export async function financeOfficeLogin(fd:FormData){
 const email=String(fd.get("email")||"").trim().toLowerCase();
 const password=String(fd.get("password")||"");
 const started=Date.now();
 await recordAuthDiagnostic({event:"login_attempted",surface:"control_room"});
 if(!email||!password)redirect("/finance-office/login?error=Enter+your+email+and+password.");
 const supabase=await createClient();
 let id:string|null=null, failure:unknown=null;
 try{const result=await supabase.auth.signInWithPassword({email,password});id=result.data.user?.id||null;failure=result.error;}
 catch(cause){failure=cause;}
 if(!id){
   await recordAuthDiagnostic({event:"login_failed",surface:"control_room",reason:classifyAuthFailure(failure),durationMs:Date.now()-started});
   redirect("/finance-office/login?error=Sign-in+failed.+Check+your+details.");
 }
 if(!(await hasControlRoomPermission(id,"finance"))){
   await recordAuthDiagnostic({event:"login_access_denied",surface:"control_room",reason:"access_denied",userId:id,durationMs:Date.now()-started});
   redirect("/finance-office/access-unavailable");
 }
 const admin=createAdminClient(),now=new Date().toISOString();
 await Promise.allSettled([
   admin.from("profiles").update({last_login_at:now,last_active_at:now}).eq("id",id),
   admin.from("auth_events").insert({user_id:id,event_name:"login_completed",metadata:{surface:"finance_office"}}),
 ]);
 revalidatePath("/","layout");
 redirect("/finance-office");
}
