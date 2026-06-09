-- 2026-06-09: Tennis-focused lower-body rebuild + Daily Tennis Prep reference.
--
-- WHY: Returning to doubles tennis with SLAP shoulder injury. Lower-body
-- machine isolation work (Leg Press, Squat Machine, Leg Extensions, Hamstring
-- Curls) is cut — created quad dominance and inhibited the glutes, which is
-- the root cause of the calf overcompensation that's been wrecking matches.
-- Replaced with dynamic free-movement work biased to glute foundation, single-
-- leg balance, and explosive intent. Kettlebell Swings removed from every gym
-- day because the kettlebell now lives at home — 100 swings/day will be tracked
-- in the new Home Workout tab.
--
-- CHANGES PER DAY:
--   Push A — drop Leg Press + KB Swing; add Goblet Squat + Box Jump
--   Push B — drop Squat Machine + Leg Extensions + KB Swing; add Bulgarian
--            Split Squat + Step-Up w/ Knee Drive
--   Pull A — drop Hamstring Curls + KB Swing; add Single-Leg RDL (keep RDL)
--   Pull B — drop Hamstring Curls + KB Swing; Hip Thrust moves to top of leg
--            block; add Single-Leg Glute Bridge + Lateral Band Walks
--            (Pull B becomes the glute-focus day)
--
-- NEW REFERENCE DAY: 'tennis_prep' — read-only notes screen modeled on Day 5.
-- Houses the daily calf eccentric protocol, pre-match activation flow, soft-
-- tissue cues, and tennis-specific movement drills.
--
-- Idempotent. Re-runnable.

-- ============================================================
-- 1. Add new exercises to the master table.
-- ============================================================
insert into exercises (name, equipment_category, muscle_group, movement_type, weight_increment) values
  -- Lower body — gym
  ('Goblet Squat',              'free_weight', 'quads',      'compound',  5),
  ('Box Jump',                  'specialty',   'lower_body', 'compound',  0),
  ('Bulgarian Split Squat',     'free_weight', 'quads',      'compound',  5),
  ('Step-Up with Knee Drive',   'free_weight', 'lower_body', 'compound',  5),
  ('Single-Leg RDL',            'free_weight', 'hamstrings', 'compound',  5),
  ('Single-Leg Glute Bridge',   'bodyweight',  'glutes',     'compound',  0),
  ('Lateral Band Walks',        'specialty',   'glutes',     'isolation', 0),
  -- Tennis Prep reference rows (notes-only — sort like Day 5 entries)
  ('Calf Eccentric Protocol',   'specialty',   'calves',     'isolation', 0),
  ('Pre-Match Activation',      'bodyweight',  'lower_body', 'compound',  0),
  ('Soft Tissue & Mobility',    'specialty',   'full_body',  'compound',  0),
  ('Tennis Movement Drills',    'specialty',   'lower_body', 'compound',  0)
on conflict (name) do nothing;

-- ============================================================
-- 2. Remove machine isolation exercises + KB swings from gym days.
-- ============================================================
delete from progression_targets pt
 using split_day_exercises sde, split_days sd, exercises e
 where pt.split_day_id = sd.id
   and pt.exercise_id = e.id
   and sde.split_day_id = sd.id
   and sde.exercise_id = e.id
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key in ('push_a', 'push_b', 'pull_a', 'pull_b')
   and e.name in (
     'Nautilus Xpload Leg Press Incline',
     'Bodybuilder Squat Machine',
     'Nautilus Leg Extensions',
     'Nautilus Hamstring Curls',
     'Kettlebell Swing'
   );

delete from split_day_exercises sde
 using split_days sd, exercises e
 where sde.split_day_id = sd.id
   and sde.exercise_id = e.id
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key in ('push_a', 'push_b', 'pull_a', 'pull_b')
   and e.name in (
     'Nautilus Xpload Leg Press Incline',
     'Bodybuilder Squat Machine',
     'Nautilus Leg Extensions',
     'Nautilus Hamstring Curls',
     'Kettlebell Swing'
   );

-- ============================================================
-- 3. PUSH A — add Goblet Squat + Box Jump.
--    Existing remaining exercises stay in their current sort_order.
--    New ones slot in at 7, 8 (replacing the old leg-press / KB swing slots).
-- ============================================================
insert into split_day_exercises
  (split_day_id, exercise_id, set_type, target_sets, target_reps_min,
   target_reps_max, sort_order, note, short_id, intensifier)
