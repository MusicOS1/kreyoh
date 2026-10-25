import {discoveryContent} from '../../lib/discoveryContent';
import {publicMusicArtists} from '../../lib/musicArtists';
import {fanHeroSettings} from '../../lib/fanHero';
import {isFanProfile} from '../../lib/fanProfile';
import {getWorkspace} from '../../lib/workspace';
import {chart,currentChartWeek} from '../../lib/community';
import ListenerExperience from '../../components/ListenerExperience';
import FanShell from '../../components/FanShell';
import AppShell from '../../components/AppShell';
export default async function FanPage({searchParams}:{searchParams:Promise<{tab?:string}>}){
 const requestedTab=(await searchParams).tab||"For You";
 const initialTab=["For You","Artists","Albums & EPs","Shows","Billboard","My Library","Following","Recently played"].includes(requestedTab)?requestedTab:"For You";
 const{user,profile,admin,activeProjects}=await getWorkspace();
 // Music and message widgets must not crash the entire fan server render during a transient database error.
 const [chartResult,libraryResult,voteResult,messageResult,editorialResult,heroResult,artistResult]=await Promise.allSettled([
   chart(),
   admin.from("fan_music_library").select("kind,item_id,label,track_ids,updated_at").eq("user_id",user.id).order("updated_at",{ascending:false}).limit(1000),
   admin.from("music_votes").select("release_id").eq("user_id",user.id).eq("week_start",currentChartWeek()),
   admin.from("member_messages").select("id",{count:"exact",head:true}).eq("recipient_id",user.id).is("read_at",null),
   discoveryContent(),fanHeroSettings(),publicMusicArtists()
 ]);
 const releases=chartResult.status==="fulfilled"?chartResult.value:[];
 const library=libraryResult.status==="fulfilled"?libraryResult.value:{data:[],error:new Error("Your library is unavailable.")};
 const votes=voteResult.status==="fulfilled"?voteResult.value:{data:[],error:new Error("Voting data is unavailable.")};
 const messages=messageResult.status==="fulfilled"?messageResult.value:{count:0};
 const editorial=editorialResult.status==="fulfilled"?editorialResult.value:[];
 const artistsDirectory=artistResult.status==="fulfilled"?artistResult.value:[];
 const heroSettings=heroResult.status==="fulfilled"?heroResult.value:undefined;
 const dataUnavailable=chartResult.status==="rejected"||Boolean(library.error)||Boolean(votes.error)||editorialResult.status==="rejected"||artistResult.status==="rejected";
 if(dataUnavailable)console.error("Fan portal partial data load failed",{
   chart:chartResult.status,library:Boolean(library.error),votes:Boolean(votes.error),
   discovery:editorialResult.status,artists:artistResult.status
 });
 const name=profile?.nickname||profile?.stage_name||profile?.full_name||'Listener';
 const fanOnly=isFanProfile(profile)&&!activeProjects?.length;
 const listening=<ListenerExperience initialTab={initialTab} editorial={editorial} heroSettings={heroSettings} artistsDirectory={artistsDirectory} loadWarning={dataUnavailable?"Some music information could not be loaded right now. Please refresh in a moment.":undefined} releases={releases} userId={user.id} name={name} initialLibrary={library.data||[]} votedIds={(votes.data||[]).map(x=>x.release_id)} unread={messages.count||0} showFanNav={fanOnly}/>;
 return <FanShell showBottomNav={false} name={name} activeTab={initialTab} avatarUrl={profile?.avatar_url}>{listening}</FanShell>;
}
