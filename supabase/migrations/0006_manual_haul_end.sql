-- ============================================================
-- PENDING — not yet run against the live Supabase project.
--
-- Lets a haul be manually ended so new scouted items stop
-- auto-joining it even if within the time/distance clustering
-- threshold. Additive/idempotent, safe to run more than once.
-- ============================================================

alter table hauls add column if not exists ended boolean not null default false;