values
  ((select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'push_a'),
   (select id from exercises where name = 'Goblet Squat'),
   'straight', 3, 8, 10, 7,
   'KB held at chest. Heels down, knees track over toes, full depth. Drive up with intent.',
   'pa_goblet', null),

  ((select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'push_a'),
   (select id from exercises where name = 'Box Jump'),
   'straight', 3, 5, 5, 8,
   '12–18" box. Quality over height — fast and explosive off the floor. Full reset between reps. Step down, don''t jump down.',
   'pa_box_jump', 'Full reset · move FAST not heavy')
on conflict (split_day_id, short_id) do nothing;

-- Update Cable Woodchop sort_order from 8 → 9 (it followed the removed Leg Press)
update split_day_exercises
   set sort_order = 9
 where split_day_id = (select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'push_a')
   and short_id = 'pa_woodchop';

-- ============================================================
-- 4. PUSH B — add Bulgarian Split Squat + Step-Up with Knee Drive.
-- ============================================================
insert into split_day_exercises
  (split_day_id, exercise_id, set_type, target_sets, target_reps_min,
   target_reps_max, sort_order, note, short_id, intensifier)
values
  ((select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'push_b'),
   (select id from exercises where name = 'Bulgarian Split Squat'),
   'straight', 3, 8, 8, 7,
   '/leg. Rear foot elevated on bench. Front shin vertical, drop straight down. Bodyweight to start, add DBs as it gets easy.',
   'pb_bulgarian', null),

  ((select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'push_b'),
   (select id from exercises where name = 'Step-Up with Knee Drive'),
   'straight', 3, 6, 6, 8,
   '/leg. Step up + drive the trailing knee high and fast — mimics sprint first step. Explosive intent. 18" box or bench.',
   'pb_step_up', 'Explosive knee drive — sprint pattern')
on conflict (split_day_id, short_id) do nothing;

-- Update Cable Woodchop sort_order to 9 (was 9, but verify)
update split_day_exercises
   set sort_order = 9
 where split_day_id = (select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'push_b')
   and short_id = 'pb_woodchop';

-- ============================================================
-- 5. PULL A — add Single-Leg RDL after RDL (slot 9).
--    Suitcase Carry and Dead Hang shift down by 1.
-- ============================================================
insert into split_day_exercises
  (split_day_id, exercise_id, set_type, target_sets, target_reps_min,
   target_reps_max, sort_order, note, short_id, intensifier)
values
  ((select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'pull_a'),
   (select id from exercises where name = 'Single-Leg RDL'),
   'straight', 3, 8, 8, 9,
   '/leg. KB or DB in opposite hand. Hinge — hips back, soft knee, flat back. Exposes side-to-side asymmetry.',
   'pla_sl_rdl', null)
on conflict (split_day_id, short_id) do nothing;

-- Suitcase Carry and Dead Hang already at 10/12 — pull Dead Hang to 11.
update split_day_exercises
   set sort_order = 11
 where split_day_id = (select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'pull_a')
   and short_id = 'pla_hang';

-- ============================================================
-- 6. PULL B — Hip Thrust moves to first lower-body slot (sort 7),
--    add Single-Leg Glute Bridge, Lateral Band Walks.
--    This becomes the dedicated glute-focus day.
-- ============================================================
-- Hip Thrust currently sort 8 → 7 (first lower-body lift after upper)
update split_day_exercises
   set sort_order = 7
 where split_day_id = (select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'pull_b')
   and short_id = 'plb_thrust';

insert into split_day_exercises
  (split_day_id, exercise_id, set_type, target_sets, target_reps_min,
   target_reps_max, sort_order, note, short_id, intensifier)
values
  ((select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'pull_b'),
   (select id from exercises where name = 'Single-Leg Glute Bridge'),
   'straight', 3, 10, 10, 8,
   '/leg. Shoulders on floor, one foot planted, other leg straight or tucked. Drive heel, squeeze glute hard at top. Exposes left/right asymmetry.',
   'plb_sl_bridge', '2s squeeze at top'),

  ((select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'pull_b'),
   (select id from exercises where name = 'Lateral Band Walks'),
   'straight', 3, 15, 15, 9,
   '/side. Band above knees or around ankles. Quarter squat, small controlled steps. Knees push OUT into the band the whole time. The plane that was missing entirely.',
   'plb_lat_walks', null)
