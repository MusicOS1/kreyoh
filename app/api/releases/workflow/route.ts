import {assertProductionOrigin,productionJson} from '../../../../lib/productionAccess';
import {releaseCommand} from '../../../../lib/releaseWorkflow';
export async function POST(request:Request){
 const headers={'Cache-Control':'private, no-store'};
 try{assertProductionOrigin(request);const input=await productionJson(request,14000);return Response.json(await releaseCommand(input),{headers});}
 catch(error){return Response.json({error:error instanceof Error?error.message:'Release action failed.'},{status:400,headers});}
}
