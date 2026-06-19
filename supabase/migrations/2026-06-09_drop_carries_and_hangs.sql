-- 2026-06-09: Drop Suitcase Carry from Pull A + Pull B; drop Dead Hang from Pull A.
-- Leaves the Day 5 Bar Hang reference entry intact (longevity content, not a workout set).
-- Idempotent.

delete from progression_targets pt
 using split_day_exercises sde, split_days sd, exercises e
 where pt.split_day_id = sd.id and pt.exercise_id = e.id
   and sde.split_day_id = sd.id and sde.exercise_id = e.id
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and (
     (sd.day_key in ('pull_a', 'pull_b') and e.name = 'Suitcase Carry')
     or (sd.day_key = 'pull_a' and e.name = 'Dead Hang')
   );

delete from split_day_exercises sde
 using split_days sd, exercises e
 where sde.split_day_id = sd.id and sde.exercise_id = e.id
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and (
     (sd.day_key in ('pull_a', 'pull_b') and e.name = 'Suitcase Carry')
     or (sd.day_key = 'pull_a' and e.name = 'Dead Hang')
   );
