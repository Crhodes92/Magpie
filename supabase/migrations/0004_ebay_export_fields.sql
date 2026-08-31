-- ============================================================
-- PENDING — not yet run against the live Supabase project.
--
-- Adds the fields needed to generate an eBay bulk-listing CSV
-- (Seller Hub Reports "create new listings" upload). Additive/
-- idempotent, safe to run more than once.
-- ============================================================

-- Account-level defaults: set once in Settings, reused on every export row.
alter table profiles add column if not exists ebay_ship_from_location text;
alter table profiles add column if not exists ebay_ship_from_country text not null default 'US';
alter table profiles add column if not exists ebay_payment_policy text;
alter table profiles add column if not exists ebay_shipping_policy text;
alter table profiles add column if not exists ebay_return_policy text;

-- Per-item: eBay's numeric leaf category ID and condition ID. No reliable
-- way to auto-derive these from our free-text category/condition_note, so
-- they're user-set fields rather than computed ones.
alter table items add column if not exists ebay_category_id text;
alter table items add column if not exists ebay_condition_id smallint;
