-- 2026-05-27: Replace Hip Abductor Machine with Hip Thrust on Pull B.
-- Hip thrust is Athlean-X's gold-standard glute builder — bigger compound,
-- direct glute load, better aesthetic carryover than the abductor machine.
--
-- Idempotent. Re-runnable.

-- 1. Add Hip Thrust to the exercises master.
insert into exercises (name, equipment_category, muscle_group, movement_type, weight_increment)
values ('Hip Thrust', 'free_weight', 'glutes', 'compound', 5)
on conflict (name) do nothing;

-- 2. Repoint the Pull B `plb_hip_ab` row to Hip Thrust.
--    Updates set_type / reps / intensifier to match the new movement.
update split_day_exercises sde
   set exercise_id     = (select id from exercises where name = 'Hip Thrust'),
       short_id        = 'plb_thrust',
       set_type        = 'straight',
       target_sets     = 3,
       target_reps_min = 8,
       target_reps_max = 12,
       intensifier     = '2s pause + squeeze at top'
  from split_days sd
 where sde.split_day_id = sd.id
   and sd.day_key       = 'pull_b'
   and sde.short_id     = 'plb_hip_ab';
