import {productionAccess,assertProductionOrigin,productionJson} from '../../../../lib/productionAccess';
import {PRODUCTION_PART_SIZE,partCount,productionFileError} from '../../../../lib/productionPolicy';
import {abortR2Multipart,assertR2ObjectAccess,finishR2Multipart,listR2Parts,signR2Part,startR2Multipart} from '../../../../lib/r2';
const headers={'Cache-Control':'private, no-store'};
export async function POST(request:Request) {
 try {
  assertProductionOrigin(request);
  const input=await productionJson(request,10000);
  const {admin,project,user}=await productionAccess(input.trackId,true);
  if(input.action==='start') {
   const issue=productionFileError(input.name,input.type,input.size,input.kind);if(issue)throw new Error(issue);
   if(!input.trackId)throw new Error('Select a track.');
   const id=crypto.randomUUID();
   const safeName=String(input.name).replace(/[^a-zA-Z0-9._-]/g,'-').slice(-180);
   const key=`${project.id}/tracks/${input.trackId}/${id}-${safeName}`;
   const multipart=true;
   const finalKey=key;
   const uploadId=await startR2Multipart(key,input.type);
   const {error}=await admin.from('production_uploads').insert({id,project_id:project.id,track_id:input.trackId,user_id:user.id,storage_key:key,final_key:finalKey,upload_id:uploadId,file_name:input.name,mime_type:input.type,byte_size:input.size,asset_kind:input.kind,version_note:String(input.note||'').slice(0,280)});
   if(error){if(uploadId)await abortR2Multipart(key,uploadId);throw new Error(error.code==='42P01'||error.code==='PGRST205'?'Production uploads need the Session 3 database setup.':error.message);}
   return Response.json({id,multipart,partSize:PRODUCTION_PART_SIZE},{headers});
  }
  const {data:u,error}=await admin.from('production_uploads').select('*').eq('id',input.id).eq('project_id',project.id).eq('user_id',user.id).maybeSingle();
  if(error||!u)throw new Error('Upload not found in your account and project.');
  if(u.status==='completed')return Response.json({completed:true,assetId:u.asset_id},{headers});
  if(u.status==='aborted'||input.action!=='abort'&&new Date(u.expires_at).getTime()<Date.now())throw new Error('This transfer expired or was cancelled. Start a new upload.');
  if(input.action==='abort') {
   if(u.upload_id)await abortR2Multipart(u.storage_key,u.upload_id);
   const {error}=await admin.from('production_uploads').update({status:'aborted'}).eq('id',u.id).eq('user_id',user.id);if(error)throw new Error(error.message);
   return Response.json({ok:true},{headers});
  }
  if(input.action==='status') {
   let parts;try{parts=await listR2Parts(u.storage_key,u.upload_id);}catch{const object=await assertR2ObjectAccess(u.final_key);if(object.ContentLength!==Number(u.byte_size))throw new Error('The transfer could not be recovered.');return Response.json({transferComplete:true,partSize:PRODUCTION_PART_SIZE,parts:[]},{headers});}
   return Response.json({multipart:!!u.upload_id,parts:parts.filter(p=>p.PartNumber&&p.PartNumber<=partCount(Number(u.byte_size))&&p.Size===Math.min(PRODUCTION_PART_SIZE,Number(u.byte_size)-(p.PartNumber-1)*PRODUCTION_PART_SIZE)).map(p=>({number:p.PartNumber,size:p.Size})),partSize:PRODUCTION_PART_SIZE},{headers});
  }
  if(input.action==='part') {
   const part=Number(input.part);
   if(!Number.isInteger(part)||part<1||part>partCount(Number(u.byte_size)))throw new Error('Invalid upload part.');
   const url=await signR2Part(u.storage_key,u.upload_id,part);
   return Response.json({url},{headers});
  }
  if(input.action!=='complete')throw new Error('Invalid upload action.');
  // Completion is recoverable after a lost response: HEAD first, then use server-observed parts.
  let object;
  try{object=await assertR2ObjectAccess(u.final_key);}catch{
    const parts=await listR2Parts(u.storage_key,u.upload_id);
    const count=partCount(Number(u.byte_size));
    if(parts.length!==count||parts.some((p,i)=>p.PartNumber!==i+1||p.Size!==Math.min(PRODUCTION_PART_SIZE,Number(u.byte_size)-i*PRODUCTION_PART_SIZE)||!p.ETag))throw new Error('Some upload parts are missing or incomplete. Resume the transfer.');
    try{await finishR2Multipart(u.storage_key,u.upload_id,parts.map(p=>({PartNumber:p.PartNumber!,ETag:p.ETag!})));}catch{ /* A concurrent completion may already have succeeded; verify HEAD below. */ }
    object=await assertR2ObjectAccess(u.final_key);
  }
  if(object.ContentLength!==Number(u.byte_size)||object.ContentType!==u.mime_type||!object.ETag)throw new Error('Stored file metadata does not match the authorised transfer.');
  const {data,error:registrationError}=await admin.rpc('production_mutate',{p_project:project.id,p_actor:user.id,p_action:'register_upload',p_target:u.id,p_revision:0,p_data:{key:u.final_key,size:object.ContentLength,etag:object.ETag},p_request:u.id});
  if(registrationError)throw new Error('Transfer complete, but registration needs retry: '+registrationError.message);
  return Response.json({completed:true,assetId:data.asset_id},{headers});
 }catch(cause){return Response.json({error:cause instanceof Error&&/getaddrinfo|ENOTFOUND|ECONNREFUSED|EAI_AGAIN|ETIMEDOUT/.test(cause.message)?'Storage could not be reached. Check the connection and storage setup, then resume.':cause instanceof Error?cause.message:'Upload unavailable.'},{status:400,headers});}
}
