-- 2026-05-27: Athlete-focused prune + add bundle.
--
-- Cuts (push days only — keep cable curls per user request):
--   Push A: Arsenal Fly Machine, Tricep Pushdowns
--   Push B: Arsenal Fly Machine
--   Pull A: Cable Lat Prayers
--
-- Adds (Cavaliere "train like an athlete" — tennis + disc golf focus):
--   Push A: Band Pull-apart (shoulder prehab)
--   Push B: Band Pull-apart
--   Pull A: Suitcase Carry (anti-rotation core + grip),
--           Dead Hang (grip endurance + decompression)
--   Pull B: Suitcase Carry
--   Day 5:  Arsenal Fly Machine (chest pump, optional day)
--
-- Idempotent. Re-runnable — UPDATE statements guard on old sort_order,
-- INSERTs use on conflict do nothing.

-- ============================================================
-- 1. Add three new exercises to the master.
-- ============================================================
insert into exercises (name, equipment_category, muscle_group, movement_type, weight_increment) values
  ('Band Pull-apart', 'specialty',   'rear_delt', 'isolation', 5),
  ('Dead Hang',       'specialty',   'back',      'isolation', 5),
  ('Suitcase Carry',  'free_weight', 'core',      'compound',  5)
on conflict (name) do nothing;

-- ============================================================
-- 2. Drop pruned rows for this user.
-- ============================================================
delete from split_day_exercises sde
 using split_days sd
 where sde.split_day_id = sd.id
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and (
        (sd.day_key = 'push_a' and sde.short_id in ('pa_fly', 'pa_pushdn'))
     or (sd.day_key = 'push_b' and sde.short_id = 'pb_fly')
     or (sd.day_key = 'pull_a' and sde.short_id = 'pla_lat_pr')
   );

-- ============================================================
-- 3. Reorder rows on Pull A / Pull B / Day 5 to make room for inserts.
--    Guarded on the *current* sort_order so re-runs are no-ops.
-- ============================================================

-- Pull A: KB Swing 9 -> 10 (suitcase will take 9, dead hang 11)
update split_day_exercises sde
   set sort_order = 10
  from split_days sd
 where sde.split_day_id = sd.id
   and sd.user_id   = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key   = 'pull_a'
   and sde.short_id = 'pla_kb'
   and sde.sort_order = 9;

-- Pull B: KB Swing 9 -> 10 (suitcase will take 9)
update split_day_exercises sde
   set sort_order = 10
  from split_days sd
 where sde.split_day_id = sd.id
   and sd.user_id   = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key   = 'pull_b'
   and sde.short_id = 'plb_kb'
   and sde.sort_order = 9;

-- Day 5: bump ab wheel, leg raise, kb +1 to make room for fly at 6
update split_day_exercises sde
   set sort_order = 7
  from split_days sd
 where sde.split_day_id = sd.id
   and sd.user_id   = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key   = 'day_5'
   and sde.short_id = 'd5_ab_wheel'
   and sde.sort_order = 6;

update split_day_exercises sde
   set sort_order = 8
  from split_days sd
 where sde.split_day_id = sd.id
   and sd.user_id   = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key   = 'day_5'
   and sde.short_id = 'd5_leg_raise'
   and sde.sort_order = 7;

update split_day_exercises sde
   set sort_order = 9
  from split_days sd
 where sde.split_day_id = sd.id
   and sd.user_id   = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key   = 'day_5'
   and sde.short_id = 'd5_kb'
   and sde.sort_order = 8;

-- ============================================================
-- 4. Insert the new exercises into split_day_exercises.
-- ============================================================
insert into split_day_exercises
  (split_day_id, exercise_id, set_type, target_sets, target_reps_min,
   target_reps_max, sort_order, note, short_id, intensifier)
values
  -- Push A: Band Pull-apart at sort_order 0 (sorts first as warm-up)
  ((select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'push_a'),
   (select id from exercises where name = 'Band Pull-apart'),
   'straight', 2, 15, 20, 0, 'shoulder prehab (light/medium band)', 'pa_band_pa', null),

  -- Push B: Band Pull-apart at sort_order 0
  ((select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'push_b'),
   (select id from exercises where name = 'Band Pull-apart'),
   'straight', 2, 15, 20, 0, 'shoulder prehab (light/medium band)', 'pb_band_pa', null),

  -- Pull A: Suitcase Carry at 9, Dead Hang at 11 (kb bumped to 10 above)
  ((select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'pull_a'),
   (select id from exercises where name = 'Suitcase Carry'),
   'straight', 2, 20, 20, 9, '/side, walking (anti-rotation core)', 'pla_suitcase', null),

  ((select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'pull_a'),
   (select id from exercises where name = 'Dead Hang'),
   'straight', 2, 30, 30, 11, '30s hold per set (grip + decompression)', 'pla_hang', null),

  -- Pull B: Suitcase Carry at 9 (kb bumped to 10 above)
  ((select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'pull_b'),
   (select id from exercises where name = 'Suitcase Carry'),
   'straight', 2, 20, 20, 9, '/side, walking (anti-rotation core)', 'plb_suitcase', null),

  -- Day 5: Arsenal Fly Machine at sort_order 6 (slot freed above)
  ((select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'day_5'),
   (select id from exercises where name = 'Arsenal Fly Machine'),
   'straight', 3, 12, 15, 6, null, 'd5_fly', 'Slow 3s eccentric + peak squeeze')
on conflict (split_day_id, short_id) do nothing;

-- ============================================================
-- 5. Seed progression_targets for the new exercises on the current cycle.
-- ============================================================
insert into progression_targets
  (user_id, exercise_id, split_day_id, week_number, mesocycle, target_weight,
   target_sets, target_reps_min, target_reps_max, target_rir, set_type, source)
select sd.user_id,
       e.id,
       sd.id,
       sd.current_week,
       1,
       cfg.weight,
       cfg.sets,
       cfg.reps_min,
       cfg.reps_max,
       cfg.rir,
       'straight',
       'migration'
  from (values
    ('push_a', 'Band Pull-apart',     0::numeric, 2, 15, 20, 2),
    ('push_b', 'Band Pull-apart',     0::numeric, 2, 15, 20, 2),
    ('pull_a', 'Suitcase Carry',     40::numeric, 2, 20, 20, 2),
    ('pull_a', 'Dead Hang',           0::numeric, 2, 30, 30, 2),
    ('pull_b', 'Suitcase Carry',     40::numeric, 2, 20, 20, 2),
    ('day_5',  'Arsenal Fly Machine',30::numeric, 3, 12, 15, 1)
  ) as cfg(day_key, ex_name, weight, sets, reps_min, reps_max, rir)
  join split_days sd
    on sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key = cfg.day_key
  join exercises e
    on e.name = cfg.ex_name
on conflict (user_id, exercise_id, split_day_id, week_number, mesocycle) do nothing;
