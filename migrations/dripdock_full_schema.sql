-- =====================================================================
-- DripDock — complete backend schema
-- Target: your own Supabase project (sdkkoovlyrcwtuagftnj)
-- Run once in Supabase Dashboard → SQL Editor.
-- Idempotent: safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Shared trigger functions
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. profiles
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  style_notes text,
  home_city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 3. clothing_items
-- ---------------------------------------------------------------------
create table if not exists public.clothing_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  image_url text,
  category text not null,
  brand text,
  color text,
  material text,
  pattern text,
  fit text,
  occasions text[] not null default '{}'::text[],
  seasons text[] not null default '{}'::text[],
  purchase_price numeric,
  purchase_date date,
  favorite boolean not null default false,
  notes text,
  wear_count integer not null default 0,
  last_worn_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.clothing_items to authenticated;
grant all on public.clothing_items to service_role;

alter table public.clothing_items enable row level security;

drop policy if exists "own items" on public.clothing_items;
create policy "own items" on public.clothing_items
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists clothing_items_user_id_idx on public.clothing_items (user_id);
create index if not exists clothing_items_category_idx on public.clothing_items (user_id, category);

drop trigger if exists clothing_items_set_updated_at on public.clothing_items;
create trigger clothing_items_set_updated_at
  before update on public.clothing_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 4. wear_logs
-- ---------------------------------------------------------------------
create table if not exists public.wear_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.clothing_items(id) on delete cascade,
  worn_on date not null default current_date,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.wear_logs to authenticated;
grant all on public.wear_logs to service_role;

alter table public.wear_logs enable row level security;

drop policy if exists "own wear logs" on public.wear_logs;
create policy "own wear logs" on public.wear_logs
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists wear_logs_item_idx on public.wear_logs (item_id);
create index if not exists wear_logs_user_idx on public.wear_logs (user_id, worn_on desc);

-- ---------------------------------------------------------------------
-- 5. outfits
-- ---------------------------------------------------------------------
create table if not exists public.outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  occasion text,
  score integer,
  explanation text,
  item_ids uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.outfits to authenticated;
grant all on public.outfits to service_role;

alter table public.outfits enable row level security;

drop policy if exists "own outfits" on public.outfits;
create policy "own outfits" on public.outfits
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists outfits_user_idx on public.outfits (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- 6. calendar_plans
-- ---------------------------------------------------------------------
create table if not exists public.calendar_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null,
  title text,
  occasion text,
  outfit_id uuid references public.outfits(id) on delete set null,
  item_ids uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.calendar_plans to authenticated;
grant all on public.calendar_plans to service_role;

alter table public.calendar_plans enable row level security;

drop policy if exists "own plans" on public.calendar_plans;
create policy "own plans" on public.calendar_plans
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists calendar_plans_user_date_idx on public.calendar_plans (user_id, plan_date);

-- ---------------------------------------------------------------------
-- 7. wishlist_items
-- ---------------------------------------------------------------------
create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text,
  price numeric,
  store text,
  link text,
  priority text not null default 'Medium',
  notes text,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.wishlist_items to authenticated;
grant all on public.wishlist_items to service_role;

alter table public.wishlist_items enable row level security;

drop policy if exists "own wishlist" on public.wishlist_items;
create policy "own wishlist" on public.wishlist_items
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists wishlist_items_user_idx on public.wishlist_items (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- 8. packing_lists
-- ---------------------------------------------------------------------
create table if not exists public.packing_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  destination text not null,
  weather text,
  duration_days integer not null default 3,
  trip_type text,
  checklist jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.packing_lists to authenticated;
grant all on public.packing_lists to service_role;

alter table public.packing_lists enable row level security;

drop policy if exists "own packing" on public.packing_lists;
create policy "own packing" on public.packing_lists
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists packing_lists_user_idx on public.packing_lists (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- 9. Auto-create a profile row on signup
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 10. Storage: private "wardrobe" bucket, owner-scoped by folder
--     Files are stored at:  <auth.uid()>/<filename>
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('wardrobe', 'wardrobe', false)
on conflict (id) do nothing;

drop policy if exists "wardrobe read own" on storage.objects;
create policy "wardrobe read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'wardrobe' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "wardrobe insert own" on storage.objects;
create policy "wardrobe insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'wardrobe' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "wardrobe update own" on storage.objects;
create policy "wardrobe update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'wardrobe' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'wardrobe' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "wardrobe delete own" on storage.objects;
create policy "wardrobe delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'wardrobe' and auth.uid()::text = (storage.foldername(name))[1]);

-- =====================================================================
-- Done.
-- =====================================================================
