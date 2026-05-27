-- 2026-05-27: Trim Lat Pulldown 4 -> 3 sets on Pull A and Pull B.
-- Cavaliere principle: if 3 sets to true failure don't cover it, the
-- 4th is junk volume. Cuts ~3 min off each pull day.
--
-- Idempotent. Re-runnable.

-- Update target_sets on the split_day_exercises rows.
update split_day_exercises sde
   set target_sets = 3
  from split_days sd
 where sde.split_day_id = sd.id
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and (
        (sd.day_key = 'pull_a' and sde.short_id = 'pla_pd_over')
     or (sd.day_key = 'pull_b' and sde.short_id = 'plb_pd_under')
   );

-- Update the current-cycle progression target so the workout screen reflects it.
update progression_targets pt
   set target_sets = 3
  from split_days sd, exercises e
 where pt.split_day_id = sd.id
   and pt.exercise_id  = e.id
   and pt.user_id      = (select id from auth.users where email = 'chadleydean@gmail.com')
   and pt.week_number  = sd.current_week
   and pt.mesocycle    = 1
   and (
        (sd.day_key = 'pull_a' and e.name = 'Nautilus Lat Pulldown overhand')
     or (sd.day_key = 'pull_b' and e.name = 'Nautilus Lat Pulldown underhand')
   );
