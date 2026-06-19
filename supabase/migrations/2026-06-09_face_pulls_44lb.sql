-- 2026-06-09: Set Cable Face Pulls to 44lb on both pull days.
-- Updates the current-week progression target on each day, so the next
-- session load shows 44lb as the starting weight.
-- Idempotent.

update progression_targets pt
   set target_weight = 44
  from split_days sd, exercises e
 where pt.split_day_id = sd.id
   and pt.exercise_id = e.id
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key in ('pull_a', 'pull_b')
   and pt.week_number = sd.current_week
   and pt.mesocycle = 1
   and e.name = 'Cable Face Pulls';
