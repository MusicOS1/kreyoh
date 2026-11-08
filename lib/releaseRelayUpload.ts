"use client";
import {directUpload} from "./directUpload";

const RELAY_CHUNK_BYTES=3*1024*1024;
type Kind="audio"|"cover";
type RelayResponse={ok:boolean;error?:string;uploadId?:string;ETag?:string;
 chunks?:number[];total?:number;complete?:boolean};
class UploadRelayError extends Error{
 constructor(message:string,readonly status:number){super(message);}
}
function relayUrl(id:string,kind:Kind,size:number,type:string,action:string){
 const params=new URLSearchParams({id,kind,size:String(size),type,action});
 return "/api/billboard/upload/relay?"+params.toString();
}
async function relayRequest(url:string,method:"GET"|"PUT"|"POST",body?:Blob|string):Promise<RelayResponse>{
 let response:Response;
 try{
  response=await fetch(url,{
   method,credentials:"same-origin",cache:"no-store",
   ...(method==="GET"?{}:{headers:{"Content-Type":method==="PUT"?"application/octet-stream":"application/json"}}),
   body:body??(method==="POST"?"{}":undefined)
  });
 }catch{throw new UploadRelayError("The secure transfer connection was interrupted.",0);}
 const result=await response.json().catch(()=>({ok:false,error:"Upload service unavailable."})) as RelayResponse;
 if(!response.ok||!result.ok)
  throw new UploadRelayError(result.error||"Storage transfer rejected the request.",response.status);
 return result;
}
async function attempt<T>(task:()=>Promise<T>,label:string):Promise<T>{
 let last:unknown;
 for(let i=0;i<3;i++){
  try{return await task();}
  catch(error){
   last=error;
   if(error instanceof UploadRelayError&&[400,401,403,404,413].includes(error.status))break;
   if(i<2)await new Promise(resolve=>setTimeout(resolve,[350,800][i]));
  }
 }
 throw new Error(label+": "+(last instanceof Error?last.message:"Unexpected storage failure."));
}
async function relayUpload(id:string,kind:Kind,file:File,type:string,label:string,
 progress:(message:string)=>void){
 const count=Math.ceil(file.size/RELAY_CHUNK_BYTES);
 const root=relayUrl(id,kind,file.size,type,"");
 const status=await attempt(()=>relayRequest(root,"GET"),"Checking saved upload progress");
 if(status.complete){
  progress("Recovered verified "+label+" from storage · 100%");
  return;
 }
 // Existing R2 chunks can survive a page reload; never send them twice.
 const saved=new Set((status.chunks||[]).filter(x=>Number.isInteger(x)&&x>=0&&x<count));
 const recovered=saved.size;
 if(recovered)progress("Found "+recovered+" saved chunks for "+label+". Resuming upload…");
 for(let index=0;index<count;index++){
  if(!saved.has(index)){
   const chunk=file.slice(index*RELAY_CHUNK_BYTES,Math.min(file.size,(index+1)*RELAY_CHUNK_BYTES));
   await attempt(()=>relayRequest(root+"&index="+index,"PUT",chunk),
    "Uploading "+label+" chunk "+(index+1)+"/"+count);
  }
  progress("Secure upload: "+label+" "+Math.round((index+1)/count*75)+"%");
 }
 // Multipart assembly requires >=5 MiB parts. Two 3 MiB chunks per part
 // preserve compatibility with Vercel's 4.5 MiB request-body limit.
 const started=await attempt(()=>relayRequest(relayUrl(id,kind,file.size,type,"start"),"POST"),
  "Creating secure upload");
 if(!started.uploadId)throw Error("Secure storage did not create an upload session.");
 const uploadId=started.uploadId;
 const totalParts=Math.ceil(count/2);
 const parts:{PartNumber:number;ETag:string}[]=[];
 for(let part=1;part<=totalParts;part++){
  const result=await attempt(()=>relayRequest(relayUrl(id,kind,file.size,type,"part"),
   "POST",JSON.stringify({uploadId,part})),"Verifying "+label+" part "+part);
  if(!result.ETag)throw Error("Could not verify "+label+" part "+part+".");
  parts.push({PartNumber:part,ETag:result.ETag});
  progress("Verifying "+label+"… "+(75+Math.round(part/totalParts*23))+"%");
 }
 try{
  await attempt(()=>relayRequest(relayUrl(id,kind,file.size,type,"complete"),
   "POST",JSON.stringify({uploadId,parts})),"Completing secure upload");
 }catch(error){
  // Completion may succeed in R2 even if the last network response was lost.
  // Verify the object before asking the artist to retry.
  const result=await relayRequest(root,"GET").catch(()=>null);
  if(!result?.complete)throw error;
 }
 progress("Uploaded "+label+" · 100%");
}

/** Preserve the current direct-to-R2 route for speed; recover through
 * the authenticated R2 relay on blocked/expired requests. On restored
 * uploads prefer the saved relay chunks over repeating a direct PUT.
 */
export async function uploadReleaseFile(
 id:string,kind:Kind,url:string,file:File,type:string,label:string,
 progress:(message:string)=>void,
 preferResume=false
){
 if(!file.size||file.size>(kind==="audio"?150:10)*1024*1024)
  throw Error("Choose a nonempty file within the supported size limit.");
 if(!preferResume){
  progress("Uploading "+label+"…");
  try{
   await directUpload(url,file,type,percent=>progress("Uploading "+label+"… "+percent+"%"));
   return;
  }catch(error){
   if(error instanceof Error&&error.message==="Upload cancelled.")throw error;
   progress("Direct storage unavailable. Switching to secure FACKTS upload for "+label+"…");
  }
 }
 await relayUpload(id,kind,file,type,label,progress);
}
