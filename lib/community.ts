import "server-only";
import {getWorkspace} from "./workspace";
import {createAdminClient} from "./supabase/admin";
import {createClient} from "./supabase/server";
export const uuidPattern=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export async function communityAccount(){
 const workspace=await getWorkspace();
 if(!workspace.user.email_confirmed_at)throw new Error("Confirm your email to submit, vote or message.");
 if(workspace.profile?.account_status!=="active")throw new Error("Your account is not active.");
 return workspace;
}
export async function viewer(){const client=await createClient();const{data:{user}}=await client.auth.getUser();return user;}
export async function chart(){
 const{data,error}=await createAdminClient().from("music_weekly_chart").select("*").order("votes",{ascending:false}).order("release_at",{ascending:false}).order("id");
 if(error)throw new Error("The Billboard could not be loaded. Please try again.");
 return data||[];
}
export function currentChartWeek(){
 const now=new Date(Date.now()+3*3600000);const day=(now.getUTCDay()+6)%7;
 now.setUTCDate(now.getUTCDate()-day);return now.toISOString().slice(0,10);
}
