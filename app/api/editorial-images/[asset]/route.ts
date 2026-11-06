import {createAdminClient} from "../../../../lib/supabase/admin";
import {EDITORIAL_IMAGE_BUCKET,editorialImageStoragePath} from "../../../../lib/editorialImages";

const headers={"Cache-Control":"private, no-store"};
export async function GET(_request:Request,{params}:{params:Promise<{asset:string}>}){
 const {asset}=await params;
 const path=editorialImageStoragePath("/api/editorial-images/"+asset);
 if(!path)return new Response("Not found",{status:404,headers});
 try{
  const {data,error}=await createAdminClient().storage.from(EDITORIAL_IMAGE_BUCKET).createSignedUrl(path,300);
  if(error||!data?.signedUrl)return new Response("Picture unavailable",{status:404,headers});
  return new Response(null,{status:307,headers:{...headers,Location:data.signedUrl}});
 }catch{
  return new Response("Picture temporarily unavailable",{status:503,headers});
 }
}
