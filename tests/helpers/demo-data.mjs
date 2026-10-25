import {mockSupabase} from './mock-supabase.mjs';
if(process.env.VERCEL)throw new Error('The synthetic local demo service must never run on Vercel.');
const {server,state}=mockSupabase();
state.creator=true;state.hasProject=true;state.admin=true;
state.types=['Artist','Producer','Engineer','Videographer','Songwriter'];
state.roles=['Artist','Producer','Engineer','A&R','Manager','Project Lead','Studio Owner'];
server.listen(54329,'127.0.0.1',()=>console.log('Local FACKTS fixture service: http://127.0.0.1:54329\nSynthetic records only. In a second terminal run npm run dev using .env.demo.example as .env.local.\nSign in with listener@example.test and Local test password 123!\nNothing is sent to production Supabase or R2.'));
