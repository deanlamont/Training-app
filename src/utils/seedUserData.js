import { supabase } from './supabaseClient.js';

export async function seedUserData(userId) {
  const splitDays = [
    { day_key: 'push_a', day_label: 'Push A', subtitle: 'Incline Chest · Shoulders · Triceps · Legs', sort_order: 1, current_week: 4 },
    { day_key: 'push_b', day_label: 'Push B', subtitle: 'Flat Chest · Shoulders · Triceps · Legs',   sort_order: 2, current_week: 4 },
    { day_key: 'pull_a', day_label: 'Pull A', subtitle: 'Back Width · Biceps · Hamstrings',           sort_order: 3, current_week: 4 },
    { day_key: 'pull_b', day_label: 'Pull B', subtitle: 'Upper Back · Biceps · Hamstrings',           sort_order: 4, current_week: 4 },
    { day_key: 'day_5',  day_label: 'Day 5',  subtitle: 'Longevity · Mobility (Optional)',            sort_order: 5, current_week: 4 },
  ];

  const { data: days, error: dErr } = await supabase
    .from('split_days')
    .upsert(splitDays.map(d => ({ ...d, user_id: userId })), {
      onConflict: 'user_id,day_key',
      ignoreDuplicates: false,
    })
    .select();

  if (dErr) throw new Error(`Split day seed failed: ${dErr.message}`);

  const dayMap = Object.fromEntries(days.map(d => [d.day_key, d.id]));

  const { data: exercises } = await supabase.from('exercises').select('id, name');
  const exMap = Object.fromEntries(exercises.map(e => [e.name, e.id]));

  // Intensifier prompts replace the old myo-rep protocol (Athlean-X philosophy:
  // slow eccentrics, paused/peak-squeeze reps, occasional last-set drop). Shown
  // as a coaching note on the final set — no enforced timing protocol.
  const sde = [
    // PUSH A
    { day: 'push_a', ex: 'Band Pull-apart',                 sid: 'pa_band_pa',  type: 'straight', sets: 2, min: 15, max: 20, order: 1, note: 'shoulder prehab (light/medium band)' },
    { day: 'push_a', ex: 'Nautilus PL Incline Bench',      sid: 'pa_inc',       type: 'straight', sets: 4, min: 8,  max: 8,  order: 2, note: '/side' },
    { day: 'push_a', ex: 'DB 45 Degree Incline',            sid: 'pa_db_inc',   type: 'straight', sets: 3, min: 10, max: 12, order: 3 },
    { day: 'push_a', ex: 'Nautilus PL Seated Press',        sid: 'pa_seat_pr',  type: 'straight', sets: 3, min: 10, max: 10, order: 4, note: '/side' },
    { day: 'push_a', ex: 'Arsenal Lateral Raises',          sid: 'pa_lat_r',    type: 'straight', sets: 3, min: 12, max: 15, order: 5, intensifier: 'Slow 3s eccentric + 1s pause at top' },
    { day: 'push_a', ex: 'Cable Rope Overhead Extension',   sid: 'pa_rope_oh',  type: 'straight', sets: 3, min: 12, max: 12, order: 6 },
    { day: 'push_a', ex: 'Nautilus Xpload Leg Press Incline', sid: 'pa_leg_pr', type: 'straight', sets: 3, min: 10, max: 10, order: 7, note: '/side' },
    { day: 'push_a', ex: 'Cable Woodchop',                  sid: 'pa_woodchop', type: 'straight', sets: 2, min: 12, max: 12, order: 8, note: '/side' },
    { day: 'push_a', ex: 'Kettlebell Swing',                sid: 'pa_kb',       type: 'straight', sets: 3, min: 15, max: 20, order: 9, note: 'conditioning finisher' },

    // PUSH B
    { day: 'push_b', ex: 'Band Pull-apart',                 sid: 'pb_band_pa',  type: 'straight', sets: 2, min: 15, max: 20, order: 1, note: 'shoulder prehab (light/medium band)' },
    { day: 'push_b', ex: 'Nautilus PL Flat Bench',          sid: 'pb_flat',     type: 'straight', sets: 4, min: 8,  max: 10, order: 2, note: '/side' },
    { day: 'push_b', ex: 'DB Flat Bench',                   sid: 'pb_db_flat',  type: 'straight', sets: 3, min: 10, max: 12, order: 3 },
    { day: 'push_b', ex: 'Nautilus PL Seated Press',        sid: 'pb_seat_pr',  type: 'straight', sets: 3, min: 8,  max: 10, order: 4, note: 'bilateral; or Standing Barbell OHP if preferred' },
    { day: 'push_b', ex: 'Arsenal Lateral Raises',          sid: 'pb_lat_r',    type: 'straight', sets: 3, min: 12, max: 15, order: 5, intensifier: 'Slow 3s eccentric + 1s pause at top' },
    { day: 'push_b', ex: 'Cable Rope Overhead Extension',   sid: 'pb_rope_oh',  type: 'straight', sets: 3, min: 12, max: 15, order: 6, intensifier: 'Slow 3s eccentric (long-head stretch)' },
    { day: 'push_b', ex: 'Bodybuilder Squat Machine',       sid: 'pb_squat',    type: 'straight', sets: 3, min: 8,  max: 10, order: 7, note: '/side' },
    { day: 'push_b', ex: 'Nautilus Leg Extensions',         sid: 'pb_leg_ext',  type: 'straight', sets: 3, min: 12, max: 15, order: 8, intensifier: 'Slow 3s eccentric + 1s squeeze at top' },
    { day: 'push_b', ex: 'Cable Woodchop',                  sid: 'pb_woodchop', type: 'straight', sets: 2, min: 12, max: 12, order: 9, note: '/side' },
    { day: 'push_b', ex: 'Kettlebell Swing',                sid: 'pb_kb',       type: 'straight', sets: 3, min: 15, max: 20, order: 10, note: 'conditioning finisher' },

    // PULL A
    { day: 'pull_a', ex: 'Pull-up',                           sid: 'pla_pullup',   type: 'straight', sets: 3, min: 5,  max: 10, order: 1,  note: 'bodyweight (+/- assist)' },
    { day: 'pull_a', ex: 'Nautilus Lat Pulldown overhand',    sid: 'pla_pd_over',  type: 'straight', sets: 3, min: 8,  max: 10, order: 2,  note: 'or close-grip V-handle for rear delt bias' },
    { day: 'pull_a', ex: 'Nautilus Seated Row V-bar',         sid: 'pla_row_vbar', type: 'straight', sets: 3, min: 10, max: 12, order: 3 },
    { day: 'pull_a', ex: 'Cable Face Pulls',                  sid: 'pla_fp',       type: 'straight', sets: 3, min: 15, max: 20, order: 4,  intensifier: '1s pause + squeeze at peak' },
    { day: 'pull_a', ex: 'Cable Rear Delt Fly',               sid: 'pla_rd_fly',   type: 'straight', sets: 3, min: 12, max: 15, order: 5,  intensifier: 'Slow 3s eccentric + peak squeeze' },
    { day: 'pull_a', ex: 'Cable Curls',                       sid: 'pla_cc',       type: 'straight', sets: 3, min: 12, max: 15, order: 6,  intensifier: 'Slow 3s eccentric + peak squeeze' },
    { day: 'pull_a', ex: 'Hammer Curls',                      sid: 'pla_hammer',   type: 'straight', sets: 3, min: 12, max: 12, order: 7 },
    { day: 'pull_a', ex: 'Romanian Deadlift',                 sid: 'pla_rdl',      type: 'straight', sets: 3, min: 8,  max: 8,  order: 8 },
    { day: 'pull_a', ex: 'Nautilus Hamstring Curls',          sid: 'pla_ham',      type: 'straight', sets: 3, min: 12, max: 15, order: 9,  intensifier: 'Slow 3s eccentric + 1s squeeze' },
    { day: 'pull_a', ex: 'Suitcase Carry',                    sid: 'pla_suitcase', type: 'straight', sets: 2, min: 20, max: 20, order: 10, note: '/side, walking (anti-rotation core)' },
    { day: 'pull_a', ex: 'Kettlebell Swing',                  sid: 'pla_kb',       type: 'straight', sets: 3, min: 15, max: 20, order: 11, note: 'conditioning finisher' },
    { day: 'pull_a', ex: 'Dead Hang',                         sid: 'pla_hang',     type: 'straight', sets: 2, min: 30, max: 30, order: 12, note: '30s hold per set (grip + decompression)' },

    // PULL B
    { day: 'pull_b', ex: 'Nautilus Lat Pulldown underhand',    sid: 'plb_pd_under', type: 'straight', sets: 3, min: 8,  max: 12, order: 1 },
    { day: 'pull_b', ex: 'Nautilus Chest Supported Row High',  sid: 'plb_row_high', type: 'straight', sets: 3, min: 10, max: 15, order: 2 },
    { day: 'pull_b', ex: 'Cable Face Pulls',                   sid: 'plb_fp',       type: 'straight', sets: 3, min: 15, max: 20, order: 3,  intensifier: '1s pause + squeeze at peak' },
    { day: 'pull_b', ex: 'Cable Rear Delt Fly',                sid: 'plb_rd_fly',   type: 'straight', sets: 3, min: 12, max: 15, order: 4,  intensifier: 'Slow 3s eccentric + peak squeeze' },
    { day: 'pull_b', ex: 'Incline DB Curls',                   sid: 'plb_inc_curl', type: 'straight', sets: 3, min: 12, max: 15, order: 5,  intensifier: 'Slow 3s eccentric (deep stretch)' },
    { day: 'pull_b', ex: 'Cable Curls',                        sid: 'plb_cc',       type: 'straight', sets: 3, min: 12, max: 12, order: 6 },
    { day: 'pull_b', ex: 'Nautilus Hamstring Curls',           sid: 'plb_ham',      type: 'straight', sets: 3, min: 12, max: 15, order: 7,  intensifier: 'Slow 3s eccentric + 1s squeeze' },
    { day: 'pull_b', ex: 'Hip Thrust',                          sid: 'plb_thrust',   type: 'straight', sets: 3, min: 8,  max: 12, order: 8, intensifier: '2s pause + squeeze at top' },
    { day: 'pull_b', ex: 'Suitcase Carry',                      sid: 'plb_suitcase', type: 'straight', sets: 2, min: 20, max: 20, order: 9, note: '/side, walking (anti-rotation core)' },
    { day: 'pull_b', ex: 'Kettlebell Swing',                    sid: 'plb_kb',       type: 'straight', sets: 3, min: 15, max: 20, order: 10, note: 'conditioning finisher' },

    // DAY 5 — 7 longevity movements (single-set, notes-only; intermediate-tier defaults).
    // Source: "I'm 46. These are 7 exercises I use to feel like I'm 26." — https://youtu.be/utBzlEiX-zA
    { day: 'day_5', ex: 'Dead Hang',                  sid: 'd5_bar_hang',  type: 'straight', sets: 1, min: 60, max: 60, order: 1,
      note: `BAR HANG

WHY IT MATTERS
Decompresses the spine, rebuilds the shoulders, and trains grip. Grip strength is a longevity biomarker — the 2018 BMJ study found low grip strength to be among the strongest predictors of early death (heart disease, cancer, all-cause mortality).

THE MOVE
Hang from a bar with arms straight. Shoulders open gently, ribs down, neck long.

PROTOCOL
• Beginner — chair-assisted, 5–10s
• Intermediate — full dead hang 20–60s, build to 2 min/day
• Advanced — 3 min/day across mixed grips, scapular pulls, one-arm hangs

SOURCE
https://youtu.be/utBzlEiX-zA` },
    { day: 'day_5', ex: 'Japanese Interval Walking',  sid: 'd5_iwt',       type: 'straight', sets: 1, min: 30, max: 30, order: 2,
      note: `JAPANESE INTERVAL WALKING (IWT)

WHY IT MATTERS
Reverses cardiovascular aging. VO2 max drops ~10%/decade after 30 — one of the biggest predictors of how long and how well you live. Original study in adults 60+ improved VO2 max, leg strength, and blood pressure more than steady-state walking in 5 months.

THE MOVE
Developed by Dr. Hiroshi Nose. Alternate fast walking (~70% effort) with slow walking. Repeat for 30 min, 4 days/week.

PROTOCOL
• Beginner — 2 min fast / 3 min slow
• Intermediate — 3 min fast / 3 min slow for 30 min
• Advanced — add incline or a weighted vest/rucksack

SOURCE
https://youtu.be/utBzlEiX-zA` },
    { day: 'day_5', ex: 'Asian Squat',                sid: 'd5_asian_sq',  type: 'straight', sets: 1, min: 5,  max: 10, order: 3,
      note: `ASIAN SQUAT

WHY IT MATTERS
The human resting position. Lose it and you lose ankle mobility, hip function, spinal health — eventually independence. Precursor to the sitting-rising test (2012, European Journal of Preventive Cardiology): people who struggled to sit and rise from the floor were 5× more likely to die within 6 years.

THE MOVE
Sit into a deep bodyweight squat with feet flat, chest tall. Hold and get comfortable.

PROTOCOL
• Beginner — hold a door frame or couch for support, heels elevated on books or a plate, 2–5 min/day
• Intermediate — unassisted, 5–10 min/day broken across the day
• Advanced — wider / asymmetric stances, overhead reach; make it your default resting position

SOURCE
https://youtu.be/utBzlEiX-zA` },
    { day: 'day_5', ex: "World's Greatest Stretch",   sid: 'd5_wgs',       type: 'straight', sets: 1, min: 3,  max: 3,  order: 4,
      note: `WORLD'S GREATEST STRETCH

WHY IT MATTERS
One flow that hits every joint that ages you — hips, T-spine, ankles, calves, shoulders. These joints lock down first, and stiffness in any of them shows up everywhere else. Hip mobility is one of the biggest predictors of fall risk; falls are the 2nd leading cause of accidental death worldwide.

THE MOVE
Lunge forward, drop the opposite hand to the floor inside the front foot, then rotate the same-side hand up toward the ceiling (T-spine rotation). Step through and switch sides.

PROTOCOL
• Beginner — walk through slowly, hold 2 breaths per position, skip the rotation
• Intermediate — full flow with T-spine rotation, 3 reps/side
• Advanced — add an overhead reach or hold a light weight in the rotation hand

SOURCE
https://youtu.be/utBzlEiX-zA` },
    { day: 'day_5', ex: 'Zone 2 Cardio',              sid: 'd5_zone2',     type: 'straight', sets: 1, min: 45, max: 45, order: 5,
      note: `ZONE 2 CARDIO

WHY IT MATTERS
Builds the engine for longevity. Mitochondria (cellular energy factories) shrink in number and quality with age — a core mechanism of aging itself. Zone 2 is the most effective way to reverse it. 2018 JAMA: low cardiorespiratory fitness predicted early death more strongly than smoking, diabetes, or heart disease.

THE MOVE
Steady aerobic effort at a pace where you can hold a conversation but it's slightly labored. Heart rate ~60–70% of max. Walk, cycle, easy row.

PROTOCOL
• Beginner — 3 × 30-min brisk walks/week (IWT works)
• Intermediate — 4 × 45-min sessions
• Advanced — 4 × 60-min sessions with a heart-rate monitor

TIP
Stack it with low-effort work — under-desk treadmill on meetings, exercise bike while watching videos.

SOURCE
https://youtu.be/utBzlEiX-zA` },
    { day: 'day_5', ex: 'Plyometrics',                sid: 'd5_plyo',      type: 'straight', sets: 3, min: 5,  max: 8,  order: 6,
      note: `PLYOMETRICS

WHY IT MATTERS
Fast-twitch fibers go first with age. Strength declines slowly, but power (strength × speed) declines ~2× as fast — 3–4%/year after 40. Power is what keeps you from falling and lets you catch yourself when you trip. Power loss is the single biggest predictor of fall-related death in older adults — bigger than strength loss, bigger than balance.

THE MOVE
Explosive jumps that train the nervous system to produce force fast. Match the variation to your level.

PROTOCOL
• Beginner — ankle pogos, calf jumps, line hops. Quiet landings — the ground should barely make a sound.
• Intermediate — broad jumps, skater bounds, low box jumps. Learn to absorb force.
• Advanced — depth jumps, bounding, single-leg hops.

SOURCE
https://youtu.be/utBzlEiX-zA` },
    { day: 'day_5', ex: "Farmer's Carry",             sid: 'd5_farmer',    type: 'straight', sets: 3, min: 60, max: 60, order: 7,
      note: `LOADED CARRIES

WHY IT MATTERS
Trains muscular endurance, grip, core, posture, breathing, and full-body structural integrity — all in one movement. Mimics real life: groceries, luggage, kids, furniture. Dr. Stuart McGill called loaded carries one of the single best exercises for spinal stability and core integrity.

THE MOVE
Pick up a heavy weight (kettlebell or dumbbell) and walk. Stand tall, ribs down, don't lean.

PROTOCOL
• Beginner — suitcase carry: one weight in one hand, 30s/side
• Intermediate — farmer's carry: both hands, heavier load, 60s
• Advanced — heavy farmer's carries at ~bodyweight per hand for 1+ min, plus overhead and mixed-grip variations

SOURCE
https://youtu.be/utBzlEiX-zA` },
  ];

  const sdeRows = sde.map(e => ({
    split_day_id: dayMap[e.day],
    exercise_id:  exMap[e.ex],
    short_id:     e.sid,
    set_type:     e.type,
    target_sets:  e.sets ?? null,
    target_reps_min: e.min,
    target_reps_max: e.max,
    sort_order:   e.order,
    note:         e.note ?? null,
    intensifier:  e.intensifier ?? null,
  }));

  const { error: sdeErr } = await supabase
    .from('split_day_exercises')
    .upsert(sdeRows, { onConflict: 'split_day_id,short_id', ignoreDuplicates: false });

  if (sdeErr) throw new Error(`Exercise seed failed: ${sdeErr.message}`);

  // Cycle 4 targets — all set_type now 'straight'. Former myo exercises keep their
  // existing weight, get a concrete set count (3), and rely on the intensifier
  // prompt above instead of activation+mini structure.
  const cycle4Targets = [
    // PUSH A
    { day: 'push_a', ex: 'Band Pull-apart',                w: 0,    sets: 2, min: 15, max: 20, rir: 2, type: 'straight' },
    { day: 'push_a', ex: 'Nautilus PL Incline Bench',     w: 45,   sets: 4, min: 8,  max: 8,  rir: 2, type: 'straight' },
    { day: 'push_a', ex: 'DB 45 Degree Incline',           w: 55,   sets: 3, min: 10, max: 12, rir: 2, type: 'straight' },
    { day: 'push_a', ex: 'Nautilus PL Seated Press',       w: 60,   sets: 3, min: 10, max: 10, rir: 2, type: 'straight' },
    { day: 'push_a', ex: 'Arsenal Lateral Raises',         w: 40,   sets: 3, min: 12, max: 15, rir: 1, type: 'straight' },
    { day: 'push_a', ex: 'Cable Rope Overhead Extension',  w: 45,   sets: 3, min: 12, max: 12, rir: 2, type: 'straight' },
    { day: 'push_a', ex: 'Nautilus Xpload Leg Press Incline', w: 90,   sets: 3, min: 10, max: 10, rir: 2, type: 'straight' },
    { day: 'push_a', ex: 'Kettlebell Swing',               w: 35,   sets: 3, min: 15, max: 20, rir: 1, type: 'straight' },

    // PUSH B
    { day: 'push_b', ex: 'Band Pull-apart',                w: 0,    sets: 2, min: 15, max: 20, rir: 2, type: 'straight' },
    { day: 'push_b', ex: 'Nautilus PL Flat Bench',         w: 60,   sets: 4, min: 8,  max: 10, rir: 2, type: 'straight' },
    { day: 'push_b', ex: 'DB Flat Bench',                  w: 65,   sets: 3, min: 10, max: 12, rir: 2, type: 'straight' },
    { day: 'push_b', ex: 'Nautilus PL Seated Press',       w: 100,  sets: 3, min: 8,  max: 10, rir: 2, type: 'straight' },
    { day: 'push_b', ex: 'Arsenal Lateral Raises',         w: 30,   sets: 3, min: 12, max: 15, rir: 1, type: 'straight' },
    { day: 'push_b', ex: 'Cable Rope Overhead Extension',  w: 45,   sets: 3, min: 12, max: 15, rir: 1, type: 'straight' },
    { day: 'push_b', ex: 'Bodybuilder Squat Machine',      w: 90,   sets: 3, min: 8,  max: 10, rir: 2, type: 'straight' },
    { day: 'push_b', ex: 'Nautilus Leg Extensions',        w: 120,  sets: 3, min: 12, max: 15, rir: 1, type: 'straight' },
    { day: 'push_b', ex: 'Kettlebell Swing',               w: 35,   sets: 3, min: 15, max: 20, rir: 1, type: 'straight' },

    // PULL A
    { day: 'pull_a', ex: 'Pull-up',                           w: 0,    sets: 3, min: 5,  max: 10, rir: 2, type: 'straight' },
    { day: 'pull_a', ex: 'Nautilus Lat Pulldown overhand',    w: 121,  sets: 3, min: 8,  max: 10, rir: 2, type: 'straight' },
    { day: 'pull_a', ex: 'Nautilus Seated Row V-bar',         w: 121,  sets: 3, min: 10, max: 12, rir: 2, type: 'straight' },
    { day: 'pull_a', ex: 'Cable Face Pulls',                  w: 43,   sets: 3, min: 15, max: 20, rir: 1, type: 'straight' },
    { day: 'pull_a', ex: 'Cable Rear Delt Fly',               w: 30,   sets: 3, min: 12, max: 15, rir: 1, type: 'straight' },
    { day: 'pull_a', ex: 'Cable Curls',                       w: 43,   sets: 3, min: 12, max: 15, rir: 1, type: 'straight' },
    { day: 'pull_a', ex: 'Hammer Curls',                      w: 35,   sets: 3, min: 12, max: 12, rir: 2, type: 'straight' },
    { day: 'pull_a', ex: 'Romanian Deadlift',                 w: 135,  sets: 3, min: 8,  max: 8,  rir: 2, type: 'straight' },
    { day: 'pull_a', ex: 'Nautilus Hamstring Curls',          w: 80,   sets: 3, min: 12, max: 15, rir: 1, type: 'straight' },
    { day: 'pull_a', ex: 'Suitcase Carry',                    w: 40,   sets: 2, min: 20, max: 20, rir: 2, type: 'straight' },
    { day: 'pull_a', ex: 'Kettlebell Swing',                  w: 35,   sets: 3, min: 15, max: 20, rir: 1, type: 'straight' },
    { day: 'pull_a', ex: 'Dead Hang',                         w: 0,    sets: 2, min: 30, max: 30, rir: 2, type: 'straight' },

    // PULL B
    { day: 'pull_b', ex: 'Nautilus Lat Pulldown underhand',    w: 121,  sets: 3, min: 8,  max: 12, rir: 2, type: 'straight' },
    { day: 'pull_b', ex: 'Nautilus Chest Supported Row High',  w: 50,   sets: 3, min: 10, max: 15, rir: 2, type: 'straight' },
    { day: 'pull_b', ex: 'Cable Face Pulls',                   w: 58.5, sets: 3, min: 15, max: 20, rir: 1, type: 'straight' },
    { day: 'pull_b', ex: 'Cable Rear Delt Fly',                w: 30,   sets: 3, min: 12, max: 15, rir: 1, type: 'straight' },
    { day: 'pull_b', ex: 'Incline DB Curls',                   w: 20,   sets: 3, min: 12, max: 15, rir: 1, type: 'straight' },
    { day: 'pull_b', ex: 'Cable Curls',                        w: 38.5, sets: 3, min: 12, max: 12, rir: 2, type: 'straight' },
    { day: 'pull_b', ex: 'Nautilus Hamstring Curls',           w: 80,   sets: 3, min: 12, max: 15, rir: 1, type: 'straight' },
    { day: 'pull_b', ex: 'Hip Thrust',                         w: 95,   sets: 3, min: 8,  max: 12, rir: 2, type: 'straight' },
    { day: 'pull_b', ex: 'Suitcase Carry',                     w: 40,   sets: 2, min: 20, max: 20, rir: 2, type: 'straight' },
    { day: 'pull_b', ex: 'Kettlebell Swing',                   w: 35,   sets: 3, min: 15, max: 20, rir: 1, type: 'straight' },
  ];

  const targetRows = cycle4Targets
    .filter(t => t.w !== null)
    .map(t => ({
      user_id:      userId,
      exercise_id:  exMap[t.ex],
      split_day_id: dayMap[t.day],
      week_number:  4,
      mesocycle:    1,
      target_weight: t.w,
      target_sets:  t.sets,
      target_reps_min: t.min,
      target_reps_max: t.max,
      target_rir:   t.rir,
      set_type:     t.type,
      source:       'seed',
    }));

  const { error: tErr } = await supabase
    .from('progression_targets')
    .upsert(targetRows, {
      onConflict: 'user_id,exercise_id,split_day_id,week_number,mesocycle',
      ignoreDuplicates: false,
    });

  if (tErr) throw new Error(`Target seed failed: ${tErr.message}`);

  return { dayMap, exMap };
}
