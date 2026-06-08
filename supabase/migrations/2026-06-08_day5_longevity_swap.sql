-- 2026-06-08: Swap Day 5 (Optional) from Arms+Core to 7 longevity movements.
--
-- Source: "I'm 46. These are 7 exercises I use to feel like I'm 26."
-- (youtube.com/watch?v=utBzlEiX-zA). Single-set notes-only format — the
-- full beginner/intermediate/advanced protocol lives in the note field.
-- Targets default to the intermediate tier.
--
-- Exercises:
--   1. Bar Hang (reuses existing Dead Hang)
--   2. Japanese Interval Walking
--   3. Asian Squat
--   4. World's Greatest Stretch
--   5. Zone 2 Cardio
--   6. Plyometrics
--   7. Farmer's Carry
--
-- Idempotent. Re-runnable.

-- ============================================================
-- 1. Add the six new exercises to the master.
--    Dead Hang already exists and is reused for the bar hang slot.
-- ============================================================
insert into exercises (name, equipment_category, muscle_group, movement_type, weight_increment) values
  ('Japanese Interval Walking', 'specialty',   'cardio',     'compound',  0),
  ('Asian Squat',               'bodyweight',  'lower_body', 'compound',  0),
  ('World''s Greatest Stretch', 'bodyweight',  'full_body',  'compound',  0),
  ('Zone 2 Cardio',             'specialty',   'cardio',     'compound',  0),
  ('Plyometrics',               'bodyweight',  'lower_body', 'compound',  0),
  ('Farmer''s Carry',           'free_weight', 'core',       'compound',  5)
on conflict (name) do nothing;

-- ============================================================
-- 2. Wipe the old Day 5 exercises and any progression targets.
-- ============================================================
delete from progression_targets pt
 using split_days sd
 where pt.split_day_id = sd.id
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key = 'day_5';

delete from split_day_exercises sde
 using split_days sd
 where sde.split_day_id = sd.id
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key = 'day_5';

-- ============================================================
-- 3. Update Day 5 subtitle.
-- ============================================================
update split_days
   set subtitle = 'Longevity · Mobility (Optional)'
 where user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and day_key = 'day_5';

-- ============================================================
-- 4. Insert the 7 longevity movements.
--    Single set; intermediate-tier targets; full protocol in note.
-- ============================================================
insert into split_day_exercises
  (split_day_id, exercise_id, set_type, target_sets, target_reps_min,
   target_reps_max, sort_order, note, short_id, intensifier)
