-- 2026-08-07 — Split side delts out of the generic 'shoulders' tag.
--
-- WHY: lateral raises and overhead presses were both muscle_group 'shoulders',
-- so any weekly volume rollup reported a single combined number (18) and hid
-- the fact that side delts specifically were the muscle running short. Rear
-- delts already have their own 'rear_delt' tag; this gives side delts the same
-- treatment so the home-screen volume board can track them separately.
--
-- Presses (Nautilus PL Seated Press, Landmine Press, Standing Barbell OHP)
-- stay 'shoulders' — they are front-delt work and need no separate target,
-- since horizontal and vertical pressing already cover the front delt.
--
-- Idempotent. Re-runnable.

update exercises
   set muscle_group = 'side_delt'
 where name in ('Arsenal Lateral Raises');

select name, muscle_group, movement_type
from exercises
where muscle_group in ('shoulders', 'side_delt', 'rear_delt')
order by muscle_group, name;
