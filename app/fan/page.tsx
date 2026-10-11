import {discoveryContent} from '../../lib/discoveryContent';
import {isFanProfile} from '../../lib/fanProfile';
import {getWorkspace} from '../../lib/workspace';
import {chart,currentChartWeek} from '../../lib/community';
import ListenerExperience from '../../components/ListenerExperience';
import FanShell from '../../components/FanShell';
export default async function FanPage({searchParams}:{searchParams:Promise<{tab?:string}>}){
 const requestedTab=(await searchParams).tab||"For You";
 const initialTab=["For You","Albums & EPs","Shows","Billboard","My Library","Following","Recently played"].includes(requestedTab)?requestedTab:"For You";
 const{user,profile,admin}=await getWorkspace();
 // Music and message widgets must not crash the entire fan server render during a transient database error.
 const [chartResult,libraryResult,voteResult,messageResult,editorialResult]=await Promise.allSettled([
   chart(),
   admin.from("fan_music_library").select("kind,item_id,label,track_ids,updated_at").eq("user_id",user.id).order("updated_at",{ascending:false}).limit(1000),
   admin.from("music_votes").select("release_id").eq("user_id",user.id).eq("week_start",currentChartWeek()),
   admin.from("member_messages").select("id",{count:"exact",head:true}).eq("recipient_id",user.id).is("read_at",null),
   discoveryContent()
 ]);
 const releases=chartResult.status==="fulfilled"?chartResult.value:[];
 const library=libraryResult.status==="fulfilled"?libraryResult.value:{data:[],error:new Error("Your library is unavailable.")};
 const votes=voteResult.status==="fulfilled"?voteResult.value:{data:[],error:new Error("Voting data is unavailable.")};
 const messages=messageResult.status==="fulfilled"?messageResult.value:{count:0};
 const editorial=editorialResult.status==="fulfilled"?editorialResult.value:[];
 const dataUnavailable=chartResult.status==="rejected"||Boolean(library.error)||Boolean(votes.error)||editorialResult.status==="rejected";
 if(dataUnavailable)console.error("Fan portal partial data load failed",{
   chart:chartResult.status,library:Boolean(library.error),votes:Boolean(votes.error),
   discovery:editorialResult.status
 });
 const name=profile?.nickname||profile?.stage_name||profile?.full_name||'Listener';
 return <FanShell showBottomNav={false} name={name} activeTab={initialTab} avatarUrl={profile?.avatar_url} creatorMode={!isFanProfile(profile)}><ListenerExperience initialTab={initialTab} editorial={editorial} loadWarning={dataUnavailable?"Some music information could not be loaded right now. Please refresh in a moment.":undefined} releases={releases} userId={user.id} name={name} initialLibrary={library.data||[]} votedIds={(votes.data||[]).map(x=>x.release_id)} unread={messages.count||0}/></FanShell>;
}
