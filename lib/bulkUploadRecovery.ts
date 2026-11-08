"use client";

/** Only draft identifiers and upload metadata are retained locally.
 * Audio and artwork bytes never enter localStorage.
 */
const KEY="fm:bulk-upload-recovery:v1";
const MAX_AGE_MS=30*24*60*60*1000;
export type SavedBulkUpload={
 draftId:string;fileName:string;fileSize:number;fileModified:number;
 fingerprint:string;title:string;artist:string;number:number;
 collection:string;defaultArtist:string;credits:string;genre:string;
 releaseDate:string;coverExpected:boolean;coverName:string;coverSize:number;coverType:string;
 audioDone:boolean;coverDone:boolean;updatedAt:number;
};
export function readBulkUploadRecovery():SavedBulkUpload[]{
 try{
  const value=JSON.parse(window.localStorage.getItem(KEY)||"[]");
  if(!Array.isArray(value))return [];
  const now=Date.now();
  return value.filter((item:SavedBulkUpload)=>
   item&&typeof item.draftId==="string"&&
   /^[a-f0-9-]{36}$/i.test(item.draftId)&&
   typeof item.fileName==="string"&&item.fileName.length<300&&
   Number.isFinite(item.fileSize)&&item.fileSize>0&&item.fileSize<=150*1024*1024&&
   typeof item.fingerprint==="string"&&/^[a-f0-9]{64}$/i.test(item.fingerprint)&&
   typeof item.updatedAt==="number"&&now-item.updatedAt<=MAX_AGE_MS&&now>=item.updatedAt
  ).slice(-100);
 }catch{return [];}
}
export function saveBulkUploadRecovery(item:SavedBulkUpload):void{
 try{
  const items=readBulkUploadRecovery().filter(old=>old.draftId!==item.draftId);
  items.push({...item,updatedAt:Date.now()});
  window.localStorage.setItem(KEY,JSON.stringify(items.slice(-100)));
 }catch{
  // Private browsing can disable storage. Upload still works in this tab.
  console.warn("bulk-upload-recovery-storage-unavailable");
 }
}
export function removeBulkUploadRecovery(id:string):void{
 try{
  const rest=readBulkUploadRecovery().filter(item=>item.draftId!==id);
  window.localStorage.setItem(KEY,JSON.stringify(rest));
 }catch{console.warn("bulk-upload-recovery-storage-unavailable");}
}
export function findBulkUploadRecovery(file:File,saved:SavedBulkUpload[],used:Set<string>){
 return saved.find(item=>!used.has(item.draftId)&&item.fileName===file.name&&
  item.fileSize===file.size&&item.fileModified===file.lastModified)||null;
}
/** SHA-256 over the sequence of individual chunk SHA-256 digests.
 * Reads at most 3 MiB at a time, covering every byte without holding
 * a full 150 MiB recording in memory.
 */
export async function fingerprintBulkFile(file:File):Promise<string>{
 if(!globalThis.crypto?.subtle)throw Error("Secure file verification is unavailable in this browser.");
 const pieces:Uint8Array[]=[];
 const size=3*1024*1024;
 for(let offset=0;offset<file.size;offset+=size){
  const bytes=await file.slice(offset,Math.min(file.size,offset+size)).arrayBuffer();
  pieces.push(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)));
 }
 const joined=new Uint8Array(pieces.length*32);
 for(let i=0;i<pieces.length;i++)joined.set(pieces[i],i*32);
 const result=new Uint8Array(await crypto.subtle.digest("SHA-256",joined));
 return Array.from(result).map(byte=>byte.toString(16).padStart(2,"0")).join("");
}
