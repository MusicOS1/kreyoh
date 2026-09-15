"use server";

import {revalidatePath} from "next/cache";
import {getWorkspace} from "../../lib/workspace";

export async function markInboxRead(){
  const{supabase,user}=await getWorkspace();
  await supabase.from("notifications")
    .update({read_at:new Date().toISOString()})
    .eq("user_id",user.id)
    .is("read_at",null);
  revalidatePath("/inbox");
  revalidatePath("/home");
  revalidatePath("/", "layout");
}

export async function markInboxItemRead(fd:FormData){
  const{supabase,user}=await getWorkspace();
  await supabase.from("notifications")
    .update({read_at:new Date().toISOString()})
    .eq("id",String(fd.get("notification_id")||""))
    .eq("user_id",user.id);
  revalidatePath("/inbox");
  revalidatePath("/home");
  revalidatePath("/", "layout");
}
