import { productionAccess, assertProductionOrigin, productionJson } from '../../../../lib/productionAccess';
export async function POST(request:Request) {
  try {
    assertProductionOrigin(request);
    const body=await productionJson(request);
    if(!['submit','approve','changes_requested','signoff','track_stage','project_stage','attendance'].includes(body.action))throw new Error('Invalid production action.');
    const {admin,user,project}=await productionAccess();
    const {data,error}=await admin.rpc('production_mutate',{p_project:project.id,p_actor:user.id,p_action:body.action,p_target:body.target,p_revision:body.revision??0,p_data:body.data||{},p_request:body.requestId});
    if(error)throw new Error(error.code==='PGRST202'?'Production workflow setup is pending in this environment.':error.message);
    return Response.json(data,{headers:{'Cache-Control':'private, no-store'}});
  }catch(cause){return Response.json({error:cause instanceof Error?cause.message:'Production action unavailable.'},{status:400,headers:{'Cache-Control':'private, no-store'}});}
}

export async function GET(request:Request) {
 const headers={'Cache-Control':'private, no-store'};
 try {
  const {searchParams}=new URL(request.url),assetId=searchParams.get('asset'),after=searchParams.get('after'),afterId=searchParams.get('after_id');
  const uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
  if(!assetId||!uuid.test(assetId)||after&&(!/^[0-9T:.Z+-]{15,40}$/.test(after)||!Number.isFinite(Date.parse(after)))||afterId&&!uuid.test(afterId))throw new Error('Invalid history request.');
  const {admin,user,project}=await productionAccess();
  const {data:asset,error:assetError}=await admin.from('project_assets').select('id,visibility,uploaded_by').eq('id',assetId).eq('project_id',project.id).eq('entity_type','track').maybeSingle();
  if(assetError||!asset||asset.visibility==='private'&&asset.uploaded_by!==user.id)throw new Error('Version unavailable in your project.');
  const query=admin.from('platform_events').select('id,event_name,user_id,metadata,created_at').eq('project_id',project.id).eq('entity_type','asset').eq('entity_id',assetId).in('event_name',['production_submit','production_approve','production_changes_requested']).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(31);
  if(after&&afterId)query.or(`created_at.lt.${after},and(created_at.eq.${after},id.lt.${afterId})`);
  const {data,error}=await query;if(error)throw new Error('History could not be loaded. Retry this version.');
  const rows=(data||[]).slice(0,30),last=rows.at(-1);
  return Response.json({rows,next:(data||[]).length>30&&last?{at:last.created_at,id:last.id}:null},{headers});
 }catch(cause){return Response.json({error:cause instanceof Error?cause.message:'History unavailable.'},{status:400,headers});}
}
