-- 2026-08-07 — Drop Lateral Band Walks entirely.
--
-- Removed from full_body_3 in 2026-08-07_volume_rebalance.sql to hold that
-- session near 26 sets. This removes the last instance, on pull_b.
--
-- WHY: band walks are glute activation rather than a growth stimulus, and the
-- user does activation and prehab work outside the app. Three sets of gym time
-- that isn't buying hypertrophy. Note this trims the glute work added by the
-- 2026-06-09 tennis rebuild — Hip Thrust remains as the direct glute movement,
-- with Bulgarian Split Squat and the RDLs contributing.
--
-- Idempotent. Re-runnable.

-- 1. Remove the exercise from every day it appears on, targets included.
with targets as (
  select sd.id as split_day_id, e.id as exercise_id
  from split_days sd
  join split_day_exercises sde on sde.split_day_id = sd.id
  join exercises e            on e.id = sde.exercise_id
  where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
    and e.name = 'Lateral Band Walks'
),
del_pt as (
  delete from progression_targets pt
   using targets t
   where pt.split_day_id = t.split_day_id
     and pt.exercise_id  = t.exercise_id
  returning 1
)
delete from split_day_exercises sde
 using targets t
 where sde.split_day_id = t.split_day_id
   and sde.exercise_id  = t.exercise_id;

-- 2. Close the gap it left in pull_b's ordering.
update split_day_exercises sde
   set sort_order = 7
from split_days sd, exercises e
where sde.split_day_id = sd.id
  and sde.exercise_id  = e.id
  and sd.day_key = 'pull_b'
  and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
  and e.name = 'Chabbles Workout';

-- 3. Verification.
select
  sd.day_key,
  sde.sort_order as ex_no,
  e.name         as exercise,
  e.muscle_group,
  sde.set_type,
  sde.target_sets as sets
from split_days sd
join split_day_exercises sde on sde.split_day_id = sd.id
join exercises e            on e.id = sde.exercise_id
where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
  and sd.day_key = 'pull_b'
order by sde.sort_order;
