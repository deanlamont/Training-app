-- 2026-05-27: Add Pull-up as Pull A opener (Cavaliere: nothing replaces
-- bodyweight pull-ups for lat development + V-taper). Remove Leg Extensions
-- from Push A to keep session under the Athlean ~30-min cap (leg ext stays
-- on Push B). Weight = 0 means bodyweight; log added weight as positive.
--
-- Idempotent. Re-runnable.

-- 1. Add Pull-up to the exercises master.
insert into exercises (name, equipment_category, muscle_group, movement_type, weight_increment)
values ('Pull-up', 'free_weight', 'back', 'compound', 5)
on conflict (name) do nothing;

-- 2. Remove Push A Leg Extensions for this user.
delete from split_day_exercises sde
 using split_days sd
 where sde.split_day_id = sd.id
   and sd.user_id   = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key   = 'push_a'
   and sde.short_id = 'pa_leg_ext';

-- 3. Insert Pull-up as the Pull A opener (sort_order 0 sorts first).
insert into split_day_exercises
  (split_day_id, exercise_id, set_type, target_sets, target_reps_min,
   target_reps_max, sort_order, note, short_id, intensifier)
select sd.id,
       (select id from exercises where name = 'Pull-up'),
       'straight',
       3,
       5,
       10,
       0,
       'bodyweight (+/- assist)',
       'pla_pullup',
       null
  from split_days sd
 where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key = 'pull_a'
on conflict (split_day_id, short_id) do nothing;

-- 4. Seed Pull-up target on the current cycle of Pull A.
insert into progression_targets
  (user_id, exercise_id, split_day_id, week_number, mesocycle, target_weight,
   target_sets, target_reps_min, target_reps_max, target_rir, set_type, source)
select sd.user_id,
       (select id from exercises where name = 'Pull-up'),
       sd.id,
       sd.current_week,
       1,
       0,
       3,
       5,
       10,
       2,
       'straight',
       'migration'
  from split_days sd
 where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key = 'pull_a'
on conflict (user_id, exercise_id, split_day_id, week_number, mesocycle) do nothing;
