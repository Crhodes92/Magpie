-- Enable UUID extension
create extension if not exists "pgcrypto";
-- Enables similarity() for fuzzy set_name matching in find_set_siblings()
create extension if not exists "pg_trgm";

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists hauls (
  id             uuid primary key default gen_random_uuid(),
  created_by     uuid not null references auth.users(id),
  name           text not null,
  location_label text,
  name_is_auto   boolean not null default true,
  lat            numeric,
  lng            numeric,
  started_at     timestamptz not null default now(),
  ended_at       timestamptz not null default now(),
  notes          text,
  created_at     timestamptz not null default now()
);

create table if not exists profiles (
  id                    uuid primary key references auth.users(id),
  max_bid_pct           numeric not null default 40,
  ebay_ship_from_location text,
  ebay_ship_from_country  text not null default 'US',
  ebay_payment_policy     text,
  ebay_shipping_policy    text,
  ebay_return_policy      text,
  created_at            timestamptz not null default now()
);

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
  haul_id           uuid references hauls(id) on delete set null,
  lat               numeric,
  lng               numeric,
  acquired_price    numeric,
  acquired_at       timestamptz,
  acquired_source   text,
  storage_location  text,
  listed_price      numeric,
  listed_at         date,
  ebay_item_id      text,
  ebay_category_id  text,
  ebay_condition_id smallint,
  sold_price        numeric,
  sold_at           date,
  fees              numeric,
  shipping_cost     numeric,
  notes             text,
  tags              text[] not null default '{}',
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

create or replace view item_financials
  with (security_invoker = true)
as
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
      (i.sold_at - i.acquired_at::date)
    else
      (current_date - i.acquired_at::date)
  end as days_held
from items i
where i.acquired_at is not null;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Finds other items owned by the caller that likely belong to the same
-- card set as p_item_id: an exact set_code match, or a fuzzy set_name
-- match (trigram similarity > 0.35) when set_code isn't available or
-- doesn't match. No SECURITY DEFINER — runs as the calling role, so the
-- items/card_details RLS policies apply exactly as they would to a
-- normal query (a caller can only ever match against their own rows).
create or replace function find_set_siblings(p_item_id uuid)
returns table (
  id uuid,
  title text,
  status text,
  storage_location text,
  haul_id uuid
)
language sql
stable
as $$
  with target as (
    select cd.set_code, cd.set_name
    from items i
    join card_details cd on cd.item_id = i.id
    where i.id = p_item_id
  )
  select i.id, i.title, i.status, i.storage_location, i.haul_id
  from items i
  join card_details cd on cd.item_id = i.id
  cross join target
  where i.id <> p_item_id
    and i.status in ('acquired', 'listed', 'sold')
    and (
      (target.set_code is not null and cd.set_code is not null
        and lower(cd.set_code) = lower(target.set_code))
      or (target.set_name is not null and cd.set_name is not null
        and similarity(cd.set_name, target.set_name) > 0.35)
    )
$$;

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists items_status_idx on items(status);
create index if not exists items_lane_idx on items(lane);
create index if not exists items_created_by_idx on items(created_by);
create index if not exists items_created_at_idx on items(created_at desc);
create index if not exists items_haul_id_idx on items(haul_id);
create index if not exists items_tags_idx on items using gin (tags);
create index if not exists item_photos_item_id_idx on item_photos(item_id);
create index if not exists comps_item_id_idx on comps(item_id);
create index if not exists card_details_set_code_idx on card_details(lower(set_code));
create index if not exists card_details_set_name_trgm_idx on card_details using gin (set_name gin_trgm_ops);
create index if not exists hauls_created_by_idx on hauls(created_by);
create index if not exists hauls_started_at_idx on hauls(started_at desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table hauls enable row level security;
alter table profiles enable row level security;
alter table items enable row level security;
alter table card_details enable row level security;
alter table item_photos enable row level security;
alter table comps enable row level security;

-- Hauls: only creator can read/write
create policy "hauls_owner" on hauls
  for all using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- Profiles: a user can only read/write their own row
create policy "profiles_owner" on profiles
  for all using (auth.uid() = id)
  with check (auth.uid() = id);

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
-- MIGRATION — run this block instead of the CREATE TABLE section
-- above if `items` already exists in your database. Safe to run
-- more than once; the DO blocks skip policies that already exist.
-- ============================================================
--
-- create table if not exists hauls ( ... );          -- see TABLES above
-- create table if not exists profiles ( ... );        -- see TABLES above
--
-- alter table items add column if not exists haul_id uuid references hauls(id) on delete set null;
-- alter table items add column if not exists lat numeric;
-- alter table items add column if not exists lng numeric;
--
-- -- acquired_at: date -> timestamptz. Existing rows land at midnight UTC —
-- -- their time-of-day is unrecoverable, so don't feed pre-migration rows
-- -- into the haul time/distance clustering, only newly-captured ones.
-- alter table items alter column acquired_at type timestamptz using acquired_at::timestamptz;
--
-- create index if not exists items_haul_id_idx on items(haul_id);
-- create index if not exists hauls_created_by_idx on hauls(created_by);
-- create index if not exists hauls_started_at_idx on hauls(started_at desc);
--
-- alter table hauls enable row level security;
-- alter table profiles enable row level security;
--
-- do $$ begin
--   create policy "hauls_owner" on hauls
--     for all using (auth.uid() = created_by)
--     with check (auth.uid() = created_by);
-- exception when duplicate_object then null; end $$;
--
-- do $$ begin
--   create policy "profiles_owner" on profiles
--     for all using (auth.uid() = id)
--     with check (auth.uid() = id);
-- exception when duplicate_object then null; end $$;

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
