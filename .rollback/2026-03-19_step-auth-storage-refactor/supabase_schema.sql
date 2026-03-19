-- 1. items 테이블 생성
create table public.items (
  id text primary key,
  name text not null,
  location_path text,
  category text,
  image_urls text[] default '{}',
  notes text[] default '{}',
  is_secret boolean not null default false,
  updated_at bigint
);

-- 2. Row Level Security (RLS) 활성화
alter table public.items enable row level security;

-- 3. 현재 앱은 인증 기능이 없어 임시 공개 정책을 유지합니다.
-- 실제 서비스 전환 시에는 auth.uid() 기반 사용자별 정책으로 반드시 교체해야 합니다.
create policy "Public Access" 
on public.items 
for all 
using (true) 
with check (true);

-- 권장 예시 (인증 시스템 추가 후 적용)
-- alter table public.items add column user_id uuid not null default auth.uid();
-- create policy "Users can manage their own items"
-- on public.items
-- for all
-- using (auth.uid() = user_id)
-- with check (auth.uid() = user_id);
