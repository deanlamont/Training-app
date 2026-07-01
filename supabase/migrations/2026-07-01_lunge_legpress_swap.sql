-- 2026-07-01: Swap Weighted Lunges -> Bulgarian Split Squat (Push A), and
-- Nautilus Xpload Leg Press Incline -> Nautilus Leg Extensions (Push A + Push B).
--
-- WHY: Push A currently runs Weighted Lunges on its own, separate from the
-- Bulgarian Split Squat already tracked on Push B. Pointing Push A's slot at
-- the SAME exercise_id (rather than adding a new row) means the two days
-- share one progression history and pick up the existing weight-sync
-- machinery (forward-sync in app code + the 2026-06-19 backfill migration)
-- automatically. Leg Press Xpload -> Leg Extensions on both Push A and B for
-- the same reason: both slots now point at one shared, synced exercise.
--
-- Implemented as in-place exercise_id swaps on the existing
-- split_day_exercises rows (preserves sort_order/sets/reps), plus updating
-- progression_targets rows so future-week targets follow the new exercise.
-- set_logs is untouched — historical sessions keep referencing whatever
-- exercise was actually logged at the time.
--
-- Idempotent. Re-runnable.

-- ============================================================
-- 1. PUSH A — Weighted Lunges -> Bulgarian Split Squat.
-- ============================================================
update split_day_exercises sde
   set exercise_id = (select id from exercises where name = 'Bulgarian Split Squat'),
       short_id = 'pa_bulgarian',
       note = '/leg. Rear foot elevated on bench. Front shin vertical, drop straight down. Bodyweight to start, add DBs as it gets easy.'
  from split_days sd
 where sde.split_day_id = sd.id
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key = 'push_a'
   and sde.exercise_id = (select id from exercises where name = 'Weighted Lunges');

update progression_targets pt
   set exercise_id = (select id from exercises where name = 'Bulgarian Split Squat')
  from split_days sd
 where pt.split_day_id = sd.id
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key = 'push_a'
   and pt.exercise_id = (select id from exercises where name = 'Weighted Lunges')
   and not exists (
     select 1 from progression_targets pt2
      where pt2.user_id = pt.user_id
        and pt2.split_day_id = pt.split_day_id
        and pt2.week_number = pt.week_number
        and pt2.mesocycle = pt.mesocycle
        and pt2.exercise_id = (select id from exercises where name = 'Bulgarian Split Squat')
   );

-- ============================================================
-- 2. PUSH A + PUSH B — Nautilus Xpload Leg Press Incline -> Nautilus Leg Extensions.
-- ============================================================
update split_day_exercises sde
   set exercise_id = (select id from exercises where name = 'Nautilus Leg Extensions'),
       short_id = sd.day_key || '_leg_ext',
       set_type = 'straight',
       target_reps_min = 12,
       target_reps_max = 15,
       intensifier = 'Slow 3s eccentric + 1s squeeze at top',
       note = null
  from split_days sd
 where sde.split_day_id = sd.id
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key in ('push_a', 'push_b')
   and sde.exercise_id = (select id from exercises where name = 'Nautilus Xpload Leg Press Incline');

update progression_targets pt
   set exercise_id = (select id from exercises where name = 'Nautilus Leg Extensions'),
       target_reps_min = 12,
       target_reps_max = 15
  from split_days sd
 where pt.split_day_id = sd.id
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key in ('push_a', 'push_b')
   and pt.exercise_id = (select id from exercises where name = 'Nautilus Xpload Leg Press Incline')
   and not exists (
     select 1 from progression_targets pt2
      where pt2.user_id = pt.user_id
        and pt2.split_day_id = pt.split_day_id
        and pt2.week_number = pt.week_number
        and pt2.mesocycle = pt.mesocycle
        and pt2.exercise_id = (select id from exercises where name = 'Nautilus Leg Extensions')
   );

-- ============================================================
-- 3. Sync current-week weight across both days for each now-shared exercise
--    (same backfill logic as 2026-06-19_sync_shared_exercise_weights.sql).
-- ============================================================
with current_week_targets as (
  select pt.id, pt.user_id, pt.exercise_id, pt.split_day_id, pt.target_weight
    from progression_targets pt
    join split_days sd on sd.id = pt.split_day_id
    join exercises e on e.id = pt.exercise_id
   where pt.week_number = sd.current_week
     and pt.mesocycle = 1
     and e.name in ('Bulgarian Split Squat', 'Nautilus Leg Extensions')
     and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
),
shared as (
  select user_id, exercise_id, max(target_weight) as max_w
    from current_week_targets
   group by user_id, exercise_id
  having count(distinct split_day_id) > 1
)
update progression_targets pt
   set target_weight = s.max_w
  from shared s, split_days sd
 where pt.user_id = s.user_id
   and pt.exercise_id = s.exercise_id
   and pt.split_day_id = sd.id
   and pt.week_number = sd.current_week
   and pt.mesocycle = 1
   and pt.target_weight is distinct from s.max_w;
