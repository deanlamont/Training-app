# HANDOFF — SwoleBro Training

Everything an assistant needs to pick this project up cold. Pair with `AGENTS.md`
(rules) and `supabase/schema.sql` (data model source of truth).

## 1. Stack and layout
React 18 + Vite 5 + `@supabase/supabase-js` + `vite-plugin-pwa` (installable PWA,
autoUpdate service worker). Plain JS/JSX. Inline styles; colors in `src/theme.js`.

```
src/
  main.jsx                  entry
  App.jsx                   ~2,300 lines: ALL screens + the root <App/> state machine
  theme.js                  `C` color tokens (dark synthwave theme)
  components/
    SignIn.jsx              Supabase auth UI
    Logo.jsx                SwoleBro mascot/lockup
  utils/
    supabaseClient.js       singleton client (null if env vars missing), PKCE auth
    loadProgramFromSupabase.js  load program/history; save targets, weights, reps, edits
    sessionSync.js          create session row, write set logs, mark complete, history lookups
    writeQueue.js           in-memory ordered write queue, 3 retries w/ backoff, failed counter
    progression.js          computeNextTargets(): the +5lb rule
    weeklyVolume.js         weekly hard-set totals per muscle vs VOLUME_TARGETS
    seedUserData.js         STALE first-login seed (see warning below)
supabase/
  schema.sql                source of truth, re-runnable
  seed.sql                  exercise master catalog
  dump_current_plan.sql     read-only query: what the LIVE plan actually is
  migrations/               dated, idempotent, hand-applied plan changes
```

Screens in `App.jsx` (function components): `HomeScreen`, `SessionScreen`
(+ `ExerciseCard`, `OptionSlot`, `Stepper`), `ResultsScreen`, `EditScreen`,
`WeightsScreen`, `ReferenceScreen`, `MobilityScreen`, `LibraryScreen` (read-only,
12 foundational lifts), `HomeWorkoutScreen`, `PeekModal`, `SyncPill`.

## 2. Data model (Supabase)
Identity is `auth.users`; there is no custom users table.

| table | purpose |
|---|---|
| `exercises` | master catalog, public read, no client writes. `weight_increment` default 5 |
| `split_days` | one row per user per training day (`day_key` e.g. `push_a`), `current_week` |
| `split_day_exercises` | ordered roster per day: `set_type`, `target_sets`, `target_reps_min/max`, `short_id`, `intensifier`, `optional`, `option_group`, `note` |
| `sessions` | one per workout; `completed_at` set on finish; `notes` holds the summary |
| `set_logs` | individual sets; `set_type` is `straight` or `challenge:<name>` |
| `progression_targets` | per user/exercise/day/week/mesocycle `target_weight`; unique on that tuple |
| `flags` | plateau/injury flags (present in schema; light use) |

RLS: owner-only on everything; child tables inherit via `split_days` / `sessions`.
**Gotcha:** an INSERT without a matching `WITH CHECK` silently affects 0 rows. That
was a past seed bug, so keep `with check` on every policy.

Day keys in use: 4-day split `push_a push_b pull_a pull_b`, reference `day_5`
(longevity, optional, read-only), 3-day alternative `full_body_1/2/3`
(same lifts redistributed for tennis-heavy weeks). `tennis_prep` is also a reference day.

## 3. How a workout flows
1. App loads: `loadProgramFromSupabase(userId)` builds `program` and `progress` from
   `split_days` + `split_day_exercises` + this week's `progression_targets`. If the user
   has no `split_days`, it falls back to `seedUserData`.
2. Start session → `createSessionRow` inserts `sessions`; session state is mirrored to
   `localStorage` (`swolebro_active_session`) so a killed iOS tab can resume.
3. Each logged set → `writeExerciseSets` queues a delete+insert of that exercise's rows
   in `set_logs` (idempotent rewrite) through `writeQueue` (ordered, retried, red banner
   via `SyncPill` if it ultimately fails).
