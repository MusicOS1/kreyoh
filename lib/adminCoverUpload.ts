import {directUpload} from "./directUpload";

type UploadProgress=(percent:number)=>void;
type RelayPayload={ok:boolean;error?:string;uploadId?:string;ETag?:string};
const BYTES=3*1024*1024;
async function request(url:string,method:"PUT"|"POST",payload?:Blob|string):Promise<RelayPayload>{
 const response=await fetch(url,{
  method,credentials:"same-origin",cache:"no-store",
  headers:{"Content-Type":method==="PUT"?"application/octet-stream":"application/json"},
  body:payload??(method==="POST"?"{}":undefined)
 });
 const result=await response.json().catch(()=>({ok:false,error:"Secure upload is unavailable."}));
 if(!response.ok||!result.ok)throw Error(result.error||"Secure upload failed.");
 return result as RelayPayload;
}
export async function uploadAdminCoverWithFallback({
 releaseId,attemptId,uploadUrl,file,type,onProgress,onFallback
}:{releaseId:string;attemptId:string;uploadUrl:string;file:File;type:string;
 onProgress:UploadProgress;onFallback:()=>void}):Promise<void>{
 try{
  await directUpload(uploadUrl,file,type,onProgress);
  return;
 }catch(error){
  if(error instanceof Error&&error.message==="Upload cancelled.")throw error;
  onFallback();
 }
 const url=(action:string)=>"/api/admin/releases/cover-relay?"+new URLSearchParams({
  releaseId,attemptId,size:String(file.size),type,action
 }).toString();
 const count=Math.ceil(file.size/BYTES);
 for(let i=0;i<count;i++){
  const chunk=file.slice(i*BYTES,Math.min(file.size,(i+1)*BYTES));
  let last:unknown;
  for(let retry=0;retry<3;retry++){
   try{await request(url("")+"&index="+i,"PUT",chunk);last=null;break;}
   catch(error){last=error;}
  }
  if(last)throw last;
  onProgress(Math.round((i+1)/count*75));
 }
 const started=await request(url("start"),"POST");
 if(!started.uploadId)throw Error("Secure upload session could not be started.");
 const parts:{PartNumber:number;ETag:string}[]=[];
 for(let part=1;part<=Math.ceil(count/2);part++){
  let result:RelayPayload|undefined,last:unknown;
  for(let retry=0;retry<3;retry++){
   try{result=await request(url("part"),"POST",JSON.stringify({uploadId:started.uploadId,part}));last=null;break;}
   catch(error){last=error;}
  }
  if(last)throw last;
  if(!result?.ETag)throw Error("Secure upload was not verified.");
  parts.push({PartNumber:part,ETag:result.ETag});
  onProgress(75+Math.round(part/Math.ceil(count/2)*23));
 }
 await request(url("complete"),"POST",JSON.stringify({uploadId:started.uploadId,parts}));
 onProgress(100);
}
