import {updateSplitPlan} from '../../../splits/actions';
import {commentOnTrack,deleteTrackNote} from '../../../tracks/actions';
import {getWorkspace} from '../../../../lib/workspace';
import {uuidPattern} from '../../../../lib/community';
import {conversationSnapshot} from '../../../../lib/conversationSnapshot';
import {sendMessage,markConversationRead,blockMember} from '../../../messages/actions';
import { updateFanLibrary,addReleaseToPlaylist } from '../../../fan/actions';
import { voteForRelease, manageRelease } from '../../../billboard/actions';
import { listReleaseComments, postReleaseComment, deleteReleaseComment } from '../../../release-comments/actions';
import { recordTrackVersionListen, setTrackVersionRanking } from '../../../tracks/actions';
import { saveFanHero } from '../../../admin/(control)/discovery/hero-actions';
import { saveDiscovery } from '../../../admin/(control)/discovery/actions';
import { bulkApprovePending } from '../../../admin/(control)/releases/actions';
import { askMusicHelper } from '../../../help/actions';
import { prepareAdminArtworkUpload, saveAdminArtwork, replaceAdminMusicCredits, updateAdminMusicMetadata, deleteAdminMusicRecord } from '../../../admin/(control)/actions';

// Explicit allowlist. Each underlying operation retains its own session, role,
// membership and resource checks. No client-selected module/function execution.
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  const headers = { 'Cache-Control': 'private, no-store' };
  const origin = request.headers.get('origin');
  if (request.headers.get('sec-fetch-site') === 'cross-site' || (origin && origin !== new URL(request.url).origin))
    return Response.json({ ok: false, error: 'Invalid request origin.' }, { status: 403, headers });
  const { action } = await context.params;
  try {
    const limit=1024*1024;
    if(Number(request.headers.get('content-length'))>limit)return Response.json({ok:false,error:'This action is too large.'},{status:413,headers});
    // Match the small Server Action payload boundary, including chunked requests.
    const reader=request.body?.getReader(),chunks:Uint8Array[]=[];let size=0;
    if(reader){while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>limit){await reader.cancel();return Response.json({ok:false,error:'This action is too large.'},{status:413,headers});}chunks.push(part.value);}}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    request=new Request(request.url,{method:'POST',headers:request.headers,body:bytes});
    const formActions: Record<string, (form: FormData) => Promise<unknown>> = {
      hero: form => saveFanHero({ message: '', ok: false }, form),
      editorial: form => saveDiscovery({ message: '' }, form),
      releaseManage: form => manageRelease({ message: '' }, form),
      bulkApprove: form => bulkApprovePending({ message: '', ok: false }, form),
      helper: form => askMusicHelper({}, form),
      split: async form => {
        const result=await updateSplitPlan({},form);if(!result.success)return result;
        const {admin,activeProjects}=await getWorkspace();const projectId=String(form.get('project_id')||''),trackId=String(form.get('track_id')||'');
        if(!activeProjects.some((project:any)=>project.id===projectId))return result;
        const [rows,plan]=await Promise.all([
          admin.from('track_splits').select('id,contributor_id,contribution_role,percentage,status,profiles!track_splits_contributor_id_fkey(full_name,stage_name,nickname)').eq('project_id',projectId).eq('track_id',trackId).order('created_at'),
          admin.from('track_split_plans').select('version,status').eq('project_id',projectId).eq('track_id',trackId).maybeSingle()
        ]);
        if(rows.error||plan.error)return {...result,success:result.success+' Reload this proposal to see its current version.'};
        return {...result,snapshot:{rows:rows.data||[],version:plan.data?.version||0,status:plan.data?.status||'draft'}};
      },
      trackCommentDelete: async form => {await deleteTrackNote(form);return {ok:true}},
      trackCommentPost: async form => {
        const {admin,project,membership}=await getWorkspace();const id=String(form.get('track_id')||'');
        if(!project||!membership||!uuidPattern.test(id))throw new Error('Project access required');
        const {data:track}=await admin.from('tracks').select('id').eq('id',id).eq('project_id',project.id).maybeSingle();
        if(!track)throw new Error('Track unavailable');
        await commentOnTrack(form);
        const {data,error}=await admin.from('comments').select('id,body,profiles(stage_name,full_name)').eq('project_id',project.id).eq('entity_type','track').eq('entity_id',id).order('created_at',{ascending:true}).limit(150);
        if(error)throw error;return data||[];
      },
      messageSend: form => sendMessage({error:'',sent:0},form),
      memberBlock: form => blockMember({message:''},form),
      adminArtworkPrepare: prepareAdminArtworkUpload,
      adminArtworkSave: saveAdminArtwork,
      adminCredits: replaceAdminMusicCredits,
      adminMetadata: updateAdminMusicMetadata,
      adminDelete: deleteAdminMusicRecord,
    };
    let value: unknown;
    if (Object.hasOwn(formActions, action)) {
      const form = await request.formData();
      if ([...form.values()].some(value => typeof value !== 'string'))
        return Response.json({ ok: false, error: 'Upload files through the secure upload controls.' }, { status: 400, headers });
      value = await formActions[action](form);
    } else {
      const input = await request.json();
      if (!input || typeof input !== 'object') throw new Error('Invalid request');
      switch (action) {
        case 'conversation': {
          const snapshot=await conversationSnapshot(input.other,input.before);
          if(!snapshot) return Response.json({ok:false,error:'Conversation unavailable.'},{status:403,headers});
          if(!input.before)await markConversationRead(input.other);
          value={messages:snapshot.messages,disabled:snapshot.disabled,blocked:snapshot.blocked};break;
        }
        case 'notificationRead': {
          if(input.id!==undefined&&(typeof input.id!=='string'||!uuidPattern.test(input.id)))throw new Error('Invalid notification');
          const {supabase,user}=await getWorkspace();
          let query=supabase.from('notifications').update({read_at:new Date().toISOString()}).eq('user_id',user.id);
          query=input.id?query.eq('id',input.id):query.is('read_at',null);
          const {error}=await query;if(error)throw error;value={ok:true};break;
        }
        case 'playlistAdd': value=await addReleaseToPlaylist(input.id,input.releaseId);break;
        case 'library': value = await updateFanLibrary(input.kind, input.id, input.enabled, input.label, input.trackIds); break;
        case 'releaseVote':
          if (typeof input.enabled !== 'boolean' || typeof input.id !== 'string') throw new Error('Invalid vote');
          value = await voteForRelease(input.id, input.enabled); break;
        case 'commentsList': value = await listReleaseComments(input.releaseId); break;
        case 'commentPost': value = await postReleaseComment(input.releaseId, input.body, input.parentId ?? null); break;
        case 'commentDelete': value = await deleteReleaseComment(input.id); break;
        case 'versionListen':
        case 'versionRank':
          if (typeof input.id !== 'string' || !Number.isFinite(input.value)) throw new Error('Invalid recording');
          value = action === 'versionListen' ? await recordTrackVersionListen(input.id, input.value) : await setTrackVersionRanking(input.id, input.value); break;
        default: return Response.json({ ok: false, error: 'Unknown interaction.' }, { status: 404, headers });
      }
    }
    return Response.json({ ok: true, value }, { headers });
  } catch (error) {
    console.error('background-interaction', { action, error });
    return Response.json({ ok: false, error: 'Could not complete this action. Check your access and try again.' }, { status: 400, headers });
  }
}
