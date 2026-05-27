-- 2026-05-27: Add Kettlebell Swing conditioning finisher on every training day.
-- Drop Pallof Press from Pull A and Pull B (user preference).
--
-- KB swings: Cavaliere-style metabolic finisher — hip-hinge ballistic that
-- spikes heart rate, hits posterior chain, and runs ~3 minutes total. Fits
-- the Athlean "15min conditioning after lifting" prescription.
--
-- Idempotent. Re-runnable.

-- 1. Add Kettlebell Swing to the exercises master.
insert into exercises (name, equipment_category, muscle_group, movement_type, weight_increment)
values ('Kettlebell Swing', 'specialty', 'glutes', 'compound', 5)
on conflict (name) do nothing;

-- 2. Drop Pallof Press rows from Pull A and Pull B for this user.
delete from split_day_exercises sde
 using split_days sd
 where sde.split_day_id = sd.id
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key in ('pull_a', 'pull_b')
   and sde.short_id in ('pla_pallof', 'plb_pallof');

-- 3. Append Kettlebell Swing as the final exercise on every day.
insert into split_day_exercises
  (split_day_id, exercise_id, set_type, target_sets, target_reps_min,
   target_reps_max, sort_order, note, short_id, intensifier)
select sd.id,
       (select id from exercises where name = 'Kettlebell Swing'),
       'straight',
       3,
       15,
       20,
       case sd.day_key
         when 'push_a' then 11
         when 'push_b' then 10
         when 'pull_a' then 9
         when 'pull_b' then 9
         when 'day_5'  then 8
       end,
       'conditioning finisher',
       case sd.day_key
         when 'push_a' then 'pa_kb'
         when 'push_b' then 'pb_kb'
         when 'pull_a' then 'pla_kb'
         when 'pull_b' then 'plb_kb'
         when 'day_5'  then 'd5_kb'
       end,
       null
  from split_days sd
 where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key in ('push_a','push_b','pull_a','pull_b','day_5')
on conflict (split_day_id, short_id) do nothing;

-- 4. Seed a progression target for KB Swing on the current cycle of each day.
insert into progression_targets
  (user_id, exercise_id, split_day_id, week_number, mesocycle, target_weight,
   target_sets, target_reps_min, target_reps_max, target_rir, set_type, source)
select sd.user_id,
       (select id from exercises where name = 'Kettlebell Swing'),
       sd.id,
       sd.current_week,
       1,
       35,
       3,
       15,
       20,
       1,
       'straight',
       'migration'
  from split_days sd
 where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key in ('push_a','push_b','pull_a','pull_b','day_5')
on conflict (user_id, exercise_id, split_day_id, week_number, mesocycle) do nothing;
