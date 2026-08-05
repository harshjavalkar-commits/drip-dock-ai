-- =====================================================================
-- DripDock Atelier — refinement workflow (manual today, AI-ready)
-- Run once in Supabase Dashboard -> SQL Editor. Idempotent.
-- Requires migrations/atelier_images.sql to have been run first.
-- =====================================================================

alter table public.clothing_items
  add column if not exists refinement_status text not null default 'not_started';

alter table public.clothing_items
  drop constraint if exists clothing_items_refinement_status_check;
alter table public.clothing_items
  add constraint clothing_items_refinement_status_check
  check (refinement_status in ('not_started', 'refining', 'refined', 'approved'));

create index if not exists clothing_items_refinement_idx
  on public.clothing_items (user_id, refinement_status);

-- Backfill: anything that already has a refined asset counts as refined.
update public.clothing_items
   set refinement_status = 'refined'
 where refined_image_url is not null
   and refinement_status = 'not_started';
