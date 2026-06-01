-- 2026-06-01: Rear-delt direct work on both pull days + row pattern variety.
--
-- Pull A:
--   Swap Nautilus Chest Supported Row Mid -> Nautilus Seated Row V-bar
--     (gives narrow-neutral grip variety vs Pull B's chest-supported row).
--   Add Cable Rear Delt Fly after face pulls.
--   Annotate Lat Pulldown overhand with close-grip V-handle alternative.
--
-- Pull B:
--   Drop Chest Supported Rear Delt Raises.
--   Add Cable Rear Delt Fly in the freed slot (1-for-1, no reorder).
--
-- Driven by Gymshark rear-delt programming note: hit rear delts >=2x/week
-- with direct isolation work, not just face pulls. Pull A previously had
-- face pulls as the only rear-delt-direct stimulus.
--
-- Idempotent. Re-runnable.

-- ============================================================
-- 1. Ensure required exercises exist (already in seed, but safe to re-assert).
-- ============================================================
insert into exercises (name, equipment_category, muscle_group, movement_type, weight_increment) values
  ('Cable Rear Delt Fly',        'cable',          'rear_delt', 'isolation', 4.5),
  ('Nautilus Seated Row V-bar',  'nautilus_stack', 'back',      'compound',  5)
on conflict (name) do nothing;

-- ============================================================
-- 2. Drop rows being removed.
--    Pull A: chest supported row mid (replaced by V-bar)
--    Pull B: chest supported rear delt raises (replaced by cable rear delt fly)
-- ============================================================
delete from split_day_exercises sde
 using split_days sd
 where sde.split_day_id = sd.id
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and (
        (sd.day_key = 'pull_a' and sde.short_id = 'pla_row_mid')
     or (sd.day_key = 'pull_b' and sde.short_id = 'plb_cs_rd')
   );

-- ============================================================
-- 3. Pull A: bump orders 5-11 up by 1 to make room for rear delt fly at 5.
--    Done in descending order so we never collide with an existing row.
--    Guarded on current sort_order so re-runs are no-ops.
-- ============================================================
update split_day_exercises sde set sort_order = 12
  from split_days sd
 where sde.split_day_id = sd.id
   and sd.user_id   = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key   = 'pull_a'
   and sde.short_id = 'pla_hang'
   and sde.sort_order = 11;

update split_day_exercises sde set sort_order = 11
  from split_days sd
 where sde.split_day_id = sd.id
   and sd.user_id   = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key   = 'pull_a'
   and sde.short_id = 'pla_kb'
   and sde.sort_order = 10;

update split_day_exercises sde set sort_order = 10
  from split_days sd
 where sde.split_day_id = sd.id
   and sd.user_id   = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key   = 'pull_a'
   and sde.short_id = 'pla_suitcase'
   and sde.sort_order = 9;

update split_day_exercises sde set sort_order = 9
  from split_days sd
 where sde.split_day_id = sd.id
   and sd.user_id   = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key   = 'pull_a'
   and sde.short_id = 'pla_ham'
   and sde.sort_order = 8;

update split_day_exercises sde set sort_order = 8
  from split_days sd
 where sde.split_day_id = sd.id
   and sd.user_id   = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key   = 'pull_a'
   and sde.short_id = 'pla_rdl'
   and sde.sort_order = 7;

update split_day_exercises sde set sort_order = 7
  from split_days sd
 where sde.split_day_id = sd.id
   and sd.user_id   = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key   = 'pull_a'
   and sde.short_id = 'pla_hammer'
   and sde.sort_order = 6;

update split_day_exercises sde set sort_order = 6
  from split_days sd
 where sde.split_day_id = sd.id
   and sd.user_id   = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key   = 'pull_a'
   and sde.short_id = 'pla_cc'
   and sde.sort_order = 5;

-- ============================================================
-- 4. Annotate Pull A lat pulldown with close-grip alternative.
-- ============================================================
update split_day_exercises sde
   set note = 'or close-grip V-handle for rear delt bias'
  from split_days sd
 where sde.split_day_id = sd.id
   and sd.user_id   = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key   = 'pull_a'
   and sde.short_id = 'pla_pd_over';

-- ============================================================
-- 5. Insert new split_day_exercises rows.
--    Pull A: V-bar row at 3 (replaces row_mid slot), rear delt fly at 5.
--    Pull B: rear delt fly at 4 (replaces rear delt raises slot).
-- ============================================================
insert into split_day_exercises
  (split_day_id, exercise_id, set_type, target_sets, target_reps_min,
   target_reps_max, sort_order, note, short_id, intensifier)
values
  -- Pull A: Seated Row V-bar at sort_order 3
  ((select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'pull_a'),
   (select id from exercises where name = 'Nautilus Seated Row V-bar'),
   'straight', 3, 10, 12, 3, null, 'pla_row_vbar', null),

  -- Pull A: Cable Rear Delt Fly at sort_order 5
  ((select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'pull_a'),
   (select id from exercises where name = 'Cable Rear Delt Fly'),
   'straight', 3, 12, 15, 5, null, 'pla_rd_fly', 'Slow 3s eccentric + peak squeeze'),

  -- Pull B: Cable Rear Delt Fly at sort_order 4
  ((select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'pull_b'),
   (select id from exercises where name = 'Cable Rear Delt Fly'),
   'straight', 3, 12, 15, 4, null, 'plb_rd_fly', 'Slow 3s eccentric + peak squeeze')
on conflict (split_day_id, short_id) do nothing;

-- ============================================================
-- 6. Seed progression_targets for the new exercises on the current cycle.
--    V-bar row: 121 lb starting (matches user's other Nautilus stack rows).
--    Rear delt fly: 30 lb starting, RIR 1 (isolation, light to learn pattern).
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
    ('pull_a', 'Nautilus Seated Row V-bar', 121::numeric, 3, 10, 12, 2),
    ('pull_a', 'Cable Rear Delt Fly',        30::numeric, 3, 12, 15, 1),
    ('pull_b', 'Cable Rear Delt Fly',        30::numeric, 3, 12, 15, 1)
  ) as cfg(day_key, ex_name, weight, sets, reps_min, reps_max, rir)
  join split_days sd
    on sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key = cfg.day_key
  join exercises e
    on e.name = cfg.ex_name
on conflict (user_id, exercise_id, split_day_id, week_number, mesocycle) do nothing;
