-- FACKTS Music: selectable creator hero images and track version notes.
-- Safe to run more than once. Existing Project 001 data is preserved.

alter table public.profiles
  add column if not exists hero_image_url text;

alter table public.project_assets
  add column if not exists version_note text;
