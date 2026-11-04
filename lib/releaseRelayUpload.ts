import {directUpload} from './directUpload';

const RELAY_CHUNK_BYTES=3*1024*1024;
type Kind='audio'|'cover';
type RelayResponse={ok:boolean;error?:string;uploadId?:string;ETag?:string};

async function relayRequest(url:string,method:'PUT'|'POST',body?:Blob|string):Promise<RelayResponse>{
 const response=await fetch(url,{
  method,credentials:'same-origin',
  headers:{'Content-Type':method==='PUT'?'application/octet-stream':'application/json'},
  body:body ?? (method==='POST'?'{}':undefined),
  cache:'no-store',
 });
 const result=await response.json().catch(()=>({ok:false,error:'Upload service unavailable.'})) as RelayResponse;
 if(!response.ok||!result.ok)throw Error(result.error||'The transfer was interrupted.');
 return result;
}
function relayUrl(id:string,kind:Kind,size:number,type:string,action:string){
 const params=new URLSearchParams({id,kind,size:String(size),type,action});
 return '/api/billboard/upload/relay?'+params.toString();
}
async function relayUpload(id:string,kind:Kind,file:File,type:string,label:string,progress:(value:string)=>void){
 const count=Math.ceil(file.size/RELAY_CHUNK_BYTES),parts:{PartNumber:number;ETag:string}[]=[];
 const root=relayUrl(id,kind,file.size,type,'');
 for(let index=0;index<count;index++){
  const chunk=file.slice(index*RELAY_CHUNK_BYTES,Math.min(file.size,(index+1)*RELAY_CHUNK_BYTES));
  let error:unknown;
  for(let attempt=0;attempt<3;attempt++){
   try{
    await relayRequest(root+'&index='+index,'PUT',chunk);
    error=null;break;
   }catch(cause){error=cause;}
  }
  if(error)throw error;
  progress('Secure upload: '+label+' '+Math.round((index+1)/count*75)+'%');
 }
 progress('Verifying '+label+'…');
 const started=await relayRequest(relayUrl(id,kind,file.size,type,'start'),'POST');
 if(!started.uploadId)throw Error('Upload session could not be created.');
 const uploadId=started.uploadId;
 const totalParts=Math.ceil(count/2);
 for(let part=1;part<=totalParts;part++){
  let result:RelayResponse|undefined;
  let error:unknown;
  for(let attempt=0;attempt<3;attempt++){
   try{
    result=await relayRequest(relayUrl(id,kind,file.size,type,'part'),'POST',JSON.stringify({uploadId,part}));
    error=null;break;
   }catch(cause){error=cause;}
  }
  if(error)throw error;
  if(!result?.ETag)throw Error('Could not confirm the uploaded file.');
  parts.push({PartNumber:part,ETag:result.ETag});
  progress('Verifying '+label+'… '+(75+Math.round(part/totalParts*23))+'%');
 }
 await relayRequest(relayUrl(id,kind,file.size,type,'complete'),'POST',JSON.stringify({uploadId,parts}));
 progress('Uploaded '+label+' · 100%');
}

export async function uploadReleaseFile(
 id:string,kind:Kind,url:string,file:File,type:string,label:string,
 progress:(message:string)=>void
){
 progress('Uploading '+label+'…');
 try{
  await directUpload(url,file,type,percent=>progress('Uploading '+label+'… '+percent+'%'));
  return;
 }catch(error){
  if(error instanceof Error && error.message==='Upload cancelled.')throw error;
  progress('Direct storage unavailable. Switching to secure FACKTS upload for '+label+'…');
 }
 await relayUpload(id,kind,file,type,label,progress);
}
