-- 2026-06-01: Push B — swap Standing Barbell OHP for Nautilus PL Seated Press.
--
-- Shoulder-health driven: seated machine press removes lumbar compression
-- and the overhead-mobility/T-spine demand of standing OHP. Standing OHP
-- kept as an optional alternative via the exercise note (same pattern as
-- Pull A's close-grip V-handle alternative on the lat pulldown).
--
-- Push A keeps Nautilus PL Seated Press unilateral (/side, 3x10).
-- Push B uses it bilateral, 3x8-10, to differentiate the two days.
--
-- Idempotent. Re-runnable.

-- ============================================================
-- 1. Drop the standing OHP row on Push B.
-- ============================================================
delete from split_day_exercises sde
 using split_days sd
 where sde.split_day_id = sd.id
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key = 'push_b'
   and sde.short_id = 'pb_ohp';

-- ============================================================
-- 2. Insert Nautilus PL Seated Press at order 4 (freed slot).
-- ============================================================
insert into split_day_exercises
  (split_day_id, exercise_id, set_type, target_sets, target_reps_min,
   target_reps_max, sort_order, note, short_id, intensifier)
values
  ((select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'push_b'),
   (select id from exercises where name = 'Nautilus PL Seated Press'),
   'straight', 3, 8, 10, 4, 'bilateral; or Standing Barbell OHP if preferred', 'pb_seat_pr', null)
on conflict (split_day_id, short_id) do nothing;

-- ============================================================
-- 3. Seed progression_target for the new exercise on the current cycle.
--    Starting bilateral weight ~100 lb (Push A runs 60/side unilateral).
--    Adjust after first session.
-- ============================================================
insert into progression_targets
  (user_id, exercise_id, split_day_id, week_number, mesocycle, target_weight,
   target_sets, target_reps_min, target_reps_max, target_rir, set_type, source)
select sd.user_id, e.id, sd.id, sd.current_week, 1,
       100::numeric, 3, 8, 10, 2, 'straight', 'migration'
  from split_days sd
  join exercises e on e.name = 'Nautilus PL Seated Press'
 where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key = 'push_b'
on conflict (user_id, exercise_id, split_day_id, week_number, mesocycle) do nothing;
