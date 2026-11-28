// Disposable local app with no external database, payment provider or storage credentials.
import {readFileSync,existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {releaseDatabase,artist} from './release-database.mjs';
import {productionRest} from './production-rest.mjs';
import {mockProductionR2,wavHeader} from './mock-production-r2.mjs';

if(process.env.VERCEL || ['.env','.env.local','.env.development','.env.development.local','.env.production','.env.production.local'].some(existsSync))
  throw new Error('Use a clean local checkout without environment files.');
const loopback='127.0.0.1';
const appPort=3121, dbPort=54339;
const finance='00000000-0000-4000-8000-000000000011', empty='00000000-0000-4000-8000-000000000012';
const fan='00000000-0000-4000-8000-000000000013',song='45000000-0000-4000-8000-000000000001';
const title='Nairobi Soundcheck';
const {db,master,cover}=await releaseDatabase();
const roles=[[finance,'finance'],[empty,'newartist'],[fan,'fan']];
for(const [id,name] of roles) await db.query('insert into profiles(id,full_name,creator_types) values($1,$2,$3)',[id,'Preview '+name,[id===empty?'Artist':'Fan']]);
await db.query("update profiles set stage_name='Soundcheck Artist',public_slug='soundcheck-artist' where id=$1",[artist]);
await db.query("insert into control_room_admins values($1,true,array['finance'])",[finance]);
await db.exec(`alter table projects alter column id set default gen_random_uuid(), add column project_type text, add column progress integer, add column join_requests_open boolean, add column created_by uuid;
 alter table studio_sessions alter column id set default gen_random_uuid(), add column ends_at timestamptz, add column location text, add column notes text, add column outcomes text, add column media_source_url text, add column media_notes text, add column is_backlog boolean default false;
 alter table tracks add column if not exists beat_id uuid, add column if not exists created_by uuid;`);
await db.exec('create table auth.users(id uuid primary key); insert into auth.users select id from profiles');
await db.exec(readFileSync('tests/fixtures/play-accounting.sql','utf8'));
await db.exec(readFileSync('supabase/migrations/20261125053000_finance_payment_requests.sql','utf8'));
await db.query("insert into fan_music_library(user_id,kind,item_id,label) values($1,'playlist',$2,'Soundcheck favourites')",[fan,crypto.randomUUID()]);
const audioKey='releases/'+artist+'/'+song+'/audio';
await db.query("insert into music_releases(id,artist_id,title,artist_name,genre,credits,rights_confirmed_at,release_at,status,audio_type,audio_key) values($1,$2,$3,'Test Artist','Instrumental','Test Artist · preview composition; Guest Keys · off-platform keyboard',now(),now()-interval '1 day','published','audio/wav',$4)",[song,artist,title,audioKey]);
const r2=mockProductionR2();
const samples=Buffer.alloc(16*16000);
for(let i=0;i<samples.length/2;i++){
 const note=[220,261.63,329.63,293.66][Math.floor(i/4000)%4];
 samples.writeInt16LE(Math.round(1800*Math.sin(2*Math.PI*note*i/8000)*Math.sin(Math.PI*(i%4000)/4000)),i*2);
}
const audio=Buffer.concat([wavHeader(samples.length),samples]);
r2.seed(audioKey,'audio/wav',audio);
const masterBytes=audio.subarray(44,48044);
r2.seed(master.storage_path,'audio/wav',Buffer.concat([wavHeader(masterBytes.length),masterBytes]));
r2.objects.get('/fixture/'+master.storage_path).etag=master.storage_etag;
const coverRow=(await db.query('select storage_path from project_assets where id=$1',[cover])).rows[0];
r2.seed(coverRow.storage_path,'image/png',readFileSync('public/branding/fackts-music-logo.png'));
const rest=productionRest(db,{
 releases:true,extraUsers:roles,extraTables:['music_play_sessions','finance_payment_requests'],
 async extraRest({url,table,body,send}){
  if(!url.pathname.startsWith('/rest/v1/rpc/'))return false;
  if(table==='public_release_play_counts'){
   send(200,(await db.query('select * from public_release_play_counts($1)',[JSON.parse(body).p_release_ids])).rows);return true;
  }
  if(table==='public_music_play_stats'){
   const {p_from,p_to}=JSON.parse(body);
   send(200,(await db.query('select * from public_music_play_stats($1,$2)',[p_from,p_to])).rows);return true;
  }
  return false;
 }
});
const listen=(server,port)=>new Promise((ok,fail)=>server.once('error',fail).listen(port,loopback,ok));
await listen(rest.server,dbPort);
await listen(r2.server,54340);
const mediaPort=r2.server.address().port;
const env={
 PATH:process.env.PATH,HOME:process.env.HOME, SystemRoot:process.env.SystemRoot,
 NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:'+dbPort,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'local-test-publishable-key',
 SUPABASE_SERVICE_ROLE_KEY:'local-test-service-key',R2_ACCOUNT_ID:'0'.repeat(32),R2_ACCESS_KEY_ID:'0'.repeat(32),
 R2_SECRET_ACCESS_KEY:'0'.repeat(64),R2_BUCKET_NAME:'fixture',FACKTS_LOCAL_STORAGE:'true',FACKTS_R2_TEST_PORT:String(mediaPort),
 NEXT_PUBLIC_SITE_URL:'http://localhost:'+appPort,NEXT_TELEMETRY_DISABLED:'1',
 // Exercise the production finance draft gate only inside the isolated child.
 VERCEL_ENV:'production',FINANCE_BACKOFFICE_WRITES_ENABLED:'true',PAYSTACK_PAYMENTS_ENABLED:'false',
 PAYSTACK_LIVE_ENABLED:'false',FACKTS_AI_HELPER_ENABLED:'false'
};
const app=spawn(process.execPath,['--require',resolve('tests/helpers/r2-fixture.cjs'),'node_modules/next/dist/bin/next',...(process.argv.includes('--built')?['start']:['dev','--webpack']),'--hostname',loopback,'--port',String(appPort)],{env,stdio:'inherit'});
console.log('Local review: http://localhost:'+appPort+'/billboard/'+song);
console.log('Synthetic users: lead, artist, outsider (reviewer), fan, finance and newartist @example.test. Test password: isolated-password.');
async function stop(){app.kill();rest.server.close();r2.server.close();await db.close();}
process.once('SIGINT',stop);process.once('SIGTERM',stop);
