-- FACKTS Music chat realtime: metadata-only broadcasts; no message bodies in realtime payloads.
-- Existing secure server RPC, blocks, rate limits and read receipts remain authoritative.
create policy "fackts_user_chat_broadcast_receive" on realtime.messages
for select to authenticated
using (
 extension='broadcast'
 and (select realtime.topic())='fm:user:'||(select auth.uid())::text
);

create function public.fackts_chat_change_event() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='INSERT' then
  -- Create a private inbox item for the intended recipient, never for bystanders.
  insert into public.notifications(user_id,type,title,body,entity_type,entity_id,action_url)
  values(new.recipient_id,'chat_message','New private message','You have a message on FACKTS Music.','message',new.id,'/messages/'||new.sender_id::text);
  begin
   perform realtime.send(jsonb_build_object('senderId',new.sender_id,'recipientId',new.recipient_id,'messageId',new.id),'chat','fm:user:'||new.recipient_id::text,true);
   perform realtime.send(jsonb_build_object('senderId',new.sender_id,'recipientId',new.recipient_id,'messageId',new.id),'chat','fm:user:'||new.sender_id::text,true);
  exception when others then
   raise warning 'FACKTS realtime chat delivery unavailable'; -- Message must still be saved.
  end;
 elsif tg_op='UPDATE' and old.read_at is distinct from new.read_at then
  begin
   perform realtime.send(jsonb_build_object('senderId',new.sender_id,'recipientId',new.recipient_id,'messageId',new.id,'readReceipt',true),'chat','fm:user:'||new.sender_id::text,true);
  exception when others then
   raise warning 'FACKTS realtime read-receipt delivery unavailable';
  end;
 end if;
 return new;
end $$;
create trigger fackts_chat_events after insert or update of read_at on public.member_messages
for each row execute function public.fackts_chat_change_event();

create function public.fackts_inbox_change_event() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 begin
  perform realtime.send(jsonb_build_object('notificationId',new.id,'type',new.type),'inbox','fm:user:'||new.user_id::text,true);
 exception when others then
  raise warning 'FACKTS realtime inbox delivery unavailable';
 end;
 return new;
end $$;
create trigger fackts_notification_events after insert on public.notifications
for each row execute function public.fackts_inbox_change_event();

-- Replies use the existing secured send RPC for all membership, block and rate-limit checks.
alter table public.member_messages add column if not exists reply_to_id uuid
 references public.member_messages(id) on delete set null;
create index if not exists member_messages_reply_idx on public.member_messages(reply_to_id)
 where reply_to_id is not null;

create function public.send_member_reply(p_sender uuid,p_recipient uuid,p_body text,p_reply_to uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_id uuid;
begin
 if p_reply_to is not null and not exists(
  select 1 from public.member_messages
  where id=p_reply_to and
   ((sender_id=p_sender and recipient_id=p_recipient) or (sender_id=p_recipient and recipient_id=p_sender))
 ) then raise exception 'This message cannot be replied to.'; end if;
 v_id:=public.send_member_message(p_sender,p_recipient,p_body);
 if p_reply_to is not null then
  update public.member_messages set reply_to_id=p_reply_to where id=v_id;
 end if;
 return v_id;
end $$;
revoke all on function public.send_member_reply(uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.send_member_reply(uuid,uuid,text,uuid) to service_role;

create table public.member_message_reactions(
 message_id uuid not null references public.member_messages(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 emoji text not null check (emoji in ('❤️','🔥','😂','👏','👍','😮','😢','💯')),
 created_at timestamptz not null default now(),
 primary key(message_id,user_id)
);
create index member_message_reactions_user_idx on public.member_message_reactions(user_id,message_id);
alter table public.member_message_reactions enable row level security;
revoke all on public.member_message_reactions from anon,authenticated;
grant select,insert,update,delete on public.member_message_reactions to service_role;

create function public.fackts_chat_reaction_event() returns trigger
language plpgsql security invoker set search_path='' as $$
declare v_id uuid;v_sender uuid;v_recipient uuid;
begin
 v_id:=case when tg_op='DELETE' then old.message_id else new.message_id end;
 select sender_id,recipient_id into v_sender,v_recipient from public.member_messages where id=v_id;
 if v_sender is not null then
  begin
   perform realtime.send(jsonb_build_object('senderId',v_sender,'recipientId',v_recipient,'messageId',v_id,'reaction',true),'chat','fm:user:'||v_sender::text,true);
   perform realtime.send(jsonb_build_object('senderId',v_sender,'recipientId',v_recipient,'messageId',v_id,'reaction',true),'chat','fm:user:'||v_recipient::text,true);
  exception when others then
   raise warning 'FACKTS reaction signal unavailable';
  end;
 end if;
 return case when tg_op='DELETE' then old else new end;
end $$;
create trigger fackts_reaction_events after insert or update or delete on public.member_message_reactions
for each row execute function public.fackts_chat_reaction_event();
