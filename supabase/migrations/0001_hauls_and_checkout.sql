-- ============================================================
-- PENDING — not yet run against the live Supabase project.
--
-- Supports the Hauls & Checkout feature (see supabase/schema.sql
-- for the full up-to-date schema reference). Run this against the
-- project's SQL editor when ready — it's additive/idempotent and
-- safe to run more than once. Run the two blocks in order; the
-- view depends on acquired_at already being timestamptz.
-- ============================================================

-- 1. New tables + columns + policies -----------------------------

create table if not exists hauls (
  id           uuid primary key default gen_random_uuid(),
  created_by   uuid not null references auth.users(id),
  name         text not null,
  lat          numeric,
  lng          numeric,
  started_at   timestamptz not null default now(),
  ended_at     timestamptz not null default now(),
  notes        text,
  created_at   timestamptz not null default now()
);

create table if not exists profiles (
  id           uuid primary key references auth.users(id),
  max_bid_pct  numeric not null default 40,
  created_at   timestamptz not null default now()
);

alter table items add column if not exists haul_id uuid references hauls(id) on delete set null;
alter table items add column if not exists lat numeric;
alter table items add column if not exists lng numeric;

-- date -> timestamptz. Existing rows land at midnight UTC — their time-of-day
-- is unrecoverable, so pre-migration rows won't feed haul clustering usefully,
-- only newly-captured ones going forward will.
--
-- item_financials (if it already exists from an earlier schema.sql run) reads
-- acquired_at and blocks the type change with "cannot alter type of a column
-- used by a view or rule" — drop it here, block 2 recreates it below.
drop view if exists item_financials;
alter table items alter column acquired_at type timestamptz using acquired_at::timestamptz;

create index if not exists items_haul_id_idx on items(haul_id);
create index if not exists hauls_created_by_idx on hauls(created_by);
create index if not exists hauls_started_at_idx on hauls(started_at desc);

alter table hauls enable row level security;
alter table profiles enable row level security;

do $$ begin
  create policy "hauls_owner" on hauls
    for all using (auth.uid() = created_by)
    with check (auth.uid() = created_by);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "profiles_owner" on profiles
    for all using (auth.uid() = id)
    with check (auth.uid() = id);
exception when duplicate_object then null; end $$;

-- 2. item_financials view fix --------------------------------------
-- days_held used to be `date - date` (integer). With acquired_at now
-- timestamptz, the same subtraction silently becomes an interval unless
-- cast back to date. create or replace is safe to rerun.

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
