// Isolated local fixture: no production credentials, users, email or media services.
import http from 'node:http';
import {createHmac} from 'node:crypto';
export const userId='11111111-1111-4111-8111-111111111111';
export const releaseId='22222222-2222-4222-8222-222222222222';
export const secondId='33333333-3333-4333-8333-333333333333';
const user={id:userId,aud:'authenticated',role:'authenticated',email:'listener@example.test',email_confirmed_at:new Date().toISOString(),created_at:new Date().toISOString(),app_metadata:{provider:'email',providers:['email']},user_metadata:{full_name:'Test Listener',creator_types:['Fan']}};
function token(){const b=v=>Buffer.from(JSON.stringify(v)).toString('base64url');const head=b({alg:'HS256',typ:'JWT'}),payload=b({sub:userId,aud:'authenticated',role:'authenticated',email:user.email,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,session_id:'44444444-4444-4444-8444-444444444444'});return `${head}.${payload}.${createHmac('sha256','local-test-only').update(head+'.'+payload).digest('base64url')}`;}
export function mockSupabase(){
 const state={heroCovers:false,externalArtist:false,comments:[],messages:[],blocks:[],conversation:false,publicArtist:false,library:[],revoked:false,outage:false,refreshes:0,creator:false,hasProject:false,admin:false,types:null,roles:null,documents:[],files:[],requests:[]};
 const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');let body='';for await(const chunk of req)body+=chunk;
  res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','*');res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,DELETE,HEAD,OPTIONS');
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(data===undefined?'':JSON.stringify(data));};
  if(req.method==='OPTIONS')return send(200,{});
  state.requests.push({path:url.pathname,method:req.method});
  if(url.pathname.startsWith('/auth/')){
   if(state.outage)return send(503,{message:'Temporary test outage'});
   if(url.pathname.endsWith('/signup'))return send(200,{...user,email_confirmed_at:null,identities:[]});
   if(url.pathname.endsWith('/logout')){state.revoked=true;return send(204);}
   if(url.pathname.endsWith('/user'))return state.revoked?send(401,{code:'session_not_found',message:'Session revoked'}):send(200,user);
   if(url.pathname.endsWith('/token')||url.pathname.endsWith('/verify')){
    if(url.searchParams.get('grant_type')==='refresh_token'){state.refreshes++;if(state.revoked)return send(400,{code:'refresh_token_not_found',message:'Invalid refresh token'});}else state.revoked=false;
    return send(200,{access_token:token(),refresh_token:'local-refresh-token',token_type:'bearer',expires_in:3600,user});
   }
   return send(200,{});
  }
  if(url.pathname.startsWith('/storage/v1/object/sign/')&&req.method==='POST')return send(200,{signedURL:'/object/sign/project-documents/local-fixture.txt?token=fixture'});
  if(url.pathname.startsWith('/storage/v1/object/sign/')&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/plain','Content-Disposition':'attachment; filename="FixtureBrief.txt"'});return res.end('Synthetic project brief.');}
  if(url.pathname.startsWith('/storage/v1/object/project-documents/')&&req.method==='POST'){state.files.push({path:url.pathname,size:Buffer.byteLength(body)});return send(200,{Key:url.pathname,Id:'88888888-8888-4888-8888-888888888888'});}
  const table=url.pathname.split('/').pop();
  if(url.pathname==='/rest/v1/rpc/send_member_message'&&req.method==='POST'){
   const input=JSON.parse(body);state.messages.push({id:crypto.randomUUID(),sender_id:input.p_sender,recipient_id:input.p_recipient,body:input.p_body,created_at:new Date().toISOString(),read_at:null});return send(200,null);
  }
  if(url.pathname==='/rest/v1/rpc/set_member_block'&&req.method==='POST'){
   const input=JSON.parse(body);state.blocks=input.p_block?[{blocker_id:input.p_user,blocked_id:input.p_other}]:[];return send(200,null);
  }
  if(table==='music_release_comments'&&req.method==='POST'){state.comments.push({...JSON.parse(body),id:crypto.randomUUID(),created_at:new Date().toISOString(),deleted_at:null});return send(201,[]);}
  if(table==='music_release_comments'&&req.method==='PATCH'){const id=url.searchParams.get('id')?.slice(3);state.comments=state.comments.map(row=>row.id===id?{...row,...JSON.parse(body)}:row);return send(200,state.comments.filter(row=>row.id===id));}
  if(table==='member_messages'&&req.method==='PATCH'){state.messages=state.messages.map(row=>row.sender_id===url.searchParams.get('sender_id')?.slice(3)?{...row,...JSON.parse(body)}:row);return send(200,[]);}

  if(table==='project_documents'&&req.method==='POST'){const record=JSON.parse(body);state.documents.push({...record,id:'88888888-8888-4888-8888-888888888888',created_at:new Date().toISOString()});return send(201,[]);}
  if(table==='fan_music_library'&&req.method==='POST'){const record=JSON.parse(body);state.library=state.library.filter(row=>!(row.user_id===record.user_id&&row.kind===record.kind&&row.item_id===record.item_id));state.library.push(record);return send(201,[]);}
  if(table==='fan_music_library'&&req.method==='DELETE'){state.library=state.library.filter(row=>!['user_id','kind','item_id'].every(key=>url.searchParams.get(key)==='eq.'+row[key]));return send(204);}
  let rows=[];
  if(table==='fan_music_library')rows=state.library;

  if(table==='project_documents')rows=state.documents;
  if(table==='music_release_comments')rows=state.comments.filter(row=>!url.searchParams.has('release_id')||'eq.'+row.release_id===url.searchParams.get('release_id'));
  if(table==='member_messages')rows=[...state.messages].sort((a,b)=>b.created_at.localeCompare(a.created_at));
  if(table==='member_blocks')rows=state.blocks;
  if(table==='profiles')rows=[{...user,full_name:'Test Listener',nickname:'Listener',creator_types:state.types||(state.creator?['Fan','Artist']:['Fan']),account_status:'active',profile_visibility:'project'}];
  if(table==='profiles'&&state.publicArtist&&(url.searchParams.has('limit')||['eq.99999999-9999-4999-8999-999999999999','eq.aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'].includes(url.searchParams.get('id')))){
   rows=[['99999999-9999-4999-8999-999999999999','Unreleased fixture artist'],['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Another fixture artist']].map(([id,stage_name])=>({id,stage_name,creator_types:['Artist'],profile_visibility:'public',account_status:'active'}));
   if(url.searchParams.has('id'))rows=rows.filter(row=>'eq.'+row.id===url.searchParams.get('id'));
  }
  if(table==='profiles'&&state.conversation&&url.searchParams.get('id')==='eq.bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')rows=[{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',full_name:'Fixture Collaborator',account_status:'active',profile_visibility:'public'}];
  if(table==='music_weekly_chart')rows=[releaseId,secondId].map((id,i)=>({id,title:`Test song ${i+1}`,artist_id:state.externalArtist&&i===1?'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb':userId,artist_name:'Test artist',collection:'Test EP',has_cover:state.heroCovers,release_at:'2026-10-01T12:00:00Z',votes:0}));
  if(table==='music_weekly_chart'&&url.searchParams.get('has_cover')==='eq.true')rows=rows.filter(row=>row.has_cover);
  if(['music_weekly_chart','music_release_comments'].includes(table))for(const key of ['id','artist_id','author_id']){const value=url.searchParams.get(key);if(value?.startsWith('eq.'))rows=rows.filter(row=>row[key]===value.slice(3));}
  if(table==='control_room_admins'&&state.admin)rows=[{user_id:userId,active:true,permissions:['all']}];
  if(table==='project_members'&&state.hasProject)rows=[{id:'55555555-5555-4555-8555-555555555555',user_id:userId,project_id:'66666666-6666-4666-8666-666666666666',status:'active',joined_at:'2026-01-01',projects:{id:'66666666-6666-4666-8666-666666666666',name:'Test creative project',code:'TEST',status:'active'},member_roles:(state.roles||['Artist']).map(name=>({roles:{name}}))}];
  if(table==='member_roles')rows=(state.roles||['Artist']).map(name=>({roles:{name}}));
  if(req.headers.prefer?.includes('count=exact')||req.method==='HEAD')res.setHeader('Content-Range',rows.length?`0-${rows.length-1}/${rows.length}`:'*/0');
  if(req.method==='HEAD')return send(200);
  if(req.headers.accept?.includes('application/vnd.pgrst.object+json'))return send(200,rows[0]||null);
  if(table==='profiles'&&url.searchParams.has('limit')===false&&url.searchParams.get('id')&&req.method==='GET'){
   // maybeSingle uses an ordinary JSON accept header in current postgrest-js.
  }
  return send(200,rows);
 });
 return {server,state};
}
