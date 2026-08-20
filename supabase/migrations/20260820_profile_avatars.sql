-- KREYOH self-profile photo support.
-- Photos are public profile artwork; writes are restricted to the signed-in
-- user's own folder, and the app never uses a service-role key in the browser.

insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', true)
on conflict (id) do update set public = true;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Profile avatars are publicly readable'
  ) then
    create policy "Profile avatars are publicly readable"
      on storage.objects for select
      using (bucket_id = 'profile-avatars');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users upload their own profile avatar'
  ) then
    create policy "Users upload their own profile avatar"
      on storage.objects for insert to authenticated
      with check (
        bucket_id = 'profile-avatars'
        and (storage.foldername(name))[1] = (select auth.uid()::text)
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users update their own profile avatar'
  ) then
    create policy "Users update their own profile avatar"
      on storage.objects for update to authenticated
      using (
        bucket_id = 'profile-avatars'
        and (storage.foldername(name))[1] = (select auth.uid()::text)
      )
      with check (
        bucket_id = 'profile-avatars'
        and (storage.foldername(name))[1] = (select auth.uid()::text)
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users delete their own profile avatar'
  ) then
    create policy "Users delete their own profile avatar"
      on storage.objects for delete to authenticated
      using (
        bucket_id = 'profile-avatars'
        and (storage.foldername(name))[1] = (select auth.uid()::text)
      );
  end if;
end
$$;
