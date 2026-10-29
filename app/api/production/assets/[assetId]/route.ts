import {productionAccess} from '../../../../../lib/productionAccess';
import {createR2PresignedUrl} from '../../../../../lib/r2';
export async function GET(_request:Request,{params}:{params:Promise<{assetId:string}>}){
 const headers={'Cache-Control':'private, no-store'};
 try{
  const {assetId}=await params;const {admin,user,project}=await productionAccess();
  const {data:a,error}=await admin.from('project_assets').select('entity_id,bucket_id,storage_path,mime_type,visibility,uploaded_by').eq('id',assetId).eq('project_id',project.id).eq('entity_type','track').maybeSingle();
  if(error||!a||!a.mime_type?.startsWith('audio/')||a.visibility==='private'&&a.uploaded_by!==user.id)return new Response('Version unavailable.',{status:404,headers});
  const {data:track}=await admin.from('tracks').select('id').eq('id',a.entity_id).eq('project_id',project.id).maybeSingle();
  if(!track)return new Response('Version unavailable.',{status:404,headers});
  let url:string;
  if(a.bucket_id==='r2'){
   if(!a.storage_path.startsWith(`${project.id}/tracks/${a.entity_id}/`)||a.storage_path.includes('..'))throw new Error('Invalid file scope.');
   url=await createR2PresignedUrl('GET',a.storage_path,900);
  }else{const {data,error}=await admin.storage.from(a.bucket_id).createSignedUrl(a.storage_path,900);if(error||!data?.signedUrl)throw new Error('File unavailable.');url=data.signedUrl;}
  return new Response(null,{status:307,headers:{...headers,Location:url}});
 }catch{return new Response('Project audio unavailable.',{status:403,headers});}
}
