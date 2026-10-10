"use server";
import {revalidatePath} from "next/cache";
import {communityAccount,uuidPattern} from "../../lib/community";
import {createAdminClient} from "../../lib/supabase/admin";
import {assertR2ObjectAccess,createR2PresignedUrl,finalizeReleaseObject} from "../../lib/r2";
import {requireControlRoomPermission} from "../../lib/controlRoom";
const read=(f:FormData,k:string)=>String(f.get(k)||"").trim();
export async function prepareRelease(form:FormData){
 const{admin,user}=await communityAccount();
 const title=read(form,"title"),artist=read(form,"artist_name"),audioType=read(form,"audio_type"),coverType=read(form,"cover_type");
 if(!title||title.length>120||!artist||artist.length>100)throw new Error("Enter the song title and artist name.");
 const allowed=['audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/flac'];
 if(!allowed.includes(audioType)||!Number.isFinite(Number(form.get('audio_size')))||Number(form.get('audio_size'))<=0||Number(form.get('audio_size'))>150*1024*1024)throw new Error('Choose MP3, WAV, M4A or FLAC audio up to 150 MB.');
 if(coverType&&(!['image/jpeg','image/png','image/webp'].includes(coverType)||!Number.isFinite(Number(form.get('cover_size')))||Number(form.get('cover_size'))<=0||Number(form.get('cover_size'))>10*1024*1024))throw new Error('Use a JPG, PNG or WebP cover up to 10 MB.');
 if(form.get('rights')!=='on')throw new Error('Confirm that you have permission to release this music.');
 const releaseAt=read(form,'release_at');const date=releaseAt?new Date(`${releaseAt}T00:00:00+03:00`):new Date();
 if(!Number.isFinite(date.getTime()))throw new Error('Choose a valid release date.');
 const collection=read(form,'collection'),genre=read(form,'genre'),description=read(form,'description'),credits=read(form,'credits');
 if(collection.length>120||genre.length>60||description.length>2000||credits.length>2000)throw new Error('Shorten the release details.');
 const number=Number(form.get('track_number')||1);if(!Number.isInteger(number)||number<1||number>100)throw new Error('Choose a track number from 1 to 100.');
 const{count,error:countError}=await admin.from('music_releases').select('id',{count:'exact',head:true}).eq('artist_id',user.id).gte('created_at',new Date(Date.now()-86400000).toISOString());
 if(countError)throw new Error('Submission service unavailable.');if((count||0)>=10)throw new Error('You can submit up to 10 songs per day. Please continue tomorrow.');
 const id=crypto.randomUUID(),prefix=`releases/${user.id}/${id}`;
 const audioKey=`${prefix}/audio`,coverKey=coverType?`${prefix}/cover`:null;
 const uploadUrl=await createR2PresignedUrl('PUT',audioKey,900,audioType);
 const coverUploadUrl=coverKey?await createR2PresignedUrl('PUT',coverKey,900,coverType):null;
 const{error}=await admin.from('music_releases').insert({id,artist_id:user.id,title,artist_name:artist,collection,track_number:number,genre,description,credits,explicit:form.get('explicit')==='on',debut:form.get('debut')==='on',release_at:date.toISOString(),audio_key:audioKey,audio_type:audioType,cover_key:coverKey,rights_confirmed_at:new Date().toISOString()});
 if(error)throw new Error('Could not prepare your release. Please try again.');
 return{id,uploadUrl,coverUploadUrl};
}
export async function finishRelease(id:string){
 const{admin,user}=await communityAccount();
 const{data:release,error}=await admin.from('music_releases').select('*').eq('id',id).eq('artist_id',user.id).eq('status','draft').single();
 if(error||!release)throw new Error('Draft not found.');
 const audio=await assertR2ObjectAccess(release.audio_key);
 if(!audio.ContentLength||audio.ContentLength>150*1024*1024||audio.ContentType!==release.audio_type)throw new Error('The uploaded audio is invalid. Submit a supported audio file.');
 if(release.cover_key){const cover=await assertR2ObjectAccess(release.cover_key);if(!cover.ContentLength||cover.ContentLength>10*1024*1024||!['image/jpeg','image/png','image/webp'].includes(cover.ContentType||''))throw new Error('The cover upload is invalid.');}
 const finalAudio=`releases/${user.id}/${id}/${crypto.randomUUID()}-audio`;
 await finalizeReleaseObject(release.audio_key,finalAudio);
 let finalCover:string|null=null;
 if(release.cover_key){finalCover=`releases/${user.id}/${id}/${crypto.randomUUID()}-cover`;await finalizeReleaseObject(release.cover_key,finalCover);}
 const{error:updateError}=await admin.from('music_releases').update({status:'pending',audio_key:finalAudio,cover_key:finalCover,submitted_at:new Date().toISOString()}).eq('id',id).eq('artist_id',user.id).eq('status','draft');
 if(updateError)throw new Error('Could not submit your release.');revalidatePath('/billboard/submit');revalidatePath('/admin/releases');
}
export async function voteForRelease(id:string,vote:boolean){
 try{if(!uuidPattern.test(id))throw new Error('Release unavailable.');const{admin,user}=await communityAccount();const{error}=await admin.rpc('set_music_vote',{p_user:user.id,p_release:id,p_vote:vote});if(error)throw new Error(error.message);revalidatePath('/billboard');revalidatePath(`/billboard/${id}`);return{ok:true};}catch(error){return{ok:false,error:error instanceof Error?error.message:'Vote could not be saved.'};}
}
export async function manageRelease(_state:{message:string},form:FormData){
 try{
 const id=read(form,'id'),operation=read(form,'operation');if(!uuidPattern.test(id))throw new Error('Release not found.');
 const admin=createAdminClient();let query;
 if(operation==='withdraw'){
  const{user}=await communityAccount();query=admin.from('music_releases').update({status:'withdrawn'}).eq('id',id).eq('artist_id',user.id).neq('status','withdrawn');
 }else{
  const user=await requireControlRoomPermission('music');const note=read(form,'note').slice(0,1000);
  if(!['publish','reject','remove'].includes(operation))throw new Error('Choose an action.');
  if(operation!=='publish'&&!note)throw new Error('Add a reason for the artist.');
  query=admin.from('music_releases').update({status:operation==='publish'?'published':operation==='reject'?'rejected':'withdrawn',review_note:note,reviewed_by:user.id,reviewed_at:new Date().toISOString()}).eq('id',id).eq('status',operation==='remove'?'published':'pending');
 }
 const{data,error}=await query.select('id').maybeSingle();if(error||!data)throw new Error('Release changed or unavailable. Refresh and try again.');
 revalidatePath('/billboard');revalidatePath(`/billboard/${id}`);revalidatePath('/billboard/submit');revalidatePath('/admin/releases');return{message:'Release updated.'};
 }catch(error){return{message:error instanceof Error?error.message:'Could not update release.'};}
}
