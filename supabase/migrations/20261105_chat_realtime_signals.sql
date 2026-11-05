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
