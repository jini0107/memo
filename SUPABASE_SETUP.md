
# Supabase Database Setup

To make the memo app work with Supabase, you need to create the `items` table in your Supabase project.

1.  Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2.  Select your project: `ydnipmigaantoysqywka`.
3.  Go to the **SQL Editor** (item in the left sidebar).
4.  Click **New Query**.
5.  Paste user the following SQL and click **Run**:

```sql
-- Create the items table
create table public.items (
  id text primary key,
  name text not null,
  location_path text,
  category text,
  image_urls text[] default '{}',
  notes text[] default '{}',
  updated_at bigint
);

-- Enable Row Level Security (RLS)
alter table public.items enable row level security;

-- Create a policy to allow anyone to read/write (for development)
-- WARNING: For production, you should restrict this to authenticated users
create policy "Public Access"
on public.items
for all
using (true)
with check (true);
```

6.  Now your app will automatically sync with this table!