4. Finish → `computeNextTargets` (progression.js) → `saveSessionTargets` writes next
   week's `progression_targets`, `markSessionComplete` stamps `completed_at`.
5. Home screen shows weekly set volume (`weeklyVolume.js`), challenge scoreboard
   (`loadChallengeStats`), and a "Recover last cloud session" button
   (`fetchMostRecentSessionAny`) for when local state is lost.

Other localStorage keys: `swolebro_home_workout`, `swolebro_mobility_done`.

## 4. Program design rules (the "why")
- Method: Renaissance Periodization-style hypertrophy. Weekly direct-set targets are in
  `VOLUME_TARGETS` (e.g. chest 12, back 16, side delts 12, quads 8, hamstrings 6).
  Heavy indirect work (triceps from pressing) means deliberately low direct targets.
- Progression: top of rep range on all work sets → +increment, else hold. Chippers
  (one total-rep target chipped away) go up when the target fits in ≤3 sets.
- Constraints: tennis / pickleball / disc golf already load the joints, so overuse
  pain drives exercise choice. Single-Leg RDL, kettlebell swings, carries/hangs,
  band pull-aparts, lateral band walks, Chabbles workout were all deliberately dropped.
- Pick-one slots (`option_group`, added 2026-11-05): Upper Chest Press, Flat Press,
  Vertical Pull, Row, Biceps, Triceps, Quads. Options in a slot share set count so
  volume is constant; the app suggests the least-recently-used option; each option keeps
  its own weight/progression.
- Optional exercises (`optional = true`) don't count toward session completion.
- Shared exercises sync weights across days (migration 2026-06-19).
- Challenge sets: optional final-set games (drop sets, tempo, etc.), logged as
  `challenge:*`, excluded from progression, tracked as a scoreboard/streak.

## 5. Changing the plan (the usual task)
1. Write `supabase/migrations/YYYY-MM-DD_short_name.sql`: idempotent, header comment
   explaining the why (copy the style of `2026-11-05_option_slots.sql`).
2. Paste the full SQL in your reply in a ```sql block (hard rule, see AGENTS.md).
3. User runs it in the Supabase SQL editor.
4. Code changes only if the schema/UI changed; update `schema.sql` and `APP_VERSION`.
5. To verify the result, user runs `supabase/dump_current_plan.sql` and pastes output.

New exercises: insert into `exercises` first (name unique), then `split_day_exercises`.
`progression_targets.target_weight` is NOT NULL, so exercises with no weight yet get no
row and display "TBD" until first logged.

## 6. Known gotchas
- `seedUserData.js` is stale: it still lists exercises removed long ago and old weights.
  Only runs for brand-new users.
- `FILE_STRUCTURE.md` previously described an abandoned AI-coach design (`src/api/`,
  Claude prompts). Nothing like that exists any more; progression is the local rule above.
- The PWA manifest description in `vite.config.js` still says "AI coach"; cosmetic.
- No tests. Verify with `npm run build` and by running the app.
- Write queue is memory-only on purpose. A closed tab can lose unflushed sets; the
  localStorage backstop and the Recover button mitigate this.
- Deployment: no host config is committed (no vercel/netlify files). **Fill in here
  where the app is deployed and how:** `TODO(owner)`.

## 7. Recent history (newest first)
- 2026-11-05 pick-one option slots across 4-day and 3-day splits
- 2026-11-04 dropped Single-Leg RDL; alternate Bulgarian split squat / leg extensions
- 2026-10-14 dropped Chabbles workout
- 2026-09-30 incline bench rep range, shoulder deload weights / Edit Weights screen
- 2026-08 volume rebalance, weekly volume tracking, optional exercise flag
- 2026-07 chippers, full-body 3-day split
- Earlier: gamification (challenges, scoreboard), SwoleBro synthwave rebrand,
  mobile-first redesign, Exercise Library

Use `git log` for detail; every plan change has a migration file with its rationale.
