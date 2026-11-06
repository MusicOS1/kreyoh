"use server";
import {requireControlRoomPermission} from '../../../../lib/controlRoom';
import {createAdminClient} from '../../../../lib/supabase/admin';
import {revalidatePath} from 'next/cache';
import {editorialImageStoragePath,assertEditorialImageUploaded} from '../../../../lib/editorialImages';
export async function saveDiscovery(_: {message:string},fd:FormData){
 await requireControlRoomPermission('music');
 try{
 const read=(k:string)=>String(fd.get(k)||'').trim();
 const id=read('id')||`music_discovery_${crypto.randomUUID()}`;
 if(!/^music_discovery_[0-9a-f-]{36}$/.test(id))throw Error('Invalid content item.');
 const admin=createAdminClient();
 if(read('intent')==='delete'){const{error}=await admin.from('system_settings').delete().eq('setting_key',id);if(error)throw error;}
 else{
 const title=read('title'),description=read('description'),kind=read('kind'),image=read('image'),url=read('url'),position=Number(read('position'));
 if(!title||title.length>120||description.length>600||!['show','feature'].includes(kind)||!Number.isInteger(position)||position<0||position>999)throw Error('Check title, description and display order.');
 if(image&&!editorialImageStoragePath(image)){let parsed:URL;try{parsed=new URL(image);}catch{throw Error('Upload a picture or use a full https:// image URL.');}if(parsed.protocol!=='https:')throw Error('Use a full https:// image URL.');}
 if(url){let parsed:URL;try{parsed=new URL(url);}catch{throw Error('Use a full https:// Watch link.');}if(parsed.protocol!=='https:')throw Error('Use a full https:// Watch link.');}
 await assertEditorialImageUploaded(image);
 const{error}=await admin.from('system_settings').upsert({setting_key:id,setting_value:{title,description,kind,image,url,position,published:fd.get('published')==='on'},updated_at:new Date().toISOString()},{onConflict:'setting_key'});if(error)throw error;
 }
 for(const path of ['/listen','/fan','/admin/discovery'])revalidatePath(path);
 return{message:read('intent')==='delete'?'Content removed.':'Content saved.',id,removed:read('intent')==='delete'};
 }catch(e){return{message:e instanceof Error?e.message:'Could not save content.'};}
}
