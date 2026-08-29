-- ============================================================
-- PENDING — not yet run against the live Supabase project.
--
-- Adds free-text tagging to items (see supabase/schema.sql for the
-- full up-to-date schema reference). Additive/idempotent, safe to
-- run more than once.
-- ============================================================

alter table items add column if not exists tags text[] not null default '{}';
create index if not exists items_tags_idx on items using gin (tags);
