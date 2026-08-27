-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists items (
  id                uuid primary key default gen_random_uuid(),
  status            text not null default 'scouted'
                      check (status in ('scouted','passed','acquired','listed','sold','scrapped')),
  lane              text not null default 'general'
                      check (lane in ('card','general')),
  title             text,
  category          text,
  brand             text,
  model             text,
  condition_note    text,
  ai_identification jsonb,
  ai_confidence     numeric,
  est_value_low     numeric,
  est_value_high    numeric,
  max_bid           numeric,
  acquired_price    numeric,
  acquired_at       date,
  acquired_source   text,
  storage_location  text,
  listed_price      numeric,
  listed_at         date,
  ebay_item_id      text,
  sold_price        numeric,
  sold_at           date,
  fees              numeric,
  shipping_cost     numeric,
  notes             text,
  created_by        uuid not null references auth.users(id),
  created_at        timestamptz not null default now()
);

create table if not exists card_details (
  item_id      uuid primary key references items(id) on delete cascade,
  set_name     text,
  set_code     text,
  card_number  text,
  card_name    text,
  language     text default 'EN',
  printing     text,
  is_graded    boolean default false,
  grader       text,
  grade        numeric
);

create table if not exists item_photos (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references items(id) on delete cascade,
  url         text not null,
  is_primary  boolean default false,
  created_at  timestamptz not null default now()
);

create table if not exists comps (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null references items(id) on delete cascade,
  source       text not null default 'manual'
                 check (source in ('ebay_sold','tcgplayer','pricecharting','manual')),
  price        numeric not null,
  condition    text,
  sold_at      date,
  url          text,
  captured_at  timestamptz not null default now()
);

-- ============================================================
-- VIEWS
-- ============================================================

create or replace view item_financials as
select
  i.id,
  i.title,
  i.lane,
  i.category,
  i.status,
  i.acquired_price,
  i.sold_price,
  i.fees,
  i.shipping_cost,
  i.acquired_at,
  i.sold_at,
  i.created_by,
  (i.sold_price - i.acquired_price - coalesce(i.fees, 0) - coalesce(i.shipping_cost, 0)) as profit,
  case
    when i.acquired_price > 0 then
      round(((i.sold_price - i.acquired_price - coalesce(i.fees, 0) - coalesce(i.shipping_cost, 0))
             / i.acquired_price) * 100, 1)
    else null
  end as roi_pct,
  case
    when i.sold_at is not null and i.acquired_at is not null then
      (i.sold_at - i.acquired_at)
    else
      (current_date - i.acquired_at)
  end as days_held
from items i
where i.acquired_at is not null;

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists items_status_idx on items(status);
create index if not exists items_lane_idx on items(lane);
create index if not exists items_created_by_idx on items(created_by);
create index if not exists items_created_at_idx on items(created_at desc);
create index if not exists item_photos_item_id_idx on item_photos(item_id);
create index if not exists comps_item_id_idx on comps(item_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table items enable row level security;
alter table card_details enable row level security;
alter table item_photos enable row level security;
alter table comps enable row level security;

-- Items: only creator can read/write
create policy "items_owner" on items
  for all using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- Card details: inherit from items (item creator only)
create policy "card_details_owner" on card_details
  for all using (
    exists (select 1 from items where items.id = card_details.item_id and items.created_by = auth.uid())
  )
  with check (
    exists (select 1 from items where items.id = card_details.item_id and items.created_by = auth.uid())
  );

-- Photos: inherit from items
create policy "item_photos_owner" on item_photos
  for all using (
    exists (select 1 from items where items.id = item_photos.item_id and items.created_by = auth.uid())
  )
  with check (
    exists (select 1 from items where items.id = item_photos.item_id and items.created_by = auth.uid())
  );

-- Comps: inherit from items
create policy "comps_owner" on comps
  for all using (
    exists (select 1 from items where items.id = comps.item_id and items.created_by = auth.uid())
  )
  with check (
    exists (select 1 from items where items.id = comps.item_id and items.created_by = auth.uid())
  );

-- ============================================================
-- STORAGE BUCKET (run after schema)
-- ============================================================
-- In the Supabase dashboard, create a bucket named "item-photos"
-- with public access OFF, then run:
--
-- create policy "item_photos_upload" on storage.objects
--   for insert to authenticated
--   with check (bucket_id = 'item-photos');
--
-- create policy "item_photos_read" on storage.objects
--   for select to authenticated
--   using (bucket_id = 'item-photos');
--
-- create policy "item_photos_delete" on storage.objects
--   for delete to authenticated
--   using (bucket_id = 'item-photos');
