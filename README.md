# Gym Tracker

A private workout tracker. SvelteKit app on Vercel, data in Neon Postgres,
saved to the home screen as a web app. One user: Kieren.

**Live:** the production URL you have saved. It never changes — merging to
`main` swaps what is served behind it.

## How deploys work

Git is the only deploy path.

| Push to | Gets you |
|---|---|
| `main` | production — the URL you have saved |
| any pull request | a preview deployment, linked on the PR |

Merge a PR and production updates within about a minute. Nothing else deploys
this app.

### Never run `vercel deploy` from the CLI

This is the one rule that matters, and it is worth knowing why.

A CLI deploy uploads whatever is in the working directory, committed or not. It
happened once, and for three weeks production ran an app whose source existed
nowhere in git — while every git-triggered build failed, because git held an
older, different version of the app. Recovering it meant reading the source back
out of the Vercel dashboard file by file.

The tell, on any deployment in the Vercel dashboard, is `gitDirty: 1` in its
metadata. A healthy deployment names a commit SHA that exists on GitHub.

If it is not in git, it is not real. Push a branch, open a PR, merge it.

## One database, two environments

Preview and production share the same Neon database. **A preview deployment
reads and writes your real training data.** It is not a sandbox.

Before opening a preview, or before merging anything that touches how data is
stored: **Stats → Download a backup.**

## If a release goes wrong

Vercel → the project → Deployments → the previous production deployment →
Rollback. Your data is untouched by a rollback; only the code serving it
changes.

## Which version is running?

Bottom of the **Stats** tab: `built from 5dcaa17 · main · 30 Aug 2026`. The
commit links to GitHub. It is stamped at build time from Vercel's own git
variables, so it cannot disagree with what is deployed.

## Environment variables

Two, both set in the Vercel project:

- `DATABASE_URL` — the Neon connection string
- `GYM_SESSION_SECRET` — signs the login cookie

Pull them for local work with `npx vercel env pull .env.local --yes`. Never
commit or paste the values anywhere — the connection string contains the
database password. `.gitignore` covers `.env*`, with `.env.example` as the one
exception; that file holds names only.

## Local development

```bash
npm install
npm run dev              # http://localhost:5173
npm run verify:program   # asserts the programme is intact
npm run build            # what CI and Vercel run
```

`npm run db:migrate` creates the table on a fresh database. It reads
`.env.local` and is not something you need in normal use.

## Checks

`.github/workflows/ci.yml` runs `npm ci`, `npm run verify:program` and
`npm run build` on every pull request and every push to `main`. A green tick on
a PR means the programme is intact and the app compiles. Vercel's own check on
the same PR means it deployed.

There is no deploy workflow in this repo, on purpose.

## Where things are

| | |
|---|---|
| `src/lib/program.js` | the five-day programme — edit exercises here |
| `src/lib/store.js` | state, cloud sync, records |
| `src/lib/prescribe.js` | what to do today, and why |
| `src/lib/bands.js` | rep bands, the set cap, and scoring |
| `src/lib/sessions.js` | one row per session, converting set-by-set history |
| `src/lib/training.js` | per-movement rules: low-rep eligibility, total-rep ranges |
| `src/routes/api/` | state, setup, login, logout |
| `docs/training-model.md` | the coaching model: bands, progression, what the interface means |
| `docs/recovery-note.md` | what was recovered from the Vercel dashboard vs rewritten |

Changing `program.js` means re-running `npm run verify:program`; it asserts
things the app depends on, like exactly one leg exercise per day, and checks
the progression rules against worked examples.
