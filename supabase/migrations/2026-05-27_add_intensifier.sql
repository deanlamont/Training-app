-- 2026-05-27: Replace myo-rep protocol with Athlean-X intensifier prompts.
-- Adds a free-text `intensifier` column to split_day_exercises so the logger
-- can show a coaching cue (e.g. "Slow 3s eccentric + peak squeeze") on the
-- final set without forcing a fixed multi-set structure.
--
-- Idempotent. Re-runnable.

alter table split_day_exercises
  add column if not exists intensifier text;
