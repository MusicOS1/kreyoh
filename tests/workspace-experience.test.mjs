import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url),read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function load(path,overrides={}){const source=ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const module={exports:{}};new Function('require','module','exports',source)(name=>name in overrides?overrides[name]:require(name),module,module.exports);return module.exports;}
const model=load('lib/workspaceExperience.ts');
test('one identity exposes multiple creative workspaces without trusting elevated profile labels',()=>{
 const fan=model.workspaceOptions(['Fan','Admin','A&R','Manager'],[],false);assert.deepEqual(fan.map(item=>item.kind),['listener']);
 const multiple=model.workspaceOptions(['Artist','Producer','Engineer','Videographer','Songwriter'],['Manager','A&R','Project Lead'],false);
 for(const kind of ['listener','artist','producer','engineer','ar','visual','creative','manager','coordinator'])assert.ok(multiple.some(item=>item.kind===kind),kind);
 assert.ok(!multiple.some(item=>item.kind==='admin'));
 assert.ok(model.workspaceOptions(['Fan'],[],true).some(item=>item.kind==='admin'));
 assert.deepEqual(model.workspaceOptions([],['Contributor']).map(item=>item.kind),['listener','creative']);
});
test('restricted workspace data only includes projects with active assigned roles',()=>{
 const memberships=[{project_id:'artist-project',roles:['Artist']},{project_id:'review-project',roles:['A&R']},{project_id:'lead-project',roles:['Project Lead']}];
 assert.deepEqual(model.permittedProjectIds('ar',memberships),['review-project','lead-project']);
 assert.deepEqual(model.permittedProjectIds('manager',memberships),['lead-project']);
 assert.deepEqual(model.permittedProjectIds('artist',memberships),['artist-project','review-project','lead-project']);
 assert.deepEqual(model.permittedProjectIds('admin',memberships),[]);
});
test('invalid or stale workspace preference falls back to a permitted personal workspace',()=>{
 const options=model.workspaceOptions(['Artist'],['Producer'],false);
 assert.equal(model.preferredWorkspace(options,'admin').kind,'artist');
 assert.equal(model.preferredWorkspace(options,'producer').kind,'producer');
 assert.equal(model.preferredWorkspace(model.workspaceOptions(['Fan'],[]),'ar').kind,'listener');
});
function fixture({types=['Fan'],roles=['A&R'],fail=false}={}){
 const records={tracks:[{id:'a',project_id:'artist-project',working_title:'Private artist song'},{id:'b',project_id:'review-project',working_title:'Authorised repertoire'},{id:'c',project_id:'revoked-project',working_title:'Revoked material'}]};
 const queries=[];
 const admin={from(table){const filters=[];const query={select(){return query},in(key,value){filters.push([key,value]);return query},eq(key,value){filters.push([key,[value]]);return query},is(){return query},or(){return query},neq(){return query},gte(){return query},order(){return query},range(){return query},limit(){return query},then(resolve,reject){queries.push({table,filters});const data=(records[table]||[]).filter(row=>filters.every(([key,values])=>values.includes(row[key])));return Promise.resolve({data,error:fail?{message:'fixture outage'}:null,count:data.length}).then(resolve,reject)}};return query;}};
 const memberships=[{project_id:'artist-project',roles:['Artist']},{project_id:'review-project',roles}];
 const workspace={admin,supabase:admin,user:{id:'user'},profile:{creator_types:types},memberships,activeProjects:[{id:'artist-project',name:'Artist project'},{id:'review-project',name:'Review project'}]};
 const identity={id:'user',name:'Fixture user',workspaces:model.workspaceOptions(types,['Artist',...roles]),creator:true};
 const page=load('lib/workspaceDashboard.ts',{'./workspace':{getWorkspace:async()=>workspace},'./recordReads':load('lib/recordReads.ts'),'./sessionAccess':load('lib/sessionAccess.ts',{'./recordReads':load('lib/recordReads.ts'),'./workspace':{hasAnyRole:(roles,allowed)=>roles.some(r=>allowed.includes(r))}}),'./experienceIdentity':{getExperienceIdentity:async()=>identity},'./workspaceExperience':model,'./navigation':{projectLink:(project,path)=>`/project-entry?project_id=${project}&next=${encodeURIComponent(path)}`},'next/navigation':{notFound(){throw Error('NOT_FOUND')}}});
 return {page,queries};
}
test('A&R dashboard reads only permitted repertoire and never revoked/non-member projects',async()=>{
 const {page,queries}=fixture();const dashboard=await page.loadWorkspaceDashboard('ar');
 assert.deepEqual(dashboard.projectIds,['review-project']);
 assert.deepEqual(dashboard.trackRows.map(row=>row.title),['Authorised repertoire']);
 for(const query of queries.filter(query=>!['music_releases','fan_music_library','music_release_comments'].includes(query.table)))assert.ok(query.filters.some(([key,ids])=>key==='project_id'&&ids.every(id=>id==='review-project')),query.table);
});
test('self-declared privileged roles cannot open privileged dashboards',async()=>{
 const {page,queries}=fixture({types:['A&R','Manager'],roles:[]});await assert.rejects(page.loadWorkspaceDashboard('ar'),/NOT_FOUND/);assert.equal(queries.length,0);
});
test('unavailable data is distinguished from empty real records',async()=>{
 const {page}=fixture({fail:true});const dashboard=await page.loadWorkspaceDashboard('ar');assert.equal(dashboard.metrics[1].value,null);assert.equal(dashboard.sections[0].unavailable,true);
});
test('all workspace and publication links use the same existing tools',()=>{
 for(const config of model.WORKSPACES)for(const link of config.links){assert.ok(link.href.startsWith('/'));assert.ok(!link.href.startsWith('//'));}
 const dashboard=read('lib/workspaceDashboard.ts');assert.match(dashboard,/Publication here is not external DSP distribution/);assert.doesNotMatch(dashboard,/\.insert\(|\.update\(|\.delete\(|create table/i);
 const action=read('app/workspaces/actions.ts');assert.match(action,/permittedProjectIds\(\s*selected.kind,\s*workspace.memberships\s*\)/);
});

test('tool links preserve display context without changing authorization',()=>{
 assert.equal(model.workspaceHref('/tracks?q=mix#versions','engineer'),'/tracks?q=mix&workspace=engineer#versions');
 assert.equal(model.workspaceHref('/fan?tab=Artists','listener'),'/fan?tab=Artists');
});

test('workspace switch rejects an unavailable role before saving preferences',async()=>{
 const writes=[];
 const {switchWorkspace}=load('app/workspaces/actions.ts',{'../../lib/experienceIdentity':{getExperienceIdentity:async()=>({id:'test-user',workspaces:model.workspaceOptions(['Artist'],[])})},'../../lib/workspace':{getWorkspace:async()=>({memberships:[],project:null})},'../../lib/workspaceExperience':model,'next/headers':{cookies:async()=>({set:(...args)=>writes.push(args)})},'next/navigation':{redirect:(href)=>{throw Error('REDIRECT '+href)}}});
 const invalid=new FormData();invalid.set('workspace','admin');await assert.rejects(switchWorkspace(invalid),/not available/);assert.equal(writes.length,0);
 const valid=new FormData();valid.set('workspace','artist');await assert.rejects(switchWorkspace(valid),/REDIRECT \/workspaces\/artist/);assert.equal(writes[0][0],'fm_workspace');assert.equal(writes[0][1],'test-user:artist');assert.equal(writes[0][2].httpOnly,true);
});
