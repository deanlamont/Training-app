-- 2026-06-09: Drop Band Pull-aparts from Push A + Push B.
-- They were the warmup/prehab slot at sort_order 1; cutting them entirely.
-- Idempotent.

delete from progression_targets pt
 using split_day_exercises sde, split_days sd, exercises e
 where pt.split_day_id = sd.id and pt.exercise_id = e.id
   and sde.split_day_id = sd.id and sde.exercise_id = e.id
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key in ('push_a', 'push_b')
   and e.name = 'Band Pull-apart';

delete from split_day_exercises sde
 using split_days sd, exercises e
 where sde.split_day_id = sd.id and sde.exercise_id = e.id
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key in ('push_a', 'push_b')
   and e.name = 'Band Pull-apart';
