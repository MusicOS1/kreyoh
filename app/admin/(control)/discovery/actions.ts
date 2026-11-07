"use server";
import {requireControlRoomPermission} from "../../../../lib/controlRoom";
import {createAdminClient} from "../../../../lib/supabase/admin";
import {revalidatePath} from "next/cache";
import {editorialImageStoragePath,assertEditorialImageUploaded} from "../../../../lib/editorialImages";
import {normalizeImageCrop} from "../../../../lib/heroImageCrop";

type State={message:string;id?:string;removed?:boolean};
function textValue(form:FormData,key:string){return String(form.get(key)||"").trim();}
function safeImage(value:string){
 if(!value)return;
 if(editorialImageStoragePath(value))return;
 let url:URL;
 try{url=new URL(value)}catch{throw Error("Upload the picture or use a full https:// image URL.");}
 if(url.protocol!=="https:")throw Error("Only https:// image links are allowed.");
}
function safeLink(value:string){
 if(!value)return;
 let url:URL;
 try{url=new URL(value)}catch{throw Error("Live and watch links must be full https:// URLs.");}
 if(url.protocol!=="https:")throw Error("Live and watch links must use https://.");
}
function eventLocal(value:string){
 if(!value)return "";
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)||Number.isNaN(new Date(value+":00+03:00").getTime()))
  throw Error("Enter a valid event date and time.");
 return value;
}
export async function saveDiscovery(_:State,fd:FormData):Promise<State>{
 await requireControlRoomPermission("music");
 try{
  const read=(key:string)=>textValue(fd,key);
  const id=read("id")||`music_discovery_${crypto.randomUUID()}`;
  if(!/^music_discovery_[0-9a-f-]{36}$/.test(id))throw Error("Invalid content item.");
  const admin=createAdminClient();
  if(read("intent")==="delete"){
   const{error}=await admin.from("system_settings").delete().eq("setting_key",id);
   if(error)throw Error(error.message);
  }else{
   const title=read("title"),description=read("description"),kind=read("kind"),
    image=read("image"),programmeImage=read("programmeImage"),url=read("url"),
    position=Number(read("position")),venue=read("venue"),programme=read("programme");
   if(!title||title.length>120||description.length>600||!["show","feature"].includes(kind)||
      !Number.isInteger(position)||position<0||position>999)throw Error("Check title, description and display order.");
   if(image.length>600||programmeImage.length>600||venue.length>120||programme.length>4000)
    throw Error("A field exceeds its character limit.");
   safeImage(image);safeImage(programmeImage);safeLink(url);
   await Promise.all([assertEditorialImageUploaded(image),assertEditorialImageUploaded(programmeImage)]);
   const eventStart=kind==="show"?eventLocal(read("eventStart")):"",
    eventEnd=kind==="show"?eventLocal(read("eventEnd")):"";
   if(eventStart&&eventEnd&&new Date(eventEnd+":00+03:00")<new Date(eventStart+":00+03:00"))
    throw Error("The event end time must be after the start time.");
   const artistNames=kind==="show"?Array.from(new Set(read("artistNames").split(/\r?\n/)
    .map(name=>name.trim()).filter(Boolean))):[];
   if(artistNames.length>25||artistNames.some(name=>name.length>90))
    throw Error("Enter up to 25 artist names, one per line (maximum 90 characters each).");
   const value={
    title,description,kind,image,url,position,published:fd.get("published")==="on",
    featured:kind==="show"&&fd.get("featured")==="on",
    venue:kind==="show"?venue:"",eventStart,eventEnd,artistNames,
    programme:kind==="show"?programme:"",programmeImage:kind==="show"?programmeImage:"",
    ...normalizeImageCrop({imageX:read("imageX"),imageY:read("imageY"),imageZoom:read("imageZoom")})
   };
   const{error}=await admin.from("system_settings").upsert({
    setting_key:id,setting_value:value,updated_at:new Date().toISOString()
   },{onConflict:"setting_key"});
   if(error)throw Error(error.message);
  }
  for(const path of ["/listen","/fan","/admin/discovery",`/shows/${id.slice("music_discovery_".length)}`])
   revalidatePath(path);
  return{message:read("intent")==="delete"?"Content removed.":"Content saved.",id,removed:read("intent")==="delete"};
 }catch(error){
  return{message:error instanceof Error?error.message:"Could not save content."};
 }
}
