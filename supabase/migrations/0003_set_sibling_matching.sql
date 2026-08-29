-- ============================================================
-- PENDING — not yet run against the live Supabase project.
--
-- Upgrades tag-suggestion matching from exact set_name string equality
-- to: exact set_code match, or fuzzy set_name match (trigram similarity)
-- as a fallback. Additive/idempotent, safe to run more than once.
-- ============================================================

create extension if not exists "pg_trgm";

create index if not exists card_details_set_code_idx on card_details(lower(set_code));
create index if not exists card_details_set_name_trgm_idx on card_details using gin (set_name gin_trgm_ops);

-- No SECURITY DEFINER — runs as the calling role, so items/card_details
-- RLS policies apply exactly as they would to a normal query (a caller
-- can only ever match against their own rows).
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
