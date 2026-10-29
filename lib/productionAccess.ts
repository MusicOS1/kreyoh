import 'server-only';
import { getWorkspace, hasAnyRole } from './workspace';
import { PRODUCTION_FILE_ROLES } from './productionPolicy';
export async function productionAccess(trackId?: string, files = false) {
  const workspace=await getWorkspace();
  if (!workspace.project || !workspace.membership) throw new Error('Active project membership required.');
  if (files && !hasAnyRole(workspace.roles,PRODUCTION_FILE_ROLES)) throw new Error('Your project assignment cannot upload production files.');
  if (trackId) {
    const {data,error}=await workspace.admin.from('tracks').select('id').eq('id',trackId).eq('project_id',workspace.project.id).maybeSingle();
    if (error || !data) throw new Error('Track not found in this project.');
  }
  return {...workspace,project:workspace.project};
}
export function assertProductionOrigin(request: Request) {
  const origin=request.headers.get('origin');
  const host=request.headers.get('host');
  if (!origin || !host || new URL(origin).host !== host || !['http:','https:'].includes(new URL(origin).protocol)) throw new Error('Open this action from your FACKTS Music workspace.');
}

export async function productionJson(request:Request,limit=12000) {
 const reader=request.body?.getReader();if(!reader)throw new Error('Missing request.');
 const chunks:Uint8Array[]=[];let size=0;
 while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new Error('The production request is too large.');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 return JSON.parse(new TextDecoder().decode(bytes));
}
