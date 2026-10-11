"use server";

import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {getWorkspace} from "../../../lib/workspace";

function read(data:FormData,key:string){
  return String(data.get(key)||"").trim();
}
export async function saveFanProfile(formData:FormData){
  const {user,admin}=await getWorkspace();
  const fullName=read(formData,"full_name");
  const nickname=read(formData,"nickname");
  const bio=read(formData,"bio");
  const location=read(formData,"location");
  const social=read(formData,"social_url");
  const interests=read(formData,"music_tastes").split(",").map(s=>s.trim()).filter(Boolean);
  const visibility=read(formData,"visibility")==="public"?"public":"project";

  let message="";
  if(fullName.length<2||fullName.length>90)message="Use your name (2 to 90 characters).";
  else if(nickname.length>40)message="Keep your display name under 40 characters.";
  else if(bio.length>280)message="Keep your bio under 280 characters.";
  else if(location.length>80)message="Keep your location under 80 characters.";
  else if(interests.length>8||interests.some(s=>s.length>30))message="Choose up to 8 music interests, each under 30 characters.";
  else if(social){
    try{const url=new URL(social);if(url.protocol!=="https:")message="Use a secure https social profile link.";}catch{message="Enter a valid social profile link.";}
  }
  if(message)redirect("/fan/profile?error="+encodeURIComponent(message));

  const {data,error}=await admin.from("profiles").update({
    full_name:fullName,nickname:nickname||null,bio:bio||null,
    location:location||null,skills_genres:interests,
    profile_visibility:visibility,
    social_links:social?{primary:social}:{},
    updated_at:new Date().toISOString()
  }).eq("id",user.id).select("id").maybeSingle();
  if(error||!data)redirect("/fan/profile?error="+encodeURIComponent("Could not save your profile. Please try again."));
  revalidatePath("/fan");
  revalidatePath("/fan/profile");
  revalidatePath("/settings");
  redirect("/fan/profile?saved=1");
}
