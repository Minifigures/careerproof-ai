-- CareerProof AI schema: profiles, RAG chunks, run history.
-- Every table is row-level-secured to the authenticated owner.

create extension if not exists vector;

-- One saved profile per user (the "fill once, reused" career profile).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text default '',
  email text default '',
  phone text default '',
  location text default '',
  links text default '',
  headline text default '',
  summary text default '',
  work_experience text default '',
  education text default '',
  skills text default '',
  projects text default '',
  updated_at timestamptz default now()
);

-- Embeddable slices of the profile (the RAG memory).
create table public.profile_chunks (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  embedding vector(1024),
  created_at timestamptz default now()
);
create index profile_chunks_user_idx on public.profile_chunks (user_id);
create index profile_chunks_fts_idx
  on public.profile_chunks using gin (to_tsvector('english', content));
-- hnsw works on empty tables (ivfflat does not), so it is safe at create time.
create index profile_chunks_embedding_idx
  on public.profile_chunks using hnsw (embedding vector_cosine_ops);

-- Generation history.
create table public.runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  target_role text not null,
  focus text not null,
  job_url text,
  inputs jsonb not null,
  outputs jsonb not null,
  created_at timestamptz default now()
);
create index runs_user_idx on public.runs (user_id, created_at desc);

-- Row level security: a user can only ever touch their own rows.
alter table public.profiles enable row level security;
alter table public.profile_chunks enable row level security;
alter table public.runs enable row level security;

create policy "own_profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own_chunks" on public.profile_chunks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_runs" on public.runs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Vector similarity search, scoped to the caller via auth.uid() (security invoker,
-- so RLS also applies). Returns the most relevant saved-profile chunks.
create or replace function public.match_profile_chunks (
  query_embedding vector(1024),
  match_count int default 6
)
returns table (content text, similarity float)
language sql
stable
as $$
  select content, 1 - (embedding <=> query_embedding) as similarity
  from public.profile_chunks
  where user_id = auth.uid()
    and embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;
