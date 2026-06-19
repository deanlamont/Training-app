-- 2026-06-09: Add Ab Wheel Rollout to Pull A + Pull B.
-- Slots in as the closer on each day (sort_order 10) — anti-extension
-- core work to replace the Suitcase Carry that was pulled earlier.
-- Idempotent.

insert into split_day_exercises
  (split_day_id, exercise_id, set_type, target_sets, target_reps_min,
   target_reps_max, sort_order, note, short_id, intensifier)
values
  ((select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'pull_a'),
   (select id from exercises where name = 'Ab Wheel Rollout'),
   'straight', 3, 8, 12, 10,
   'From knees. Slow roll out, ribs down, glutes squeezed — don''t let lower back arch. Stop where you control, build range over time.',
   'pla_ab_wheel', null),

  ((select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'pull_b'),
   (select id from exercises where name = 'Ab Wheel Rollout'),
   'straight', 3, 8, 12, 10,
   'From knees. Slow roll out, ribs down, glutes squeezed — don''t let lower back arch. Stop where you control, build range over time.',
   'plb_ab_wheel', null)
on conflict (split_day_id, short_id) do nothing;

-- Seed Cycle 4 progression targets (bodyweight, will progress via reps).
insert into progression_targets
  (user_id, exercise_id, split_day_id, week_number, mesocycle,
   target_weight, target_sets, target_reps_min, target_reps_max,
   target_rir, set_type, source)
values
  ((select id from auth.users where email = 'chadleydean@gmail.com'),
   (select id from exercises where name = 'Ab Wheel Rollout'),
   (select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'pull_a'),
   (select current_week from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'pull_a'),
   1, 0, 3, 8, 12, 2, 'straight', 'seed'),

  ((select id from auth.users where email = 'chadleydean@gmail.com'),
   (select id from exercises where name = 'Ab Wheel Rollout'),
   (select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'pull_b'),
   (select current_week from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'pull_b'),
   1, 0, 3, 8, 12, 2, 'straight', 'seed')
on conflict (user_id, exercise_id, split_day_id, week_number, mesocycle) do nothing;
