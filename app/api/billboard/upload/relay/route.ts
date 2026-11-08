import {assertProductionOrigin} from '../../../../../lib/productionAccess';
import {communityAccount,uuidPattern} from '../../../../../lib/community';
import {
  RELEASE_RELAY_CHUNK_BYTES, uploadReleaseRelayChunk,
  uploadReleaseRelayPart, finishReleaseRelay, startR2Multipart, listReleaseRelayChunks, assertR2ObjectAccess
} from '../../../../../lib/r2';

export const runtime = 'nodejs';
export const maxDuration = 60;

type ReleaseUpload = {key:string;kind:'audio'|'cover';contentType:string;size:number;count:number;id:string};
const maxAudioBytes = 150*1024*1024;
const maxCoverBytes = 10*1024*1024;
const jsonHeaders = {'Cache-Control':'no-store'};

async function resolveUpload(request:Request):Promise<ReleaseUpload>{
  assertProductionOrigin(request);
  const url=new URL(request.url);
  const id=url.searchParams.get('id')||'';
  const kind=url.searchParams.get('kind');
  const contentType=url.searchParams.get('type')||'';
  const size=Number(url.searchParams.get('size'));
  if(!uuidPattern.test(id)||(kind!=='audio'&&kind!=='cover')||
    !Number.isSafeInteger(size)||size<1||size>(kind==='audio'?maxAudioBytes:maxCoverBytes)){
    throw new Error('Invalid release upload request.');
  }
  const {admin,user}=await communityAccount();
  const {data:release,error}=await admin.from('music_releases')
    .select('audio_key,audio_type,cover_key')
    .eq('id',id).eq('artist_id',user.id).eq('status','draft').maybeSingle();
  if(error||!release)throw new Error('This draft is unavailable. Refresh Your submissions.');
  if(kind==='audio' && contentType!==release.audio_type)throw new Error('Select the original audio format for this draft.');
  if(kind==='cover' && (!release.cover_key || !['image/jpeg','image/png','image/webp'].includes(contentType))) {
    throw new Error('Choose JPG, PNG or WebP artwork for this draft.');
  }
  const key=kind==='audio'?release.audio_key:release.cover_key;
  if(!key)throw new Error('Artwork is not required for this draft.');
  return {id,key,kind,contentType,size,count:Math.ceil(size/RELEASE_RELAY_CHUNK_BYTES)};
}

/** Durable upload telemetry: two success events per session and exceptions only.
 * Monitoring can aggregate these without inspecting private song or user data.
 */
async function recordRelayEvent(info:ReleaseUpload,name:string,detail?:string){
 try{
  const {admin,user}=await communityAccount();
  const {error}=await admin.from('platform_events').insert({
   user_id:user.id,entity_type:'music_release',entity_id:info.id,
   category:'music_upload',event_name:name,
   metadata:{kind:info.kind,bytes:info.size,detail:(detail||'').slice(0,180)}
  });
  if(error)console.warn('release-relay-monitoring-write-failed',error.code);
 }catch{console.warn('release-relay-monitoring-unavailable');}
}

export async function GET(request:Request){
 try{
  const info=await resolveUpload(request);
  const [chunks,object]=await Promise.all([
   listReleaseRelayChunks(info.key,info.size),
   assertR2ObjectAccess(info.key).catch(()=>null)
  ]);
  const complete=Boolean(object?.ContentLength===info.size&&object?.ContentType===info.contentType);
  return Response.json({ok:true,chunks,total:info.count,complete},{headers:jsonHeaders});
 }catch(error){return responseError(error);}
}
function responseError(cause:unknown){
  const message=cause instanceof Error?cause.message:'Upload unavailable.';
  console.error('release-relay',{message});
  const safe=/^(Invalid release|This draft|Select the original|Choose JPG|Artwork is not|required|Upload chunk|Upload part|Missing upload|The upload|Storage relay)/.test(message);
  return Response.json({error:safe?message:'Could not transfer this file. Retry using the same draft.'},{status:400,headers:jsonHeaders});
}
export async function PUT(request:Request){
 let info:ReleaseUpload|undefined;
 try{
    info=await resolveUpload(request);
    const index=Number(new URL(request.url).searchParams.get('index'));
    if(!Number.isSafeInteger(index)||index<0||index>=info.count)throw Error('Invalid release upload request.');
    const expected=Math.min(RELEASE_RELAY_CHUNK_BYTES,info.size-index*RELEASE_RELAY_CHUNK_BYTES);
    const declared=Number(request.headers.get('content-length'));
    if(declared && declared!==expected)throw Error('Upload chunk size does not match the file.');
    const bytes=new Uint8Array(await request.arrayBuffer());
    if(bytes.byteLength!==expected)throw Error('Upload chunk size does not match the file.');
    await uploadReleaseRelayChunk(info.key,index,bytes);
    return Response.json({ok:true,index},{headers:jsonHeaders});
  }catch(error){
   if(info)await recordRelayEvent(info,'release_relay_chunk_failed',error instanceof Error?error.message:'unknown');
   return responseError(error);
  }
}
export async function POST(request:Request){
 let info:ReleaseUpload|undefined;
 try{
    info=await resolveUpload(request);
    const url=new URL(request.url);
    const action=url.searchParams.get('action');
    if(action==='start'){
      const uploadId=await startR2Multipart(info.key,info.contentType);
      await recordRelayEvent(info,'release_relay_started');
      return Response.json({ok:true,uploadId},{headers:jsonHeaders});
    }
    const body=await request.json().catch(()=>null);
    if(!body||typeof body!=='object'||typeof body.uploadId!=='string'||body.uploadId.length<1||body.uploadId.length>1024)
      throw Error('Missing upload session.');
    if(action==='part'){
      const part=Number(body.part);
      if(!Number.isSafeInteger(part)||part<1||part>Math.ceil(info.count/2))throw Error('Invalid release upload request.');
      const ETag=await uploadReleaseRelayPart(info.key,body.uploadId,part,info.size,info.count);
      return Response.json({ok:true,part,ETag},{headers:jsonHeaders});
    }
    if(action==='complete'){
      const parts=body.parts;
      if(!Array.isArray(parts)||parts.length!==Math.ceil(info.count/2)||
        parts.some((p:unknown,i:number)=>!p||typeof p!=='object'||(p as any).PartNumber!==i+1||
          typeof (p as any).ETag!=='string'||(p as any).ETag.length>128)){
        throw Error('Invalid release upload request.');
      }
      await finishReleaseRelay(info.key,body.uploadId,parts,info.size,info.contentType,info.count);
      await recordRelayEvent(info,'release_relay_completed');
      return Response.json({ok:true,complete:true},{headers:jsonHeaders});
    }
    throw Error('Invalid release upload request.');
  }catch(error){
   if(info)await recordRelayEvent(info,'release_relay_failed',error instanceof Error?error.message:'unknown');
   return responseError(error);
  }
}
