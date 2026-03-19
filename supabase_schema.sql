-- WhereIsIt 인증/RLS/Storage 스키마

create table if not exists public.items (
  id text primary key,
  user_id uuid not null default auth.uid(),
  name text not null,
  location_path text,
  category text,
  image_paths text[] not null default '{}',
  image_urls text[] not null default '{}', -- 레거시 호환용
  notes text[] not null default '{}',
  is_secret boolean not null default false,
  updated_at bigint
);

alter table public.items enable row level security;

drop policy if exists "Public Access" on public.items;
drop policy if exists "Users can view their own items" on public.items;
drop policy if exists "Users can insert their own items" on public.items;
drop policy if exists "Users can update their own items" on public.items;
drop policy if exists "Users can delete their own items" on public.items;

create policy "Users can view their own items"
on public.items
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own items"
on public.items
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own items"
on public.items
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own items"
on public.items
for delete
to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', false)
on conflict (id) do nothing;

drop policy if exists "Users can read their own images" on storage.objects;
drop policy if exists "Users can upload their own images" on storage.objects;
drop policy if exists "Users can update their own images" on storage.objects;
drop policy if exists "Users can delete their own images" on storage.objects;

create policy "Users can read their own images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'item-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can upload their own images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'item-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update their own images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'item-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'item-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete their own images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'item-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
