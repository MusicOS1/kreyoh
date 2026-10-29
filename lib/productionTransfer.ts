import {PRODUCTION_PART_SIZE} from './productionPolicy';
type UploadReply={id?:string;url?:string;completed?:boolean;assetId?:string;transferComplete?:boolean;parts?:{number:number;size:number}[];error?:string};
export async function productionUploadRequest(body:Record<string,unknown>):Promise<UploadReply> {
 const response=await fetch('/api/production/uploads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const result=await response.json();if(!response.ok||result.error)throw new Error(result.error||'Storage action failed.');return result;
}
// Blob.slice bounds working memory to one 16 MiB part. Parts already observed by R2 are skipped.
export async function transferProductionFile(file:File,id:string,onProgress:(value:number)=>void,signal:AbortSignal) {
 const state=await productionUploadRequest({action:'status',id});
 if(state.completed)return state;
 if(!state.transferComplete){
  const uploaded=new Set((state.parts||[]).map(p=>p.number));
  let done=(state.parts||[]).reduce((sum,p)=>sum+p.size,0);
  onProgress(Math.floor(done/file.size*100));
  for(let offset=0,number=1;offset<file.size;offset+=PRODUCTION_PART_SIZE,number++){
   if(uploaded.has(number))continue;
   const part=file.slice(offset,Math.min(offset+PRODUCTION_PART_SIZE,file.size));
   for(let attempt=0;;attempt++){
    signal.throwIfAborted();
    try{
     const signed=await productionUploadRequest({action:'part',id,part:number});
     signal.throwIfAborted();
     await uploadPart(signed.url!,part,file.type||'application/octet-stream',loaded=>onProgress(Math.min(99,Math.floor((done+loaded)/file.size*100))),signal);
     break;
    }catch(error){if(signal.aborted||attempt>=2)throw error;}
   }
   done+=part.size;onProgress(Math.min(99,Math.floor(done/file.size*100)));
  }
 }
 signal.throwIfAborted();
 const result=await productionUploadRequest({action:'complete',id});onProgress(100);return result;
}
function uploadPart(url:string,blob:Blob,type:string,progress:(loaded:number)=>void,signal:AbortSignal):Promise<void> {
 return new Promise((resolve,reject)=>{
  const request=new XMLHttpRequest();const abort=()=>request.abort();
  const finish=(error?:Error)=>{signal.removeEventListener('abort',abort);error?reject(error):resolve();};
  request.open('PUT',url);request.timeout=15*60*1000;request.setRequestHeader('Content-Type',type);
  request.upload.onprogress=e=>progress(e.loaded);
  request.onload=()=>finish(request.status>=200&&request.status<300?undefined:new Error(`Storage transfer failed (HTTP ${request.status}). Resume to retry the unfinished part.`));
  request.onerror=()=>finish(new Error('Storage could not be reached. Check your connection and storage CORS, then resume.'));
  request.ontimeout=()=>finish(new Error('Upload part timed out. Resume on a stable connection.'));
  request.onabort=()=>finish(new Error('Transfer paused. Resume to continue the remaining parts.'));
  signal.addEventListener('abort',abort,{once:true});if(signal.aborted){finish(new Error('Transfer paused.'));return;}
  request.send(blob);
 });
}

export function clearProductionRecovery(trackId:string) {
 try{
  localStorage.removeItem('fackts-production-transfer-v1:'+trackId);
  for(const key of Object.keys(localStorage)){
   if(!key.startsWith('fackts-production-intake-v1:'))continue;
   try{if(JSON.parse(localStorage.getItem(key)||'null')?.trackId===trackId)localStorage.removeItem(key);}catch{}
  }
 }catch{}
}
