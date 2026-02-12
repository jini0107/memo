-- 1. items 테이블 생성
create table public.items (
  id text primary key,
  name text not null,
  location_path text,
  category text,
  image_urls text[] default '{}',
  notes text[] default '{}',
  updated_at bigint
);

-- 2. Row Level Security (RLS) 활성화
alter table public.items enable row level security;

-- 3. 테스트를 위한 공개 접근 정책 생성 (누구나 읽기/쓰기 가능)
-- 주의: 실제 서비스 런칭 시에는 인증된 사용자만 접근하도록 수정해야 합니다.
create policy "Public Access" 
on public.items 
for all 
using (true) 
with check (true);
