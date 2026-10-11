import {isFanProfile} from '../../lib/fanProfile';
import {getWorkspace} from '../../lib/workspace';
import {chart,currentChartWeek} from '../../lib/community';
import ListenerExperience from '../../components/ListenerExperience';
import FanShell from '../../components/FanShell';
export default async function FanPage(){
 const{user,profile,admin}=await getWorkspace();
 const[releases,library,votes,messages]=await Promise.all([chart(),admin.from('fan_music_library').select('kind,item_id,label,track_ids,updated_at').eq('user_id',user.id).order('updated_at',{ascending:false}).limit(1000),admin.from('music_votes').select('release_id').eq('user_id',user.id).eq('week_start',currentChartWeek()),admin.from('member_messages').select('id',{count:'exact',head:true}).eq('recipient_id',user.id).is('read_at',null)]);
 if(library.error||votes.error)throw new Error('Your music library could not be loaded.');
 const name=profile?.stage_name||profile?.full_name||'Listener';
 return <FanShell name={name} creatorMode={!isFanProfile(profile)}><ListenerExperience releases={releases} userId={user.id} name={name} initialLibrary={library.data||[]} votedIds={(votes.data||[]).map(x=>x.release_id)} unread={messages.count||0}/></FanShell>;
}
