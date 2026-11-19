# AGENTS.md — instructions for AI coding assistants

Read this first, then `HANDOFF.md` (architecture, data model, training rules).
This file is the tool-neutral twin of `CLAUDE.md`; keep the two in sync.

## What this is
SwoleBro Training: a mobile-first PWA for logging gym workouts and auto-progressing
weights. React 18 + Vite + Supabase (Postgres, auth, RLS). Single user in practice,
used on an iPhone in the gym. No test suite, no TypeScript, no backend server.

## Commands
- `npm install`
- `npm run dev` — local dev server (needs `.env`, see below)
- `npm run build` — production build; run it before declaring a change done
- There are no tests or linters. Verify by building and, for UI, running the dev server.

## Environment
`.env` (never commit) needs:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
Without these the app shows "Supabase env vars missing". See `.env.example`.

## Hard rules
1. **Supabase SQL migrations**: whenever a change needs a migration, ALSO paste the
   full SQL in a fenced `sql` block in your reply so the user can copy it straight
   into the Supabase SQL editor. Never just point at the file path. The user applies
   migrations by hand; you cannot reach the database.
2. **The live program lives in Supabase, not in the code.** `src/utils/seedUserData.js`
   is a stale first-run seed. Never build anything off it. To see the real plan, have the
   user run `supabase/dump_current_plan.sql` and paste the result.
3. **Plan changes = a new dated migration** in `supabase/migrations/YYYY-MM-DD_name.sql`.
   Make it idempotent and re-runnable, with a header comment explaining WHY.
   Also update `supabase/schema.sql` if the schema changes (it is the source of truth).
4. **Keep RLS intact.** Every owning table has `using` + `with check` policies. New
   tables need RLS enabled and the same pattern.
5. **Don't commit secrets**, `.env`, or `.DS_Store`.
6. Bump `APP_VERSION` in `src/App.jsx` when shipping a user-visible change.
7. Do not open a PR unless asked. Work on a branch; the user merges.
8. Keep changes small and match existing style (inline styles + `src/theme.js` `C` colors,
   no CSS framework, no new dependencies without asking).

## Domain rules (don't "fix" these)
- Progression is deliberately simple: hit the top of the rep range on every work set
  → +increment (default 5 lb); otherwise hold. No RIR logic, no auto-deload.
- Single-Leg RDL is intentionally excluded everywhere. Joint-friendly choices matter
  because of tennis/pickleball/disc golf.
- "Pick one" option slots (`option_group`) have equal set counts so weekly volume is
  unchanged whichever option is chosen.
- Challenge sets (`set_type = 'challenge:*'`) never affect progression.
- Write queue is in-memory by design (iOS Safari private browsing wipes storage).
