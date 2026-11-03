import {NextResponse} from "next/server";
import {createAdminClient} from "../../../../lib/supabase/admin";
import {cleanPublicName,validatePublicName} from "../../../../lib/publicName";
export const dynamic="force-dynamic";

/** Public availability returns no account details or personal information. */
export async function GET(request:Request){
 const url=new URL(request.url);
 const name=cleanPublicName(url.searchParams.get("name")||"");
 const error=validatePublicName(name);
 const headers={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
 if(error)return NextResponse.json({available:false,error},{status:400,headers});
 try{
  const {data,error:dbError}=await createAdminClient().rpc("fackts_public_name_available",{
   candidate:name,
   excluded_profile_id:null
  });
  if(dbError)throw dbError;
  return NextResponse.json({available:data===true},{headers});
 }catch(error){
  console.error("Public name availability lookup failed",error);
  return NextResponse.json({available:false,error:"Name availability is temporarily unavailable."},{status:503,headers});
 }
}
