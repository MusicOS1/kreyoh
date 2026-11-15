import {sameOrigin,verifyAndRecordPaystack} from "../../../../lib/paystackPayments";

export async function POST(request:Request){
  if(!sameOrigin(request))return Response.json({error:"Invalid verification origin."},{status:403});
  try{
    const body=await request.json();
    const reference=String(body?.reference||"");
    const result=await verifyAndRecordPaystack(reference);
    return Response.json(result,{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    const message=error instanceof Error?error.message:"Unable to verify payment.";
    const reconciliation=message.includes("reconciliation");
    return Response.json({error:reconciliation?"Payment needs finance-team reconciliation; do not pay again.":message},
      {status:reconciliation?503:400,headers:{"Cache-Control":"no-store"}});
  }
}
