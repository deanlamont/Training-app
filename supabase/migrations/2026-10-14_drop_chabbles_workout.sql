-- 2026-10-14 — Drop Chabbles Workout entirely.
--
-- Removes the exercise from every day it appears on (pull_a, pull_b,
-- full_body_2), progression targets included. Chabbles Workout is the last
-- item on each of those days, so no sort_order gaps are left mid-session.
--
-- Idempotent. Re-runnable.

-- 1. Remove the exercise from every day it appears on, targets included.
with targets as (
  select sd.id as split_day_id, e.id as exercise_id
  from split_days sd
  join split_day_exercises sde on sde.split_day_id = sd.id
  join exercises e            on e.id = sde.exercise_id
  where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
    and e.name = 'Chabbles Workout'
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

-- 2. Verification — should return zero rows.
select sd.day_key, e.name as exercise
from split_days sd
join split_day_exercises sde on sde.split_day_id = sd.id
join exercises e            on e.id = sde.exercise_id
where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
  and e.name = 'Chabbles Workout';
