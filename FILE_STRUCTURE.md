# File structure (current)

```
training-app/
├── AGENTS.md                 rules for AI assistants (twin of CLAUDE.md)
├── CLAUDE.md                 rules for Claude Code
├── HANDOFF.md                architecture, data flow, program rules, gotchas
├── TRANSITION_GUIDE.md       step-by-step: moving work to ChatGPT/Codex
├── .env.example              required env vars (copy to .env)
├── index.html, vite.config.js (PWA manifest), package.json
├── public/                   icons, manifest.json, brand/ images
├── supabase/
│   ├── schema.sql            tables + RLS (source of truth, re-runnable)
│   ├── seed.sql              exercise master catalog
│   ├── dump_current_plan.sql read-only: what the LIVE plan is
│   └── migrations/           dated idempotent plan changes, hand-applied
└── src/
    ├── main.jsx              entry
    ├── App.jsx               all screens + root app state
    ├── theme.js              color tokens
    ├── components/           Logo.jsx, SignIn.jsx
    └── utils/
        ├── supabaseClient.js
        ├── loadProgramFromSupabase.js
        ├── sessionSync.js
        ├── writeQueue.js
        ├── progression.js
        ├── weeklyVolume.js
        └── seedUserData.js   STALE first-run seed, not the live plan
```

Older versions of this file described a planned `src/api/` AI-coach pipeline,
hooks/ and screens/ folders, Tailwind, and Recharts. None of that was built.
