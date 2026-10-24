import {chart} from "../../../lib/community";
export const dynamic="force-dynamic";
// Only published, currently playable releases. Private project queues never use this endpoint.
export async function GET() {
  try {return Response.json({releases:await chart()},{headers:{"Cache-Control":"private, no-store"}});}
  catch {return Response.json({error:"Music is temporarily unavailable."},{status:503,headers:{"Cache-Control":"no-store"}});}
}
