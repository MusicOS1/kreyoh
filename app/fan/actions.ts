"use server";
import {communityAccount,uuidPattern} from '../../lib/community';
export async function updateFanLibrary(kind:string,id:string,enabled:boolean,label='',trackIds:string[]=[]){
 try{
  const{user,admin}=await communityAccount();
  if(!['saved','following','recent','playlist'].includes(kind)||!uuidPattern.test(id)||typeof enabled!=='boolean')throw new Error('Invalid library item.');
  if(!enabled){const{error}=await admin.from('fan_music_library').delete().eq('user_id',user.id).eq('kind',kind).eq('item_id',id);if(error)throw error;return {ok:true};}
  if(kind==='playlist'){
   if(!label.trim()||label.length>60||!Array.isArray(trackIds)||trackIds.length>200||trackIds.some(x=>!uuidPattern.test(x)))throw new Error('Choose a playlist name and up to 200 songs.');
   if(trackIds.length){const{data,error}=await admin.from('music_weekly_chart').select('id').in('id',trackIds);if(error)throw error;if(new Set(data?.map(x=>x.id)).size!==new Set(trackIds).size)throw new Error('Some songs are no longer available.');}
  }else if(kind==='following'){
   const{data,error}=await admin.from('profiles').select('id').eq('id',id).eq('profile_visibility','public').eq('account_status','active').contains('creator_types',['Artist']).maybeSingle();
   if(error)throw error;if(!data)throw new Error('This artist is not currently available.');
  }else{
   const query=admin.from('music_weekly_chart').select('id').eq('id',id);
   const{data,error}=await query.limit(1);if(error)throw error;if(!data?.length)throw new Error('This release or artist is not currently available.');
  }
  const{error}=await admin.from('fan_music_library').upsert({user_id:user.id,kind,item_id:id,label:kind==='playlist'?label.trim():'',track_ids:kind==='playlist'?[...new Set(trackIds)]:[],updated_at:new Date().toISOString()},{onConflict:'user_id,kind,item_id'});
  if(error)throw error;return {ok:true};
 }catch(e){return {ok:false,error:e instanceof Error&&e.message.includes('available')?e.message:'Could not save. Confirm your email and try again.'};}
}

export async function addReleaseToPlaylist(id:string,releaseId:string){
 try{if(!uuidPattern.test(id)||!uuidPattern.test(releaseId))throw Error('Invalid playlist.');const{user,admin}=await communityAccount();const{error}=await admin.rpc('add_release_to_playlist',{p_user:user.id,p_playlist:id,p_release:releaseId});if(error)throw Error(error.message);return{ok:true};}
 catch(error){return{ok:false,error:error instanceof Error?error.message:'Could not update playlist.'};}
}
