-- 2026-06-19: Sync target weights for exercises that appear on multiple days.
--
-- progression_targets is keyed per (user, exercise, split_day, week). When a
-- session writes a new target, only that one day's row updates — so the same
-- exercise on another day drifts. Forward-sync is enforced in app code
-- (saveSessionTargets + EditScreen); this migration is the one-time backfill
-- that brings the database into alignment.
--
-- Rules:
--   1. Nautilus PL Seated Press is tracked per-side (60lb / side) on both
--      Push A and Push B. The old "bilateral 100" entry on Push B was a
--      different unit convention — normalize both days to 60/side.
--   2. For every other exercise that appears on more than one split_day,
--      take the MAX target_weight across each day's current_week row and
--      write that max back to every day's current_week row.
--
-- Idempotent: re-running is a no-op once weights are aligned.

-- 1. Nautilus PL Seated Press: standardize on 60 per side on both days.
update split_day_exercises sde
   set note = '/side'
  from split_days sd, exercises e
 where sde.split_day_id = sd.id
   and sde.exercise_id = e.id
   and e.name = 'Nautilus PL Seated Press'
   and sde.note is distinct from '/side';

update progression_targets pt
   set target_weight = 60
  from split_days sd, exercises e
 where pt.split_day_id = sd.id
   and pt.exercise_id = e.id
   and e.name = 'Nautilus PL Seated Press'
   and pt.week_number = sd.current_week
   and pt.mesocycle = 1
   and pt.target_weight is distinct from 60;

-- 2. Backfill highest-weight-wins for all OTHER shared exercises at each
--    day's current week. Seated Press is excluded (handled above) because
--    its old Push B value was in a different unit (total vs per-side).
with current_week_targets as (
  select pt.id,
         pt.user_id,
         pt.exercise_id,
         pt.split_day_id,
         pt.target_weight
    from progression_targets pt
    join split_days sd on sd.id = pt.split_day_id
    join exercises e on e.id = pt.exercise_id
   where pt.week_number = sd.current_week
     and pt.mesocycle = 1
     and e.name <> 'Nautilus PL Seated Press'
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
