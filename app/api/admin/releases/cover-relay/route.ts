import {assertProductionOrigin} from "../../../../../lib/productionAccess";
import {requireControlRoomPermission} from "../../../../../lib/controlRoom";
import {createAdminClient} from "../../../../../lib/supabase/admin";
import {uuidPattern} from "../../../../../lib/community";
import {
 RELEASE_RELAY_CHUNK_BYTES,uploadReleaseRelayChunk,uploadReleaseRelayPart,
 finishReleaseRelay,startR2Multipart
} from "../../../../../lib/r2";

export const runtime="nodejs";
export const maxDuration=60;
const maxBytes=10*1024*1024;
const headers={"Cache-Control":"private, no-store"};

type AuthorizedUpload={key:string;contentType:string;size:number;chunkCount:number};
async function authorizedUpload(request:Request):Promise<AuthorizedUpload>{
 assertProductionOrigin(request);
 const actor=await requireControlRoomPermission("music");
 const url=new URL(request.url);
 const releaseId=url.searchParams.get("releaseId")||"";
 const attemptId=url.searchParams.get("attemptId")||"";
 const size=Number(url.searchParams.get("size"));
 const contentType=url.searchParams.get("type")||"";
 if(!uuidPattern.test(releaseId)||!uuidPattern.test(attemptId)||
    !Number.isSafeInteger(size)||size<1||size>maxBytes||
    !["image/jpeg","image/png","image/webp"].includes(contentType))
  throw Error("Invalid cover replacement transfer.");
 const admin=createAdminClient();
 const [{data:intent,error},{data:release,error:releaseError}]=await Promise.all([
  admin.from("platform_events").select("created_at,metadata")
   .eq("id",attemptId).eq("event_name","release_cover_replacement_prepared")
   .eq("user_id",actor.id).eq("entity_id",releaseId).eq("entity_type","release").maybeSingle(),
  admin.from("music_releases").select("id,artist_id,cover_key,status").eq("id",releaseId).maybeSingle()
 ]);
 if(error)throw Error("Cover replacement authorisation lookup failed.");
 if(releaseError)throw Error("Cover replacement release lookup failed.");
 if(!intent||!release)throw Error("Cover replacement authorisation not found.");
 if(Date.now()-new Date(intent.created_at).getTime()>3600000)
  throw Error("Cover replacement authorisation expired. Choose the image again.");
 const {uploadKey,oldKey,status,contentType:preparedType,size:preparedSize}=intent.metadata||{};
 if(release.cover_key!==oldKey||release.status!==status||
    !["draft","pending","published","rejected"].includes(release.status))
  throw Error("Release changed. Refresh before replacing the cover.");
 if(uploadKey!==`releases/${release.artist_id}/${releaseId}/admin-artwork/${attemptId}-incoming.${contentType==="image/png"?"png":contentType==="image/webp"?"webp":"jpg"}` &&
    !(contentType==="image/jpeg"&&uploadKey===`releases/${release.artist_id}/${releaseId}/admin-artwork/${attemptId}-incoming.jpeg`))
  throw Error("Cover transfer does not match the authorised file.");
 if(preparedType!==contentType||preparedSize!==size)
  throw Error("The uploaded image no longer matches the authorised replacement.");
 return{key:uploadKey,contentType,size,chunkCount:Math.ceil(size/RELEASE_RELAY_CHUNK_BYTES)};
}
function problem(error:unknown){
 const message=error instanceof Error?error.message:"Secure upload unavailable.";
 console.error("admin-cover-relay",{message});
 const safe=/^(Invalid cover|Cover replacement|Release changed|The uploaded|Upload chunk|Upload part|Upload session|Missing upload)/.test(message);
 return Response.json({ok:false,error:safe?message:"Secure upload failed; the original artwork was preserved."},
  {status:400,headers});
}
export async function PUT(request:Request){
 try{
  const transfer=await authorizedUpload(request);
  const index=Number(new URL(request.url).searchParams.get("index"));
  if(!Number.isInteger(index)||index<0||index>=transfer.chunkCount)
   throw Error("Invalid cover replacement transfer.");
  const expected=Math.min(RELEASE_RELAY_CHUNK_BYTES,transfer.size-index*RELEASE_RELAY_CHUNK_BYTES);
  const bytes=new Uint8Array(await request.arrayBuffer());
  if(bytes.byteLength!==expected)throw Error("Upload chunk has the wrong size.");
  await uploadReleaseRelayChunk(transfer.key,index,bytes);
  return Response.json({ok:true,index},{headers});
 }catch(error){return problem(error);}
}
export async function POST(request:Request){
 try{
  const transfer=await authorizedUpload(request);
  const action=new URL(request.url).searchParams.get("action");
  if(action==="start"){
   const uploadId=await startR2Multipart(transfer.key,transfer.contentType);
   return Response.json({ok:true,uploadId},{headers});
  }
  const body=await request.json().catch(()=>null);
  if(!body||typeof body!=="object"||typeof body.uploadId!=="string"||body.uploadId.length>1024||!body.uploadId)
   throw Error("Missing upload session.");
  if(action==="part"){
   const part=Number(body.part);
   if(!Number.isSafeInteger(part)||part<1||part>Math.ceil(transfer.chunkCount/2))
    throw Error("Invalid cover replacement transfer.");
   const ETag=await uploadReleaseRelayPart(transfer.key,body.uploadId,part,transfer.size,transfer.chunkCount);
   return Response.json({ok:true,ETag,part},{headers});
  }
  if(action==="complete"){
   const parts=body.parts;
   if(!Array.isArray(parts)||parts.length!==Math.ceil(transfer.chunkCount/2)||
      parts.some((p:unknown,i:number)=>!p||typeof p!=="object"||
       (p as {PartNumber?:number}).PartNumber!==i+1||
       typeof (p as {ETag?:unknown}).ETag!=="string"||
       (p as {ETag:string}).ETag.length>128))
    throw Error("Invalid cover replacement transfer.");
   await finishReleaseRelay(transfer.key,body.uploadId,parts,transfer.size,transfer.contentType,transfer.chunkCount);
   return Response.json({ok:true,complete:true},{headers});
  }
  throw Error("Invalid cover replacement transfer.");
 }catch(error){return problem(error);}
}
