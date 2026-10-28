import {mockSupabase} from './mock-supabase.mjs';
import {pid,lead,engineer,artist,outsider} from './production-database.mjs';
export function productionRest(db){
 const users=[[lead,'lead'],[engineer,'engineer'],[artist,'artist'],[outsider,'outsider']].map(([id,name])=>({id,aud:'authenticated',role:'authenticated',email:name+'@example.test',created_at:new Date().toISOString(),email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email',providers:['email']},user_metadata:{full_name:'Test '+name,creator_types:['Fan']}}));
 const tables=new Set(['profiles','projects','project_members','member_roles','roles','tracks','project_assets','project_tasks','platform_events','activity_log','notifications','track_contributors','track_split_plans','track_splits','track_rights_checks','track_operational_issues','studio_sessions','session_participants','production_uploads','beats','beat_claims','session_contributions','project_budgets','project_expenses','revenue_records','commercial_opportunities','project_membership_accounts','project_membership_transactions','project_updates','project_documents','beat_assignments','beat_interests']);
 let rejectRegistration=false,sessionOutage=false;
 function matches(row,url){return [...url.searchParams].every(([key,value])=>{
  if(['select','order','limit','offset','on_conflict'].includes(key))return true;
  if(key==='or')return row.visibility==='project'||row.visibility==='public'||value.includes('uploaded_by.eq.'+row.uploaded_by);
  if(value.startsWith('eq.'))return String(row[key])===value.slice(3);
  if(value.startsWith('neq.'))return String(row[key])!==value.slice(4);
  if(value.startsWith('in.('))return value.slice(4,-1).split(',').includes(String(row[key]));
  if(value.startsWith('like.'))return String(row[key]).startsWith(value.slice(5).replace('%',''));
  return true;
 });}
 const mock=mockSupabase({users,handleRest:async({req,res,url,body,send,table})=>{
  if(!url.pathname.startsWith('/rest/v1/'))return false;
  if(url.pathname.includes('/rpc/production_')){
   const b=JSON.parse(body);try{
    if(table==='production_mutate'&&b.p_action==='register_upload'&&rejectRegistration){rejectRegistration=false;send(500,{message:'Isolated registration outage',code:'XX000'});return true;}
    const result=table==='production_readiness'?await db.query('select production_readiness($1) result',[b.p_track]):await db.query('select production_mutate($1,$2,$3,$4,$5,$6,$7) result',[b.p_project,b.p_actor,b.p_action,b.p_target,b.p_revision,b.p_data,b.p_request]);
    send(200,result.rows[0].result);
   }catch(error){send(400,{message:error.message,code:error.code||'P0001'});}return true;
  }
  if(['control_room_admins','professional_applications','professional_application_events'].includes(table)){send(200,req.headers.accept?.includes('application/vnd.pgrst.object+json')?null:[]);return true;}
  if(!tables.has(table))return false;
  if(!(await db.query('select to_regclass($1) name',[table])).rows[0].name){send(200,req.headers.accept?.includes('application/vnd.pgrst.object+json')?null:[]);return true;}
  if(table==='studio_sessions'&&(sessionOutage||url.searchParams.get('select')?.includes('session_participants(*,profiles('))){send(300,{message:'Ambiguous profiles relationship',code:'PGRST201'});return true;}
  let rows=(await db.query('select * from '+table)).rows;
  if(req.method==='POST'){
   const payload=JSON.parse(body);rows=[];
   for(const row of Array.isArray(payload)?payload:[payload]){
    const columns=Object.keys(row);if(columns.some(c=>!/^\w+$/.test(c)))throw new Error('Invalid fixture column');
    try{const result=await db.query(`insert into ${table}(${columns.join(',')})values(${columns.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,Object.values(row));rows.push(...result.rows);}catch(error){send(400,{message:error.message,code:error.code});return true;}
   }
  }else if(req.method==='PATCH'){
   const row=JSON.parse(body);const selected=rows.filter(r=>matches(r,url));rows=[];
   for(const item of selected){const columns=Object.keys(row);const result=await db.query(`update ${table} set ${columns.map((c,i)=>c+'=$'+(i+1)).join(',')} where id=$${columns.length+1} returning *`,[...Object.values(row),item.id]);rows.push(...result.rows);}
  }else rows=rows.filter(r=>matches(r,url));
  const select=url.searchParams.get('select')||'';
  const profiles=(await db.query('select * from profiles')).rows;const profile=id=>profiles.find(p=>p.id===id)||{full_name:'Fixture member'};
  const trackRows=(await db.query('select * from tracks')).rows;const contributors=(await db.query('select * from track_contributors')).rows;const rights=(await db.query('select * from track_rights_checks')).rows;
  if(table==='tracks')rows=rows.map(r=>({...r,track_contributors:contributors.filter(c=>c.track_id===r.id).map(c=>({...c,profiles:profile(c.user_id)})),track_rights_checks:rights.filter(c=>c.track_id===r.id)}));
  if(table==='track_contributors')rows=rows.map(r=>({...r,tracks:trackRows.find(t=>t.id===r.track_id)}));
  const members=(await db.query('select * from project_members')).rows,roles=(await db.query('select * from roles')).rows,grants=(await db.query('select * from member_roles')).rows;
  const awaitedProject=(await db.query('select * from projects where id=$1',[pid])).rows[0];
  const assignments=id=>grants.filter(g=>g.project_member_id===id).map(g=>({...g,roles:roles.find(r=>r.id===g.role_id)}));
  if(table==='project_members')rows=rows.map(r=>({...r,projects:(awaitedProject||{id:pid,name:'Isolated production acceptance',code:'LOCAL',status:'active'}),profiles:profile(r.user_id),member_roles:assignments(r.id)}));
  if(table==='member_roles')rows=rows.map(g=>({...g,roles:roles.find(r=>r.id===g.role_id)}));
  if(table==='studio_sessions'){const sessionWork=(await db.query('select * from project_tasks')).rows;const hasContributions=(await db.query("select to_regclass('session_contributions') name")).rows[0].name;const sessionContributions=hasContributions?(await db.query('select * from session_contributions')).rows:[];const participants=(await db.query('select * from session_participants')).rows;rows=rows.map(r=>({...r,tracks:trackRows.find(t=>t.id===r.track_id),session_participants:participants.filter(p=>p.session_id===r.id).map(p=>({...p,profiles:profile(p.user_id)})),project_tasks:sessionWork.filter(t=>t.session_id===r.id).map(t=>({...t,profiles:profile(t.assignee_id)})),session_contributions:sessionContributions.filter(c=>c.session_id===r.id).map(c=>({...c,profiles:profile(c.contributor_id),tracks:trackRows.find(t=>t.id===c.track_id)}))}));}
  if(table==='profiles')rows=rows.map(r=>({...r,email:users.find(u=>u.id===r.id)?.email,profile_visibility:'project'}));
  const order=url.searchParams.get('order');if(order){const [key,direction]=order.split('.');rows.sort((a,b)=>String(a[key]||'').localeCompare(String(b[key]||''))*(direction==='desc'?-1:1));}
  const limit=Number(url.searchParams.get('limit'));if(limit)rows=rows.slice(0,limit);
  if(req.method==='HEAD'){res.setHeader('Content-Range','*/'+rows.length);send(200);return true;}
  send(200,req.headers.accept?.includes('application/vnd.pgrst.object+json')?rows[0]||null:rows);return true;
 }});
 return {...mock,users,setSessionOutage(value){sessionOutage=value;},failNextRegistration(){rejectRegistration=true;}};
}
