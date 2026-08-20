-- KREYOH role seed: safe to run more than once.
insert into public.roles (name)
select 'A&R'
where not exists (
  select 1 from public.roles where name = 'A&R'
);
