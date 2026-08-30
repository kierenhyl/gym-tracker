# Where this code came from

The cloud-saving version of this app was never committed. It was built locally
and deployed straight to Vercel with `vercel deploy` from a working directory
with uncommitted changes (`source: cli`, `gitDirty: 1`), so GitHub only ever had
the older browser-storage version. Production ran deployment
`dpl_Fp7QHJUQgwD8XCEzrpri9fcrhMrm` for about three weeks with no source in git,
while every git-triggered build failed on an unrelated dependency conflict.

## Recovered verbatim

Read out of the Vercel dashboard's source browser for that deployment:

- `scripts/migrate.js`, `scripts/verify-program.js`
- `src/lib/server/db.js`, `src/lib/server/auth.js`
- `src/routes/api/{state,setup,login,logout}/+server.js`
- `src/routes/+layout.js`, `svelte.config.js`, `package.json`, `SETUP.md`
- `src/lib/program.js`, `src/lib/store.js`

Two independent checks that the recovery is faithful:

1. `npm run verify:program` — the programme's own assertion script, recovered
   alongside it — passes against the transcribed `program.js`.
2. Every recovered server file compiles to exactly the byte size recorded in the
   original deployment's build log: `db.js` 0.55 kB, `auth.js` 2.17 kB,
   `api/state` 1.44 kB, `api/setup` 1.45 kB, `api/login` 0.73 kB,
   `api/logout` 0.22 kB.

## Rebuilt, not recovered

Vercel's source browser cannot preview `.svelte` files and offers no download,
so the components were rewritten against the contract `store.js` defines rather
than copied. They are new code and should be reviewed as such:

- `AccessGate.svelte` — password / first-run setup
- `MigrationModal.svelte` — one-time legacy import
- `SyncIndicator.svelte` — save state, retry, conflict reload
- `+page.svelte`, `+layout.svelte`, `ExerciseCard`, `LogModal`,
  `EditHistoryModal`, `AnalyticsView`, `HistoryView`

## Consequences worth remembering

- The programme in git was a **different programme** from the one being trained.
  Anything built against the old `program.js` was built against the wrong
  exercises.
- Production and preview share one Neon database. A preview deployment reads and
  writes real training data. Verify on a preview before promoting, but treat a
  preview as live data, not a sandbox.
- There was no way to export cloud data. `downloadCloudBackup()` was added so a
  bad release has an undo.
