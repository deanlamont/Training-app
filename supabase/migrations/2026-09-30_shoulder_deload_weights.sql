-- 2026-09-30: Shoulder deload after a week off — reset pressing/extension loads.
-- Nautilus PL Incline Bench       -> 70
-- Cable Rope Overhead Extension   -> 44
-- Updates the current-week progression target on every day the exercise
-- appears, so the next session load starts from the new weight.
-- Idempotent.

update progression_targets pt
   set target_weight = case e.name
         when 'Nautilus PL Incline Bench'     then 70
         when 'Cable Rope Overhead Extension' then 44
       end
  from split_days sd, exercises e
 where pt.split_day_id = sd.id
   and pt.exercise_id = e.id
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and pt.week_number = sd.current_week
   and pt.mesocycle = 1
   and e.name in ('Nautilus PL Incline Bench', 'Cable Rope Overhead Extension');
