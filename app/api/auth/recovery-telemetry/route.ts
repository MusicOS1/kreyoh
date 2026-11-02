import {NextResponse} from "next/server";
import {createAdminClient} from "../../../../lib/supabase/admin";

export const dynamic="force-dynamic";

// Unauthenticated password-reset pages must be observable too. This endpoint
// accepts event categories only, never tokens, email addresses or raw errors.
const events=new Set([
 "password_recovery_verified","password_recovery_failed",
 "password_change_completed","password_change_failed"
]);
const reasons=new Set([
 "link_incomplete","link_expired","link_invalid","session_unavailable",
 "network","timeout","service_unavailable","password_rejected","unknown"
]);
const stages=new Set(["recovery_link","set_password"]);
export async function POST(request:Request){
 const origin=request.headers.get("origin");
 if(!origin||origin!==new URL(request.url).origin)return NextResponse.json({accepted:false},{status:403});
 if(Number(request.headers.get("content-length")||0)>512)return NextResponse.json({accepted:false},{status:413});
 let body:unknown;
 try{body=await request.json();}catch{return NextResponse.json({accepted:false},{status:400});}
 if(!body||typeof body!=="object")return NextResponse.json({accepted:false},{status:400});
 const data=body as Record<string,unknown>;
 const event=typeof data.event==="string"?data.event:"";
 const reason=typeof data.reason==="string"?data.reason:"unknown";
 const stage=typeof data.stage==="string"?data.stage:"";
 if(!events.has(event)||!stages.has(stage)||!reasons.has(reason))return NextResponse.json({accepted:false},{status:400});
 if((stage==="recovery_link")!==(event.startsWith("password_recovery_")))
   return NextResponse.json({accepted:false},{status:400});
 const admin=createAdminClient();
 // Global best-effort intake cap. Client claims are labeled rather than
 // represented as authoritative confirmations.
 const recent=await admin.from("platform_events").select("id",{count:"exact",head:true})
  .eq("category","authentication").contains("metadata",{source:"client_reported_recovery"})
  .gte("created_at",new Date(Date.now()-60_000).toISOString());
 if(recent.error)return NextResponse.json({accepted:false},{status:503});
 if((recent.count||0)>=60)return NextResponse.json({accepted:false},{status:429});
 const {error}=await admin.from("platform_events").insert({
  event_name:event,category:"authentication",user_id:null,
  metadata:{source:"client_reported_recovery",surface:stage,reason,diagnostics_version:2}
 });
 if(error)return NextResponse.json({accepted:false},{status:503});
 return NextResponse.json({accepted:true},{headers:{"Cache-Control":"no-store"}});
}
