"use server";
import {revalidatePath} from 'next/cache';
import {communityAccount,uuidPattern} from '../../lib/community';
import {getWorkspace} from '../../lib/workspace';
export async function sendMessage(_state:{error:string;sent:number},form:FormData){
 try{const{admin,user}=await communityAccount();const recipient=String(form.get('recipient')||''),body=String(form.get('body')||'').trim();if(!uuidPattern.test(recipient)||!body||body.length>2000)throw Error('Write a message of 1 to 2,000 characters.');const{error}=await admin.rpc('send_member_message',{p_sender:user.id,p_recipient:recipient,p_body:body});if(error)throw Error(error.message);revalidatePath('/messages');revalidatePath(`/messages/${recipient}`);return{error:'',sent:Date.now()};}catch(error){return{error:error instanceof Error?error.message:'Message could not be sent.',sent:0};}
}
export async function markConversationRead(other:string){
 if(!uuidPattern.test(other))return;const{admin,user}=await getWorkspace();await admin.from('member_messages').update({read_at:new Date().toISOString()}).eq('sender_id',other).eq('recipient_id',user.id).is('read_at',null);
}
export async function blockMember(_state:{message:string},form:FormData){
 try{const{admin,user}=await communityAccount();const other=String(form.get('recipient')||'');if(!uuidPattern.test(other))throw Error('Choose a member.');const block=form.get('operation')==='block';const{error}=await admin.rpc('set_member_block',{p_user:user.id,p_other:other,p_block:block});if(error)throw Error(error.message);revalidatePath(`/messages/${other}`);revalidatePath('/messages');return{message:block?'Member blocked. You can unblock them here.':'Member unblocked.'};}catch(error){return{message:error instanceof Error?error.message:'Could not update block.'};}
}