values
  ((select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'day_5'),
   (select id from exercises where name = 'Dead Hang'),
   'straight', 1, 60, 60, 1,
E'BAR HANG\n\nWHY IT MATTERS\nDecompresses the spine, rebuilds the shoulders, and trains grip. Grip strength is a longevity biomarker — the 2018 BMJ study found low grip strength to be among the strongest predictors of early death (heart disease, cancer, all-cause mortality).\n\nTHE MOVE\nHang from a bar with arms straight. Shoulders open gently, ribs down, neck long.\n\nPROTOCOL\n• Beginner — chair-assisted, 5–10s\n• Intermediate — full dead hang 20–60s, build to 2 min/day\n• Advanced — 3 min/day across mixed grips, scapular pulls, one-arm hangs\n\nSOURCE\nhttps://youtu.be/utBzlEiX-zA',
   'd5_bar_hang', null),

  ((select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'day_5'),
   (select id from exercises where name = 'Japanese Interval Walking'),
   'straight', 1, 30, 30, 2,
E'JAPANESE INTERVAL WALKING (IWT)\n\nWHY IT MATTERS\nReverses cardiovascular aging. VO2 max drops ~10%/decade after 30 — one of the biggest predictors of how long and how well you live. Original study in adults 60+ improved VO2 max, leg strength, and blood pressure more than steady-state walking in 5 months.\n\nTHE MOVE\nDeveloped by Dr. Hiroshi Nose. Alternate fast walking (~70% effort) with slow walking. Repeat for 30 min, 4 days/week.\n\nPROTOCOL\n• Beginner — 2 min fast / 3 min slow\n• Intermediate — 3 min fast / 3 min slow for 30 min\n• Advanced — add incline or a weighted vest/rucksack\n\nSOURCE\nhttps://youtu.be/utBzlEiX-zA',
   'd5_iwt', null),

  ((select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'day_5'),
   (select id from exercises where name = 'Asian Squat'),
   'straight', 1, 5, 10, 3,
E'ASIAN SQUAT\n\nWHY IT MATTERS\nThe human resting position. Lose it and you lose ankle mobility, hip function, spinal health — eventually independence. Precursor to the sitting-rising test (2012, European Journal of Preventive Cardiology): people who struggled to sit and rise from the floor were 5× more likely to die within 6 years.\n\nTHE MOVE\nSit into a deep bodyweight squat with feet flat, chest tall. Hold and get comfortable.\n\nPROTOCOL\n• Beginner — hold a door frame or couch for support, heels elevated on books or a plate, 2–5 min/day\n• Intermediate — unassisted, 5–10 min/day broken across the day\n• Advanced — wider / asymmetric stances, overhead reach; make it your default resting position\n\nSOURCE\nhttps://youtu.be/utBzlEiX-zA',
   'd5_asian_sq', null),

  ((select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'day_5'),
   (select id from exercises where name = 'World''s Greatest Stretch'),
   'straight', 1, 3, 3, 4,
E'WORLD''S GREATEST STRETCH\n\nWHY IT MATTERS\nOne flow that hits every joint that ages you — hips, T-spine, ankles, calves, shoulders. These joints lock down first, and stiffness in any of them shows up everywhere else. Hip mobility is one of the biggest predictors of fall risk; falls are the 2nd leading cause of accidental death worldwide.\n\nTHE MOVE\nLunge forward, drop the opposite hand to the floor inside the front foot, then rotate the same-side hand up toward the ceiling (T-spine rotation). Step through and switch sides.\n\nPROTOCOL\n• Beginner — walk through slowly, hold 2 breaths per position, skip the rotation\n• Intermediate — full flow with T-spine rotation, 3 reps/side\n• Advanced — add an overhead reach or hold a light weight in the rotation hand\n\nSOURCE\nhttps://youtu.be/utBzlEiX-zA',
   'd5_wgs', null),

  ((select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'day_5'),
   (select id from exercises where name = 'Zone 2 Cardio'),
   'straight', 1, 45, 45, 5,
E'ZONE 2 CARDIO\n\nWHY IT MATTERS\nBuilds the engine for longevity. Mitochondria (cellular energy factories) shrink in number and quality with age — a core mechanism of aging itself. Zone 2 is the most effective way to reverse it. 2018 JAMA: low cardiorespiratory fitness predicted early death more strongly than smoking, diabetes, or heart disease.\n\nTHE MOVE\nSteady aerobic effort at a pace where you can hold a conversation but it''s slightly labored. Heart rate ~60–70% of max. Walk, cycle, easy row.\n\nPROTOCOL\n• Beginner — 3 × 30-min brisk walks/week (IWT works)\n• Intermediate — 4 × 45-min sessions\n• Advanced — 4 × 60-min sessions with a heart-rate monitor\n\nTIP\nStack it with low-effort work — under-desk treadmill on meetings, exercise bike while watching videos.\n\nSOURCE\nhttps://youtu.be/utBzlEiX-zA',
   'd5_zone2', null),

  ((select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'day_5'),
   (select id from exercises where name = 'Plyometrics'),
   'straight', 3, 5, 8, 6,
E'PLYOMETRICS\n\nWHY IT MATTERS\nFast-twitch fibers go first with age. Strength declines slowly, but power (strength × speed) declines ~2× as fast — 3–4%/year after 40. Power is what keeps you from falling and lets you catch yourself when you trip. Power loss is the single biggest predictor of fall-related death in older adults — bigger than strength loss, bigger than balance.\n\nTHE MOVE\nExplosive jumps that train the nervous system to produce force fast. Match the variation to your level.\n\nPROTOCOL\n• Beginner — ankle pogos, calf jumps, line hops. Quiet landings — the ground should barely make a sound.\n• Intermediate — broad jumps, skater bounds, low box jumps. Learn to absorb force.\n• Advanced — depth jumps, bounding, single-leg hops.\n\nSOURCE\nhttps://youtu.be/utBzlEiX-zA',
   'd5_plyo', null),

  ((select sd.id from split_days sd where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and sd.day_key = 'day_5'),
   (select id from exercises where name = 'Farmer''s Carry'),
   'straight', 3, 60, 60, 7,
E'LOADED CARRIES\n\nWHY IT MATTERS\nTrains muscular endurance, grip, core, posture, breathing, and full-body structural integrity — all in one movement. Mimics real life: groceries, luggage, kids, furniture. Dr. Stuart McGill called loaded carries one of the single best exercises for spinal stability and core integrity.\n\nTHE MOVE\nPick up a heavy weight (kettlebell or dumbbell) and walk. Stand tall, ribs down, don''t lean.\n\nPROTOCOL\n• Beginner — suitcase carry: one weight in one hand, 30s/side\n• Intermediate — farmer''s carry: both hands, heavier load, 60s\n• Advanced — heavy farmer''s carries at ~bodyweight per hand for 1+ min, plus overhead and mixed-grip variations\n\nSOURCE\nhttps://youtu.be/utBzlEiX-zA',
   'd5_farmer', null)
on conflict (split_day_id, short_id) do nothing;
