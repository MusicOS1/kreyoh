-- Public song conversations. Read/write through authenticated server actions only.
-- Keeps profile details private: only public display names are returned by the server.
create table if not exists public.music_release_comments (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.music_releases(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.music_release_comments(id) on delete set null,
  body text not null check (char_length(btrim(body)) between 1 and 600),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists music_release_comments_release_created_idx
  on public.music_release_comments (release_id, created_at desc);
create index if not exists music_release_comments_author_created_idx
  on public.music_release_comments (author_id, created_at desc);
create index if not exists music_release_comments_parent_idx
  on public.music_release_comments (parent_id) where parent_id is not null;

alter table public.music_release_comments enable row level security;
revoke all on public.music_release_comments from public, anon, authenticated;
grant select, insert, update, delete on public.music_release_comments to service_role;
