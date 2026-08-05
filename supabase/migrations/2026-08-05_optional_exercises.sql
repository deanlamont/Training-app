-- 2026-08-05 — Optional exercises
--
-- Adds `optional` to split_day_exercises. An optional exercise stays in the
-- plan but does not count toward session completion: the progress bar and the
-- finish-session summary track core work only, so skipping it still reads as a
-- full day. Progression already holds the weight on an unlogged exercise
-- (progression.js decideOne → status 'skipped'), so an optional lift that goes
-- untouched for weeks keeps its target rather than drifting.
--
-- Marks the two DB chest presses optional: the plate-loaded presses are now the
-- main chest work, and the DBs are there for days with time to spare.
--
-- Re-runnable.

alter table split_day_exercises
  add column if not exists optional boolean not null default false;

update split_day_exercises sde
set optional = true
from exercises e, split_days sd
where sde.exercise_id = e.id
  and sde.split_day_id = sd.id
  and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
  and e.name in ('DB Flat Bench', 'DB 45 Degree Incline');

-- Verification: every day, with each exercise's optional flag.
select
  sd.sort_order   as day_no,
  sd.day_label,
  sde.sort_order  as ex_no,
  e.name          as exercise,
  sde.optional
from split_days sd
join split_day_exercises sde on sde.split_day_id = sd.id
join exercises e            on e.id = sde.exercise_id
where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
order by sd.sort_order, sde.sort_order;
