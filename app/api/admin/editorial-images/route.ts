import {requireControlRoomPermission} from "../../../../lib/controlRoom";
import {createAdminClient} from "../../../../lib/supabase/admin";
import {EDITORIAL_IMAGE_BUCKET,EDITORIAL_IMAGE_MAX_BYTES} from "../../../../lib/editorialImages";

const EXTENSIONS:Record<string,string>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
const headers={"Cache-Control":"private, no-store"};
export async function POST(request:Request){
 const origin=request.headers.get("origin");
 if(request.headers.get("sec-fetch-site")==="cross-site"||(origin&&origin!==new URL(request.url).origin))
  return Response.json({ok:false,error:"Invalid request origin."},{status:403,headers});
 try{
  await requireControlRoomPermission("music");
  const payload=await request.json();
  const type=typeof payload?.type==="string"?payload.type:"";
  const size=payload?.size;
  if(!EXTENSIONS[type]||!Number.isSafeInteger(size)||size<=0||size>EDITORIAL_IMAGE_MAX_BYTES)
   return Response.json({ok:false,error:"Choose a JPG, PNG or WebP picture up to 12 MB."},{status:400,headers});
  const asset=`${crypto.randomUUID()}.${EXTENSIONS[type]}`;
  const path=`editorial/${asset}`;
  const {data,error}=await createAdminClient().storage.from(EDITORIAL_IMAGE_BUCKET).createSignedUploadUrl(path);
  if(error||!data)throw Error(error?.message||"Could not prepare picture upload.");
  return Response.json({ok:true,path,token:data.token,imageUrl:`/api/editorial-images/${asset}`},{headers});
 }catch(error){
  console.error("editorial-image-prepare",error);
  return Response.json({ok:false,error:"Picture upload could not be prepared. Check your music admin access."},{status:403,headers});
 }
}
