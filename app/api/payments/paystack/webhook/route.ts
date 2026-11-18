import {verifyPaystackWebhook,verifyAndRecordPaystack} from "../../../../../lib/paystackPayments";

export const runtime="nodejs";

export async function POST(request:Request){
  try{
    const raw=Buffer.from(await request.arrayBuffer());
    if(raw.length>1024*256)return new Response("Event too large.",{status:413});
    if(!verifyPaystackWebhook(raw,request.headers))return new Response("Invalid signature.",{status:401});
    const event=JSON.parse(raw.toString("utf8"));
    if(event?.event!=="charge.success")return new Response("OK",{status:200});
    const reference=event?.data?.reference;
    if(typeof reference!=="string")return new Response("Invalid event.",{status:400});
    const result=await verifyAndRecordPaystack(reference);
    if(result.state==="paid"||result.state==="already_paid")return new Response("OK",{status:200});
    return new Response("Awaiting verification.",{status:503});
  }catch{
    // Retry on temporary provider/database outage. No payment is credited on error.
    return new Response("Verification unavailable.",{status:503});
  }
}
