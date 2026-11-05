-- 2026-11-04 — Drop Single-Leg RDL from Full Body 3.
--
-- Added earlier today to lift 3-day hamstring volume; removed at the user's
-- request. Hamstrings on the 3-day split go back to 3 sets/wk (RDL on FB2).
-- Pull B on the 4-day split keeps its Single-Leg RDL. Leg Extensions moves up
-- to fill the gap so sort_order has no hole.
--
-- Idempotent. Re-runnable. Only touches full_body_3.

-- 1. Remove the row and any progression target for it.
with targets as (
  select sd.id as split_day_id, e.id as exercise_id
  from split_days sd
  join exercises e on e.name = 'Single-Leg RDL'
  where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
    and sd.day_key = 'full_body_3'
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

-- 2. Close the ordering gap.
update split_day_exercises sde
   set sort_order = 8
  from split_days sd, exercises e
 where sde.split_day_id = sd.id
   and sde.exercise_id  = e.id
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key = 'full_body_3'
   and e.name = 'Nautilus Leg Extensions';

-- 3. Verification — Full Body 3.
select sde.sort_order as ex_no, e.name as exercise, sde.set_type, sde.optional, sde.target_sets as sets
from split_days sd
join split_day_exercises sde on sde.split_day_id = sd.id
join exercises e            on e.id = sde.exercise_id
where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
  and sd.day_key = 'full_body_3'
order by sde.sort_order;