on conflict (split_day_id, short_id) do nothing;

-- Suitcase Carry was at 9 → push to 11 (after the new glute trio)
update split_day_exercises
   set sort_order = 11
 where split_day_id = (select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'pull_b')
   and short_id = 'plb_suitcase';

-- ============================================================
-- 7. Subtitle updates — reflect the new emphasis.
-- ============================================================
update split_days
   set subtitle = 'Incline Chest · Shoulders · Triceps · Squat + Jump'
 where user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and day_key = 'push_a';

update split_days
   set subtitle = 'Flat Chest · Shoulders · Triceps · Single-Leg + Explosive'
 where user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and day_key = 'push_b';

update split_days
   set subtitle = 'Back Width · Biceps · Posterior Chain'
 where user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and day_key = 'pull_a';

update split_days
   set subtitle = 'Upper Back · Biceps · Glute Foundation'
 where user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and day_key = 'pull_b';

-- ============================================================
-- 8. Seed Cycle 4 progression targets for the new exercises.
-- ============================================================
insert into progression_targets
  (user_id, exercise_id, split_day_id, week_number, mesocycle,
   target_weight, target_sets, target_reps_min, target_reps_max,
   target_rir, set_type, source)
values
  -- PUSH A
  ((select id from auth.users where email = 'chadleydean@gmail.com'),
   (select id from exercises where name = 'Goblet Squat'),
   (select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'push_a'),
   4, 1, 45, 3, 8, 10, 2, 'straight', 'seed'),

  ((select id from auth.users where email = 'chadleydean@gmail.com'),
   (select id from exercises where name = 'Box Jump'),
   (select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'push_a'),
   4, 1, 0, 3, 5, 5, 3, 'straight', 'seed'),

  -- PUSH B
  ((select id from auth.users where email = 'chadleydean@gmail.com'),
   (select id from exercises where name = 'Bulgarian Split Squat'),
   (select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'push_b'),
   4, 1, 0, 3, 8, 8, 2, 'straight', 'seed'),

  ((select id from auth.users where email = 'chadleydean@gmail.com'),
   (select id from exercises where name = 'Step-Up with Knee Drive'),
   (select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'push_b'),
   4, 1, 0, 3, 6, 6, 3, 'straight', 'seed'),

  -- PULL A
  ((select id from auth.users where email = 'chadleydean@gmail.com'),
   (select id from exercises where name = 'Single-Leg RDL'),
   (select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'pull_a'),
   4, 1, 25, 3, 8, 8, 2, 'straight', 'seed'),

  -- PULL B
  ((select id from auth.users where email = 'chadleydean@gmail.com'),
   (select id from exercises where name = 'Single-Leg Glute Bridge'),
   (select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'pull_b'),
   4, 1, 0, 3, 10, 10, 2, 'straight', 'seed'),

  ((select id from auth.users where email = 'chadleydean@gmail.com'),
   (select id from exercises where name = 'Lateral Band Walks'),
   (select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'pull_b'),
   4, 1, 0, 3, 15, 15, 2, 'straight', 'seed')
on conflict (user_id, exercise_id, split_day_id, week_number, mesocycle) do nothing;

-- ============================================================
-- 9. Create the new Daily Tennis Prep reference day.
-- ============================================================
insert into split_days (user_id, day_key, day_label, subtitle, sort_order, current_week)
values (
  (select id from auth.users where email = 'chadleydean@gmail.com'),
  'tennis_prep',
  'Tennis Prep',
  'Daily Calf · Activation · Mobility (Reference)',
  6, 1
)
on conflict (user_id, day_key) do nothing;

-- ============================================================
-- 10. Tennis Prep reference content — read-only notes, no logging.
-- ============================================================
insert into split_day_exercises
  (split_day_id, exercise_id, set_type, target_sets, target_reps_min,
   target_reps_max, sort_order, note, short_id, intensifier)
