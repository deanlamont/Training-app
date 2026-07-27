-- Read-only diagnostic: dump the current live plan for the 4 gym days.
-- Nothing is modified. Run in the Supabase SQL editor and paste the result back.
--
-- WHY THIS EXISTS: src/utils/seedUserData.js is the ORIGINAL seed and has
-- drifted from the live database (migrations + in-app edits changed the plan
-- without updating that file). Anything built off the seed file will be wrong.
-- This query is the source of truth for what is actually being trained.

select
  sd.sort_order        as day_no,
  sd.day_key,
  sd.day_label,
  sd.current_week      as week,
  sde.sort_order       as ex_no,
  e.name               as exercise,
  sde.set_type,
  sde.target_sets      as sets,
  sde.target_reps_min  as rep_min,
  sde.target_reps_max  as rep_max,
  pt.target_weight     as weight
from split_days sd
join split_day_exercises sde on sde.split_day_id = sd.id
join exercises e            on e.id = sde.exercise_id
left join progression_targets pt
       on pt.split_day_id = sd.id
      and pt.exercise_id  = sde.exercise_id
      and pt.week_number  = sd.current_week
      and pt.mesocycle    = 1
where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
  and sd.day_key in ('push_a', 'push_b', 'pull_a', 'pull_b')
order by sd.sort_order, sde.sort_order;
