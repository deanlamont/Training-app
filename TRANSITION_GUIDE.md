# Moving this project to ChatGPT — step by step

Total time: about 20 minutes. Do the steps in order.

## Part A — Save everything (5 min)

1. **Merge this branch.** On GitHub, merge branch `claude/epic-wright-jfb4zm`
   into `main` (or ask me to open the PR). This adds `AGENTS.md`, `HANDOFF.md`,
   `.env.example`, and the corrected `FILE_STRUCTURE.md`.
2. **Confirm nothing is stranded.** Anything not on GitHub does not transfer.
3. **Locate your `.env`** on your own machine (Supabase URL + anon key). It is not in
   the repo and ChatGPT never needs it pasted into chat: it only matters when you
   run the app yourself.
4. **Fill in the deployment TODO.** In `HANDOFF.md` section 6, write where the app is
   hosted (Vercel, Netlify, etc.) and how it deploys. I couldn't find this in the repo.

## Part B — Pick how you'll use ChatGPT (2 min)

| Option | Best for | Setup |
|---|---|---|
| **A. Codex (ChatGPT's coding agent)** | Closest to how you work now: it edits the repo and commits | Connect GitHub in ChatGPT → Codex, select `deanlamont/Training-app` |
| **B. ChatGPT Project (chat only)** | No setup, copy/paste workflow | New Project, upload files, paste instructions |

Recommended: **A**, falling back to **B** if Codex isn't available on your plan.

## Part C — Set up Option A (Codex)

1. In ChatGPT, open **Codex** and connect your GitHub account.
2. Grant access to the `Training-app` repository.
3. Create an environment for it (setup command `npm install`). ChatGPT's menus change often; if a step differs, follow its on-screen prompts.
4. Codex automatically reads `AGENTS.md` from the repo root, which has all your rules.
5. Start a task with the **first prompt** below.

## Part C' — Set up Option B (ChatGPT Project)

1. New **Project** called "SwoleBro Training".
2. In the project's instructions, paste the entire contents of `AGENTS.md`.
3. Upload: `HANDOFF.md`, `supabase/schema.sql`, `src/App.jsx`, and everything in
   `src/utils/`. Re-upload any file after it changes.
4. Start a chat with the **first prompt** below.
5. When ChatGPT gives you edited files, paste them into your local repo, run
   `npm run build`, then commit and push.

## Part D — First prompt (copy exactly)

```
You are taking over development of my SwoleBro Training app from another AI assistant.
Read AGENTS.md and HANDOFF.md fully, then skim supabase/schema.sql and src/utils/.
Reply with: (1) a 5-line summary of how the app works, (2) the hard rules you will
follow, (3) anything in the docs that looks wrong or missing. Do not change any
files yet.
```

## Part E — Verify the handoff worked (5 min)

Give it these small tests, in order. If it passes all four, you're set.

1. "Which migration added pick-one slots, and what does `option_group` do?"
   Expect: `2026-11-05_option_slots.sql`; alternatives for one slot, pick one, skip rest.
2. "Why shouldn't you use seedUserData.js to see my current program?"
   Expect: it's stale; the live plan is in Supabase; use `dump_current_plan.sql`.
3. "Write a migration to change the target sets of one exercise you pick (e.g. Face Pulls) to 4."
   Expect: a new dated idempotent file AND the SQL pasted in a ```sql block.
4. "How does the app decide when to raise weight?"
   Expect: top of rep range on every work set → +5 lb, challenge sets ignored.

## Part F — Daily workflow after the switch

- **Plan changes:** ask for the change → it writes a migration and pastes the SQL →
  you run it in the Supabase SQL editor → run `dump_current_plan.sql` to confirm.
- **Code changes:** ask → review diff → `npm run build` → merge.
- **Starting a new chat/task:** always begin with "Read AGENTS.md and HANDOFF.md".
- **Keep docs fresh:** after any meaningful change, ask it to update `HANDOFF.md`.

## What does NOT carry over (so you aren't surprised)

- This conversation's memory (the docs replace it).
- My ability to run commands, push branches, and see your environment. Codex can do
  commands and commits; plain ChatGPT cannot.
- Direct database access. Nobody here has it; you apply SQL by hand, same as now.
- Gmail/Canva and other integrations configured in this Claude setup.

## Keep Claude as a fallback

Both `CLAUDE.md` and `AGENTS.md` stay in the repo, so you can switch back at any time
with no re-onboarding. Keep them in sync if you edit either.
