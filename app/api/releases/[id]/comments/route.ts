import {NextResponse} from "next/server";
import {listReleaseComments} from "../../../../release-comments/actions";
import {uuidPattern} from "../../../../../lib/community";

// Public, read-only comments endpoint. Published-release verification and
// sanitized author display fields remain in the server-side comments service.
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!uuidPattern.test(id))return NextResponse.json({ok:false,error:"Invalid song."},{status:400,headers:{"Cache-Control":"no-store"}});
 const result=await listReleaseComments(id);
 return NextResponse.json(result,{status:result.ok?200:503,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
}
