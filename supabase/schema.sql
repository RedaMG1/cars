-- Run this once in the Supabase dashboard: your project > SQL Editor > New query > Run.

create table if not exists cars (
  id bigint generated always as identity primary key,
  model text not null,
  brand text,
  note double precision,
  year integer,
  price integer,
  km integer,
  engine text,
  power integer,
  city text,
  pros text,
  cons text,
  guid text unique,
  url text,
  img text,
  source_tag text not null default 'custom',
  created_at timestamptz not null default now()
);

-- Row Level Security: the browser (anon key) may only read. Writes go
-- through /api/import or scripts/seed.ts, both using the service role key,
-- which bypasses RLS entirely — so no insert/update/delete policy is
-- granted to anon on purpose.
alter table cars enable row level security;

create policy "Public read access"
  on cars for select
  to anon
  using (true);
