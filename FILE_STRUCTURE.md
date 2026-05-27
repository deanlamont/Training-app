# Training App — File Structure

```
training-app/
├── supabase/
│   ├── schema.sql          ✅ All 8 tables, RLS policies, indexes
│   └── seed.sql            ✅ Exercise master list
│
├── src/
│   ├── api/
│   │   ├── claudeSystemPrompt.js   ✅ RP coaching system prompt → JSON output
│   │   ├── buildTrainingPrompt.js  ✅ Assembles session data into user prompt
│   │   └── processSession.js       ✅ Full pipeline: fetch → Claude → save targets
│   │
│   ├── utils/
│   │   ├── supabaseClient.js       ✅ Supabase singleton
│   │   └── seedUserData.js         ✅ First-login seed: split + Week 3 targets
│   │
│   ├── hooks/
│   │   ├── useAuth.js              🔲 Auth state hook
│   │   ├── useSession.js           🔲 Active session state
│   │   └── useTargets.js           🔲 Fetch this week's targets
│   │
│   ├── components/
│   │   ├── StraightSetLogger.jsx   🔲 Log weight/reps per set, RIR optional
│   │   ├── ExerciseCard.jsx        🔲 Logger + target + optional intensifier prompt on final set
│   │   ├── SessionSummary.jsx      🔲 Post-session Claude results display
│   │   ├── ProgressChart.jsx       🔲 Recharts weight-over-time per exercise
│   │   └── FlagBadge.jsx           🔲 ⚠ plateau/stale/injury indicator
│   │
│   ├── screens/
│   │   ├── HomeScreen.jsx          🔲 Today's day + week, start session button
│   │   ├── WorkoutScreen.jsx       🔲 Exercise-by-exercise logger
│   │   ├── SummaryScreen.jsx       🔲 Session complete + Claude targets
│   │   ├── HistoryScreen.jsx       🔲 Past sessions, filterable
│   │   └── ProfileScreen.jsx       🔲 Weight chart, stats
│   │
│   ├── App.jsx                     🔲 Router + auth guard
│   └── main.jsx                    🔲 Entry point
│
├── .env                            🔲 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├── package.json                    🔲
├── vite.config.js                  🔲
└── tailwind.config.js              🔲
```

## Build Order

### Step 1 — Supabase (DONE ✅)
1. Run `schema.sql` in Supabase SQL editor
2. Run `seed.sql` to load exercise master list
3. Create `.env` with your Supabase URL + anon key

### Step 2 — Auth + Seed
1. Build `useAuth.js` hook (Supabase magic link or email/password)
2. On first login, call `seedUserData(userId)` to set up split + targets

### Step 3 — Home Screen
- Shows current week (Week 3, Meso 1)
- Shows today's split day
- "Start Workout" button → WorkoutScreen

### Step 4 — Workout Logger
- Loops through `split_day_exercises` for today
- StraightSetLogger: set number, weight input, reps input, optional RIR
- On the final set, if the exercise has an `intensifier` (Athlean-X cue like
  "Slow 3s eccentric + peak squeeze"), surface it as a coaching note
- "Finish Session" → triggers processSession()

### Step 5 — Claude Integration (DONE ✅)
- processSession.js handles everything
- Returns targets + flags + session summary

### Step 6 — Summary Screen
- Display Claude's response in clean card layout
- Show next week's targets per exercise
- Show any flags with coaching notes

### Step 7 — Progress Charts
- Recharts line chart, weight over time per exercise
- Filterable by split day

## Key Notes

- Nautilus stack: 5lb horseshoe increments (so 148 → 153, not 150)
- Cable stations: 4.5lb increments (standard cable stack)
- All sets log as `set_type='straight'`. Historical `myo_activation` /
  `myo_mini` rows from the pre-Athlean-X era still exist in `set_logs` and
  display as plain work sets on history/recovery — never produced anew.
- TBD weights in seed = null, Claude fills after first session for that day
- Pull B weights are mostly TBD — will populate after first Pull B session
