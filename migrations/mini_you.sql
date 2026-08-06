-- =====================================================================
-- DripDock MiniYou V1 — the user's permanent digital fashion identity.
-- Run once in Supabase Dashboard -> SQL Editor. Idempotent.
-- =====================================================================

create table if not exists public.mini_you_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  image_url text,
  prompt text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mini_you_profiles
  drop constraint if exists mini_you_profiles_status_check;
alter table public.mini_you_profiles
  add constraint mini_you_profiles_status_check
  check (status in ('draft', 'ready'));

grant select, insert, update, delete on public.mini_you_profiles to authenticated;
grant all on public.mini_you_profiles to service_role;

alter table public.mini_you_profiles enable row level security;

drop policy if exists "own mini you" on public.mini_you_profiles;
create policy "own mini you" on public.mini_you_profiles
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists mini_you_updated on public.mini_you_profiles;
create trigger mini_you_updated
  before update on public.mini_you_profiles
  for each row execute function public.set_updated_at();

-- Future wearable assets. The real garment photo stays the source of truth;
-- this column only ever holds an optional MiniYou-ready layer render.
alter table public.clothing_items
  add column if not exists mini_you_layer_url text;
