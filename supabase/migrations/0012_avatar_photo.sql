-- Lets employees set a real profile photo instead of only colored initials.
alter table people add column if not exists avatar_url text;

-- Public read bucket for avatar images — small, non-sensitive files, so public
-- read is fine; writes still go through the service-role API route only.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Public read avatars" on storage.objects;
create policy "Public read avatars" on storage.objects
  for select using (bucket_id = 'avatars');
