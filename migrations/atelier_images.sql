-- =====================================================================
-- DripDock Atelier — garment image pipeline
-- Target: your Supabase project (sdkkoovlyrcwtuagftnj)
-- Run once in Supabase Dashboard -> SQL Editor. Idempotent.
-- =====================================================================

alter table public.clothing_items
  add column if not exists original_image_url      text,
  add column if not exists extracted_image_url     text,
  add column if not exists refined_image_url       text,
  add column if not exists image_processing_status text not null default 'idle',
  add column if not exists image_processing_stage  text,
  add column if not exists image_processed_at      timestamptz;

-- status: idle | processing | ready | failed | skipped
alter table public.clothing_items
  drop constraint if exists clothing_items_image_processing_status_check;
alter table public.clothing_items
  add constraint clothing_items_image_processing_status_check
  check (image_processing_status in ('idle', 'processing', 'ready', 'failed', 'skipped'));

-- stage: uploading | orienting | extracting | refining | complete
alter table public.clothing_items
  drop constraint if exists clothing_items_image_processing_stage_check;
alter table public.clothing_items
  add constraint clothing_items_image_processing_stage_check
  check (
    image_processing_stage is null
    or image_processing_stage in ('uploading', 'orienting', 'extracting', 'refining', 'complete')
  );

create index if not exists clothing_items_processing_idx
  on public.clothing_items (user_id, image_processing_status);

-- Backfill: existing photos become their own "original".
update public.clothing_items
   set original_image_url = image_url,
       image_processing_status = 'skipped'
 where image_url is not null
   and original_image_url is null;

-- ---------------------------------------------------------------------
-- Storage layout inside the existing private `wardrobe` bucket:
--   <user_id>/<asset_id>/original.jpg
--   <user_id>/<asset_id>/extracted.png
--   <user_id>/<asset_id>/refined.jpg
-- Owner-scoped policies below cover every nested path.
-- ---------------------------------------------------------------------
drop policy if exists "wardrobe owner read" on storage.objects;
create policy "wardrobe owner read" on storage.objects
  for select to authenticated
  using (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "wardrobe owner write" on storage.objects;
create policy "wardrobe owner write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "wardrobe owner update" on storage.objects;
create policy "wardrobe owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "wardrobe owner delete" on storage.objects;
create policy "wardrobe owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = auth.uid()::text);
