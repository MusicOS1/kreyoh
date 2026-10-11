"use server";
import {revalidatePath} from "next/cache";
import {requireControlRoomPermission} from "../../../../lib/controlRoom";
import {createAdminClient} from "../../../../lib/supabase/admin";
import {fanHeroAreas,heroKey,normalizeHero,type FanHeroArea} from "../../../../lib/fanHero";

type State={message:string;ok:boolean};
const read=(data:FormData,key:string)=>String(data.get(key)||"").trim();
export async function saveFanHero(_prior:State,form:FormData):Promise<State>{
 try{
  const user=await requireControlRoomPermission("music");
  const area=read(form,"area") as FanHeroArea;
  if(!fanHeroAreas.some(item=>item.id===area))throw Error("Choose a valid hero section.");
  const enabled=read(form,"enabled")==="on";
  const payload=normalizeHero(area,{
    enabled,title:read(form,"title"),eyebrow:read(form,"eyebrow"),
    description:read(form,"description"),image:read(form,"image"),
    releaseId:read(form,"releaseId"),layout:read(form,"layout"),
    ctaLabel:read(form,"ctaLabel"),ctaHref:read(form,"ctaHref")
  });
  const {title,eyebrow,description,image,releaseId,ctaLabel,ctaHref}=payload;
  if(title.length>100||eyebrow.length>70||description.length>300||
     ctaLabel.length>45||ctaHref.length>250||image.length>600)throw Error("Hero copy exceeds the character limit.");
  if(enabled&&!title)throw Error("Enter a headline to publish this hero.");
  if(image){
   if(!image.startsWith("/branding/")){
    let url:URL;try{url=new URL(image);}catch{throw Error("Use a secure https image URL or a local /branding/ image.");}
    if(url.protocol!=="https:")throw Error("Only https image URLs are supported.");
   }
  }
  if(ctaHref){
   if(!(ctaHref.startsWith("/")&&!ctaHref.startsWith("//")&&!/[\\\x00-\x20]/.test(ctaHref))){
    let url:URL;try{url=new URL(ctaHref);}catch{throw Error("CTA needs a local path or a secure https URL.");}
    if(url.protocol!=="https:")throw Error("CTA links must use https.");
   }
  }
  const admin=createAdminClient();
  if(releaseId){
   const{data:release,error}=await admin.from("music_weekly_chart").select("id,has_cover").eq("id",releaseId).maybeSingle();
   if(error||!release||!release.has_cover)throw Error("Select artwork from a currently published release.");
  }
  const{error}=await admin.from("system_settings").upsert({
    setting_key:heroKey(area),setting_value:payload,description:"FACKTS Music fan and public hero",
    updated_by:user.id,updated_at:new Date().toISOString()
  },{onConflict:"setting_key"});
  if(error)throw Error("Hero could not be saved: "+error.message);
  for(const path of ["/fan","/listen","/billboard","/fan/profile","/messages","/admin/discovery"])revalidatePath(path);
  return{message:"Saved "+fanHeroAreas.find(item=>item.id===area)?.label+" hero.",ok:true};
 }catch(error){return{message:error instanceof Error?error.message:"Could not save hero.",ok:false};}
}
