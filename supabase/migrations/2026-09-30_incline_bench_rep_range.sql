-- 2026-09-30: Shoulder deload — incline bench moves to 4 x 10-12.
-- Lighter load, more reps. Updates the roster rows (what the app loads) and
-- the current-week progression targets on every day the lift appears.
-- Idempotent.

update split_day_exercises sde
   set target_sets = 4,
       target_reps_min = 10,
       target_reps_max = 12
  from split_days sd, exercises e
 where sde.split_day_id = sd.id
   and sde.exercise_id = e.id
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and e.name = 'Nautilus PL Incline Bench';

update progression_targets pt
   set target_sets = 4,
       target_reps_min = 10,
       target_reps_max = 12
  from split_days sd, exercises e
 where pt.split_day_id = sd.id
   and pt.exercise_id = e.id
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and pt.week_number = sd.current_week
   and pt.mesocycle = 1
   and e.name = 'Nautilus PL Incline Bench';
