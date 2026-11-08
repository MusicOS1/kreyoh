"use client";

import {directUpload} from "./directUpload";

const CHUNK=3*1024*1024;
const MAX_AUDIO=150*1024*1024;
const MAX_COVER=10*1024*1024;
type Kind="audio"|"cover";
type RelayResponse={ok?:boolean;uploadId?:string;ETag?:string;error?:string};

class RelayError extends Error {
 constructor(message:string,readonly status:number){super(message);}
}
async function requestRelay(url:string,method:"PUT"|"POST",body?:Blob|string):Promise<RelayResponse>{
 let response:Response;
 try{
  response=await fetch(url,{method,credentials:"same-origin",cache:"no-store",
   headers:{"Content-Type":method==="PUT"?"application/octet-stream":"application/json"},
   body:body??(method==="POST"?"{}":undefined)});
 }catch{
  throw new RelayError("Secure upload connection was interrupted.",0);
 }
 const payload=await response.json().catch(()=>({error:"Storage did not return a valid response."}));
 if(!response.ok||!payload.ok)
  throw new RelayError(payload.error||"Storage transfer failed.",response.status);
 return payload as RelayResponse;
}
async function retry<T>(operation:()=>Promise<T>,label:string):Promise<T>{
 let last:unknown;
 for(let attempt=0;attempt<3;attempt++){
  try{return await operation();}
  catch(error){
   last=error;
   if(error instanceof RelayError&&[401,403,404,413].includes(error.status))break;
   if(attempt<2)await new Promise(resolve=>setTimeout(resolve,400*(2**attempt)));
  }
 }
 const message=last instanceof Error?last.message:"Unexpected storage failure.";
 throw new Error(label+" failed after retry: "+message);
}

/**
 * Upload the prepared release using R2 signed PUT when available. If the
 * browser is denied by CORS or the connection drops, use the already-existing
 * authenticated /api/billboard/upload/relay endpoint on the SAME draft.
 * It assembles the file in R2 in server-side multipart parts and verifies
 * its exact size/type before the existing finishReleaseResult is called.
 */
export async function resilientReleaseUpload(options:{
 releaseId:string;kind:Kind;uploadUrl:string;file:File;contentType:string;
 onProgress:(percent:number)=>void;onFallback:(detail:string)=>void;
}):Promise<void>{
 const {releaseId,kind,uploadUrl,file,contentType,onProgress,onFallback}=options;
 const limit=kind==="audio"?MAX_AUDIO:MAX_COVER;
 if(!file.size||file.size>limit)throw new Error("File is empty or exceeds the permitted upload size.");
 if(!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(releaseId))
  throw new Error("No valid prepared release exists for this file.");
 try{
  await directUpload(uploadUrl,file,contentType,onProgress);
  onProgress(100);
  return;
 }catch(error){
  if(error instanceof Error&&error.message==="Upload cancelled.")throw error;
  onFallback("Direct storage upload failed. Recovering through secure FACKTS transfer…");
 }

 const base="/api/billboard/upload/relay?"+new URLSearchParams({
  id:releaseId,kind,type:contentType,size:String(file.size)
 }).toString();
 const endpoint=(action:string)=>base+"&action="+action;
 const count=Math.ceil(file.size/CHUNK);
 for(let index=0;index<count;index++){
  const filePart=file.slice(index*CHUNK,Math.min(file.size,(index+1)*CHUNK));
  await retry(()=>requestRelay(base+"&index="+index,"PUT",filePart),"Upload chunk "+(index+1));
  onProgress(Math.round((index+1)/count*75));
 }
 const started=await retry(()=>requestRelay(endpoint("start"),"POST"),"Starting secure upload");
 if(!started.uploadId)throw new Error("Storage did not create an upload session.");
 const parts:{PartNumber:number;ETag:string}[]=[];
 const countParts=Math.ceil(count/2);
 for(let part=1;part<=countParts;part++){
  const result=await retry(()=>requestRelay(endpoint("part"),"POST",
   JSON.stringify({uploadId:started.uploadId,part})),"Verifying upload part "+part);
  if(!result.ETag)throw new Error("Storage did not verify upload part "+part+".");
  parts.push({PartNumber:part,ETag:result.ETag});
  onProgress(75+Math.round(part/countParts*23));
 }
 await retry(()=>requestRelay(endpoint("complete"),"POST",
  JSON.stringify({uploadId:started.uploadId,parts})),"Final verification");
 onProgress(100);
}