values
  ((select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'tennis_prep'),
   (select id from exercises where name = 'Calf Eccentric Protocol'),
   'straight', 1, 1, 1, 1,
E'CALF + ACHILLES REBUILD — 2× DAILY (NON-NEGOTIABLE)\n\nWHY IT MATTERS\nCalves are overcompensating for inactive glutes. Tissue capacity is shot — that''s the tightness during dorsiflexion and the bilateral soreness after matches. Eccentric heel drops rebuild tendon capacity faster than any stretch.\n\nTHE PROTOCOL\n• Eccentric heel drops on a step — 3 sets of 15 each leg\n  - Set 1: STRAIGHT LEG (gastrocnemius)\n  - Set 2: BENT KNEE (soleus / lower achilles)\n  - Set 3: alternate or pick the weaker variation\n• Slow tempo — 3–4 seconds down, full stretch at the bottom\n• Push back up with the OTHER leg (or both) — the working leg only does the lowering\n• Twice a day. Morning + evening.\n\nGYM ADD-ON\n• Seated calf raises 3×20 — full ROM, slow controlled\n\nSUCCESS MARKER\nCalf tightness during dorsiflexion reducing = tissue capacity rebuilding.',
   'tp_calf', null),

  ((select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'tennis_prep'),
   (select id from exercises where name = 'Pre-Match Activation'),
   'straight', 1, 1, 1, 2,
E'PRE-MATCH / PRE-SESSION ACTIVATION (NON-NEGOTIABLE)\n\nWHY IT MATTERS\nGlutes need to be ON before the first ball. Cold glutes = calves take over = sore everything + slow first step. 5 minutes before stepping on court.\n\nTHE FLOW (in order)\n1. Glute Bridges — 15 reps, squeeze hard at top\n2. Lateral Band Walks — short, 10 steps each direction\n3. Slow Calf Raises — 20 reps, full ROM\n4. Dynamic Leg Swings — 10 each leg, front-to-back AND side-to-side\n5. Split-Step Practice — easy, 10 reps, just feel the bounce\n\nDIAGNOSTIC\nIf you skip this and pull up on the first sprint, that''s the answer. The activation isn''t optional.',
   'tp_activation', null),

  ((select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'tennis_prep'),
   (select id from exercises where name = 'Soft Tissue & Mobility'),
   'straight', 1, 1, 1, 3,
E'SOFT TISSUE — DAILY, BEFORE AND AFTER\n\nWHY IT MATTERS\nDaily, not "when it hurts." Tissue quality is built in the boring middle, not when the calf is already barking.\n\nTHE PROTOCOL\n• Foam roller — calves, quads, IT band, glutes. 30s each.\n• Lacrosse ball — calves and glute medius. Find a hot spot, hold 30s, breathe through it.\n• Before activity: light pass to wake tissue up.\n• After activity: longer pass on whatever felt tight in play.\n\nRIGHT HIP\nRight hip muscular fatigue after play — spend extra time on right glute med + TFL with the lacrosse ball.\n\nWORLD''S GREATEST STRETCH — 3 reps/side daily (also in Day 5).',
   'tp_softtissue', null),

  ((select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'tennis_prep'),
   (select id from exercises where name = 'Tennis Movement Drills'),
   'straight', 1, 1, 1, 4,
E'TENNIS-SPECIFIC MOVEMENT WORK\n\nWHY IT MATTERS\nGym strength has to translate to court speed. These drills bridge the gap — they''re the exact patterns breaking down on short balls and wide balls.\n\nTHE MENU (pick 1–2 per session, 2× / week minimum)\n• Resisted Lateral Band Shuffles — anchored band, mimic court movement. 3 × 10 steps/side.\n• Split-Step to First Explosive Step — the exact pattern. Land split step → push off → 3-yard explosive first step. 6–8 reps.\n• Short Cone Sprints — 3–5 yards only, NOT full sprints yet. 6–8 reps with full reset.\n• Wall Hitting — reaction time + footwork combined. 10–15 min.\n\nPROGRESSION GATE\nDon''t add max-velocity 10+ yard sprints until first-step work feels clean and the pulling-up reflex is gone.\n\nPOOL OPTION (2–3× / week, zero impact)\n• Water walking forward + backward\n• Lateral shuffles chest-deep\n• High knee water running\n• Flutter kicks (calf + ankle, zero Achilles load)\n• Single-leg balance',
   'tp_drills', null)
on conflict (split_day_id, short_id) do nothing;
