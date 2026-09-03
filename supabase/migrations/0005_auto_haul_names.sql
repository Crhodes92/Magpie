-- ============================================================
-- PENDING — not yet run against the live Supabase project.
--
-- Supports automated haul naming from location + item contents.
-- Additive/idempotent, safe to run more than once.
-- ============================================================

alter table hauls add column if not exists location_label text;
alter table hauls add column if not exists name_is_auto boolean not null default true;
