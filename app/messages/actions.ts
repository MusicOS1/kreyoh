"use server";
import {revalidatePath} from 'next/cache';
import {communityAccount,uuidPattern} from '../../lib/community';
import {getWorkspace} from '../../lib/workspace';
export async function sendMessage(_state:{error:string;sent:number},form:FormData){
 try{const{admin,user}=await communityAccount();const recipient=String(form.get('recipient')||''),body=String(form.get('body')||'').trim();if(!uuidPattern.test(recipient)||!body||body.length>2000)throw Error('Write a message of 1 to 2,000 characters.');const reply=String(form.get('reply_to')||'');
 if(reply&&!uuidPattern.test(reply))throw Error('Invalid reply.');
 const{error}=reply?await admin.rpc('send_member_reply',{p_sender:user.id,p_recipient:recipient,p_body:body,p_reply_to:reply}):await admin.rpc('send_member_message',{p_sender:user.id,p_recipient:recipient,p_body:body});if(error)throw Error(error.message);revalidatePath('/messages');revalidatePath(`/messages/${recipient}`);return{error:'',sent:Date.now()};}catch(error){return{error:error instanceof Error?error.message:'Message could not be sent.',sent:0};}
}
export async function markConversationRead(other:string){
 if(!uuidPattern.test(other))return;const{admin,user}=await getWorkspace();await admin.from('member_messages').update({read_at:new Date().toISOString()}).eq('sender_id',other).eq('recipient_id',user.id).is('read_at',null);
}
export async function blockMember(_state:{message:string},form:FormData){
 try{const{admin,user}=await communityAccount();const other=String(form.get('recipient')||'');if(!uuidPattern.test(other))throw Error('Choose a member.');const block=form.get('operation')==='block';const{error}=await admin.rpc('set_member_block',{p_user:user.id,p_other:other,p_block:block});if(error)throw Error(error.message);revalidatePath(`/messages/${other}`);revalidatePath('/messages');return{message:block?'Member blocked. You can unblock them here.':'Member unblocked.'};}catch(error){return{message:error instanceof Error?error.message:'Could not update block.'};}
}

const ALLOWED_REACTIONS=new Set(['❤️','🔥','😂','👏','👍','😮','😢','💯']);
export async function toggleMessageReaction(form:FormData){
 const messageId=String(form.get('message_id')||''),emoji=String(form.get('emoji')||'');
 if(!uuidPattern.test(messageId)||!ALLOWED_REACTIONS.has(emoji))throw Error('Invalid reaction.');
 const{admin,user}=await communityAccount();
 const{data:message,error:lookupError}=await admin.from('member_messages').select('sender_id,recipient_id').eq('id',messageId).maybeSingle();
 if(lookupError||!message||(message.sender_id!==user.id&&message.recipient_id!==user.id))throw Error('Message unavailable.');
 const other=message.sender_id===user.id?message.recipient_id:message.sender_id;
 const{data:blocks,error:blockError}=await admin.from('member_blocks').select('blocker_id').or(`and(blocker_id.eq.${user.id},blocked_id.eq.${other}),and(blocker_id.eq.${other},blocked_id.eq.${user.id})`).limit(1);
 if(blockError||blocks?.length)throw Error('Reaction unavailable for this conversation.');
 const{data:prior,error:priorError}=await admin.from('member_message_reactions').select('emoji').eq('message_id',messageId).eq('user_id',user.id).maybeSingle();
 if(priorError)throw Error('Could not check reaction.');
 const query=prior?.emoji===emoji?
  admin.from('member_message_reactions').delete().eq('message_id',messageId).eq('user_id',user.id):
  admin.from('member_message_reactions').upsert({message_id:messageId,user_id:user.id,emoji},{onConflict:'message_id,user_id'});
 const{error}=await query;
 if(error)throw Error('Reaction could not be saved.');
 return{ok:true};
}
