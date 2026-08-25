-- 2026-08-25 — Realign Full Body rep prescriptions with the live 4-day split.
--
-- WHY: the 2026-07-24 rebuild built Full Body 1/2/3 by copying the live
-- push/pull rows verbatim, so the two splits ran the same prescription for
-- every shared lift. Nothing keeps them in step afterwards — the app's
-- forward-sync (mirrorWeightsToSharedDays) copies target_weight only, and
-- deliberately leaves the destination day's sets/reps/set_type alone. Three
-- gaps have opened since:
--
--   1. Cable Curls became a 100-rep chipper on Pull A (2026-07-09), but Full
--      Body 1 had copied Pull B's straight 3 x 12-15 version — and the
--      2026-08-07 rebalance then deleted Pull B's copy. The straight-set
--      format now survives only on the 3-day, which is backwards: the
--      chipper is the current prescription for this lift.
--   2. Full Body 3 got PL Incline Bench at 4 x 8-10 from the rebalance, an
--      independently chosen range. Push A and Full Body 1 both run 4 x 8.
--   3. Rope Overhead Extension ran 12-12 on Push A and 12-15 on Push B; Full
--      Body 1 and 3 copied one each. The rebalance cut Push B's copy, so
--      12-12 is the only live range on the 4-day and Full Body 3's 12-15 has
--      no counterpart.
--
-- Set COUNTS are intentionally not touched: Lateral Raises at 6/day on the
-- 4-day vs 4/day on the 3-day (and the rows at 4 vs 3) is the weekly-volume
-- math for different training frequencies, not drift. Bulgarian Split Squat
-- at 8-10 on Full Body 1 and 8-8 on Full Body 3 is likewise faithful — it
-- mirrors Push A and Push B, which differ from each other.
--
-- Only split_day_exercises is written. That is the table the app reads the
-- prescription from (loadProgramFromSupabase reads sets/reps/set_type from
-- here and takes only target_weight from progression_targets), and stale
-- rep values on old progression_targets rows are overwritten from these on
-- the next mirror. Same approach as the 2026-07-09 chipper migration.
--
-- Idempotent. Re-runnable.

-- ============================================================
-- 1. Full Body 1 — Cable Curls to the 100-rep chipper, matching
--    Pull A. Note copied from the 2026-07-09 conversion; the
--    intensifier stays as-is, as it did on Pull A.
-- ============================================================
update split_day_exercises sde
   set set_type        = 'chipper',
       target_sets     = null,
       target_reps_min = 100,
       target_reps_max = 100,
       note            = 'strict — no swinging as it burns'
  from split_days sd
 where sde.split_day_id = sd.id
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key = 'full_body_1'
   and sde.exercise_id = (select id from exercises where name = 'Cable Curls');

-- ============================================================
-- 2. Full Body 3 — PL Incline Bench 8-10 -> 8-8 (Push A range).
-- ============================================================
update split_day_exercises sde
   set target_reps_min = 8,
       target_reps_max = 8
  from split_days sd
 where sde.split_day_id = sd.id
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key = 'full_body_3'
   and sde.exercise_id = (select id from exercises where name = 'Nautilus PL Incline Bench');

-- ============================================================
-- 3. Full Body 3 — Rope Overhead Extension 12-15 -> 12-12
--    (Push A range). The long-head stretch cue is kept.
-- ============================================================
update split_day_exercises sde
   set target_reps_min = 12,
       target_reps_max = 12
  from split_days sd
 where sde.split_day_id = sd.id
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key = 'full_body_3'
   and sde.exercise_id = (select id from exercises where name = 'Cable Rope Overhead Extension');

-- ============================================================
-- 4. Verification — every lift that appears on both splits, with
--    its prescription on each day. Rows sharing an exercise
--    should now agree on set_type and reps.
-- ============================================================
select
  e.name as exercise,
  sd.day_key,
  sde.set_type,
  sde.target_sets as sets,
  sde.target_reps_min as rep_min,
  sde.target_reps_max as rep_max
from split_days sd
join split_day_exercises sde on sde.split_day_id = sd.id
join exercises e            on e.id = sde.exercise_id
where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
  and sd.day_key in ('push_a','push_b','pull_a','pull_b',
                     'full_body_1','full_body_2','full_body_3')
  and e.id in (
    select sde2.exercise_id
    from split_day_exercises sde2
    join split_days sd2 on sd2.id = sde2.split_day_id
    where sd2.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
      and sd2.day_key in ('full_body_1','full_body_2','full_body_3')
  )
order by e.name, sd.sort_order;
