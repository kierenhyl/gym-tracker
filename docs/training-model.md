# Training model

Why the app tracks what it tracks. This is the reasoning behind `program.js`,
`bands.js`, `sessions.js`, `prescribe.js` and `training.js`. Read it before
changing any of the numbers below.

## Why it changed (programme version 3)

The previous model took every set to failure and chased one total-rep number
per exercise, in up to five sets. The research doesn't support either rule:

- **Failure isn't needed.** Sets taken close to failure grow muscle about as
  well as sets taken to failure, with less fatigue to recover from. Stopping
  1-2 reps short keeps the stimulus and makes the next set, and the next
  session, better.
- **The rep range is wide.** Anywhere from about 5 to 30 reps per set builds
  muscle when the set ends close to failure. Heavier sets (4-8 reps) build
  strength more; the rest of the session can live at 8-20.
- **Volume is counted in hard sets.** About 10-20 hard sets per muscle per week
  is the useful range. Beyond about 11 sets for one muscle in one session,
  extra sets add little: spread them across the week.
- **Frequency helps strength more than size.** Training a lift twice a week
  mostly pays off in strength, so the main lifts appear twice per cycle: once
  heavy, once light.

A fixed set count also makes the numbers comparable. "Up to five sets to reach
a total" let a total grow by adding sets rather than strength.

## The rules

- Every set stops **1-2 reps short of failure**. The last set of an isolation
  exercise may go to failure.
- Each exercise has a **fixed number of sets**: the programmed `sets`.
- **Heavy days** (days 1-3) start with **2 heavy lifts**: 4-8 reps, about
  80-85% of 1RM, stopping 2 short. Everything else is 8-20 reps.
- **Light days** (days 4-5) repeat the main movements in a higher range.

## The programme

★ is the recommended variation; the alternatives ship as built-in swaps.
**H** marks a heavy slot (Low band).

| Day | Exercises |
|---|---|
| 1 · Push heavy | H Smith bench 3 × 4-6 · H Hack squat 3 × 5-8 · Cable lateral raise 3 × 12-20 · Overhead cable triceps 3 × 10-15 · Cable crunch 2 × 10-15 |
| 2 · Pull heavy | H Chest-supported row 3 × 5-8 · H Neutral-grip pulldown 3 × 6-10 · Seated ham curl 3 × 8-12 · Reverse pec deck 3 × 12-20 · Bayesian curl 3 × 10-15 |
| 3 · Shoulders & legs | H Machine shoulder press 3 × 5-8 · H Leg press 3 × 5-8 · Machine incline press 3 × 8-12 · Cable lateral raise 3 × 12-20 · Rope pushdown 2 × 10-15 · Cable crunch 2 × 10-15 |
| 4 · Pull light & legs | Neutral-grip pulldown 3 × 10-15 · Machine row 3 × 10-15 · Leg extension 3 × 10-15 · Seated ham curl 3 × 10-15 · Incline DB curl 3 × 10-15 · Reverse cable crossover 2 × 12-20 |
| 5 · Push light | Smith bench 3 × 8-12 · Hack squat 2 × 10-15 · Pec deck 2 × 12-20 · Cable lateral raise 3 × 12-20 · Overhead cable triceps 2 × 10-15 · Standing calf raise 3 × 8-15 · Ab crunch machine 2 × 10-15 |

Weekly direct sets: chest 11, back 12, quads 11, side delts 9, triceps 7,
biceps 6, hamstrings 6, rear delts 5, abs 6, calves 3, front delts 3. 79 in
total. No muscle gets more than 11 direct sets in one session.

`verify-program.js` asserts the table, two heavy slots first on each heavy
day and none on light days, every heavy slot (alternatives included) on a
heavy-eligible setup, the weekly totals and the per-session cap.

## Bands

| Band | Key | Default per-set range |
|---|---|---|
| Low | `heavy` | 4-8 |
| Normal | `moderate` | 8-12 |
| High | `volume` | 16-20 |

The keys predate the labels and stay as they are, because every stored row
already carries them.

**The band is declared, not worked out.** A heavy slot says `band: 'heavy'`,
so hack squat at 5-8 is Low even though 5-8 would otherwise read as Normal.
Other slots use the band their range sits in. The band picked on the card (a
chip per band) is the band the session is saved under, for the day.

**Heavy and light are the same movement in different bands.** Day 1's Smith
bench (Low, 4-6) and day 5's (Normal, 8-12) share the movement key
`smith-bench-press`, so they share records per band but keep separate
histories and separate targets.

The programmed band uses the programmed range. Other bands use the default.
If a slot's band isn't allowed on the variant you picked (a custom variant on
a heavy slot), it falls back to Normal with the Normal default range.

## Progression: double progression, set by set

Target and history both come from your **last session in this band on this
variant**, logged under this model.

| Last session in this band | Today |
|---|---|
| None | Set a baseline: pick a weight, aim for the range |
| Every set at or above the top, first time at this weight | **Same weight, hit it once more** |
| Every set at the top, 2 sessions in a row at this weight | **Add weight.** Anything over last time; every set aims for the bottom |
| Inside the range | Same weight, +1 rep on any set below the top |
| Under the bottom, once | Same weight, aim for the bottom on every set. Normal right after a weight jump |
| Under the bottom, twice at that weight | Drop about 10% |
| No gain in 3 sessions at one weight | Deload about 10% |
| Rough day (readiness) | Match last session, set by set |

"Under the bottom" means the **average** reps per set is below the bottom of
the range. One tired last set doesn't count as a miss on its own.

Confirming the top once before adding weight stops one good day from forcing
a jump the next session can't hold.

Worked example, heavy Smith bench (3 × 4-6):

| Session | Target | Did | Next |
|---|---|---|---|
| 1 | 80 × 4-6 (baseline) | 6, 5, 4 | 80 × 6, 6, 5 |
| 2 | 80 × 6, 6, 5 | 6, 6, 6 | 80 × 6 (once more) |
| 3 | 80 × 6 | 6, 7, 6 | more than 80 × 4 |
| 4 | 82.5 × 4 | 4, 3, 3 | 82.5 × 4 (repeat) |

`scripts/verify-program.js` checks every rule above with worked examples.

### The weight is typed, never assumed

Machines and stacks step differently, so the app never works out the next
weight. After topping the range twice the card shows `> 80↑` and the log
sheet's weight fields start empty. The first weight you type fills the sets
you haven't changed. Whatever you type becomes the new rung.

### The log sheet

One row per set, pre-filled with today's target weight and reps. You only
change a number you missed. Clear a set's reps to skip it. Below the rows,
the sheet says what the sets mean for next time, by the same rules that set
today's target: `next time 80 × 6, 6, 5`, `top of the range: hit it once more
next time`, or `under 4: same weight next time`.

## History from before this model

Nothing stored is rewritten. `sessions.js` reads three shapes:

- **Per-set rows** (`format: 'set'`, sharing a `setGroupId`): the current
  model. Band declared, reps kept in set order. Only these drive progression.
- **Total rows** (`format: 'total'`): the previous model, one weight and a
  total reached with every set to failure.
- **Older set-by-set rows**: grouped by `setGroupId`, or by movement and day.
  Total = the reps of every set at the main weight; weight = the one most sets
  used; band = the average reps per set, snapped to an allowed band. Old
  myo-rep rows carry their whole effort in `totalReps`.

The two old shapes still show in history and still count for records. But
their sets went to failure, so a "+1 rep" target built on them would push you
back to failure. When a variant and band has no per-set session yet, the card
shows the old one as a reference (`last: 80 × 25 total`, or
`last: 80 × 9, 8, 7 (old)`) and today is a baseline.

A backup taken before this change restores cleanly, because the stored shape
of old rows never changed.

## Records

A best is per movement and band, ranked by **weight × total reps** (for a
per-set session, the reps of every set at its main weight). At the same
weight, more reps wins. At the same total, a heavier weight wins. Old
total-rep sessions keep their records.

The best is not on the card. The card is today's job; the best is history.
Bests live in the history sheet and on the Stats tab.

The Stats tab charts **working weight** per movement and band. It rises only
when a range is topped, so it is the cleanest line of progress.

## Weekly sets per muscle (Stats)

Counted from the sets you actually **logged** in the last 7 days, not the
programmed sets. An exercise you didn't log adds nothing.

- A direct set counts 1 towards the exercise's muscle.
- An indirect set counts 0.5: pressing for triceps and front delts, rows and
  pulldowns for biceps and rear delts, hack squat and leg press for glutes
  (`INDIRECT_MUSCLES` in `training.js`).
- Legs are included.

The bars show the 10-20 range. The alert fires only when a muscle is **over
20**, or **under what the sessions you finished this week planned** (you
missed sets). It does not fire for being under 10 on its own: the programme
doses some muscles below 10 on purpose (calves 3, abs 6, hamstrings 6), and
an alert that is always on stops meaning anything.

Old total-rep rows don't record sets, so they don't count. The first week
after the switch reads low until a full cycle is logged.

## Low-rep eligibility is a safety rule

The Low band is offered only where the setup is stable and a near-maximal
effort does not depend on stabiliser fatigue or spinal position. See
`HEAVY_ELIGIBLE` in `training.js`.

**Allowed:** Smith bench press, machine chest press, machine shoulder press,
Smith shoulder press, machine incline press, chest-supported row, machine row,
neutral-grip pulldown, wide-grip pulldown, hack squat, leg press, belt squat,
machine hip thrust.

**Normal and High only:** everything else: all dumbbell work (stabiliser
limited), all cable isolation, leg extension and hamstring curls (knee and
hamstring risk under near-maximal load), and every custom variant.

## Visual language

The interface has one job during a session: answer "what do I do right now,
and which way am I pushing". Everything else is one tap away.

**Hierarchy.** Only the exercise being worked on is expanded; the rest collapse
to a single fixed-height line. Before a session starts, tapping a card opens it
as a preview: the target, the variation and band chips and history all work,
but logging and ticking wait for the session. The instruction is two values at
`t-display`, **weight × reps**, and nothing else on the card is that size.

```
80   ×   6, 6, 5↑
KG       REPS · 3 SETS
```

When every set aims the same, the reps collapse to one number: `80 × 6`.

Above it sit the variation chips (★ first) and the band chips. Below it sit
the set bars, a short note only where a bare number would confuse, the
highlighted effort line ("Stop 1-2 reps short") and the `last:` line.

**The set bars.** One bar per set, from zero to the top of the per-set range,
with the range shaded. Each fills to where that set landed last time and rings
today's target. A weight step empties them: the new rung starts from nothing,
and the rings turn gold because that is progress, not failure.

**Arrows.** The arrow sits on whichever quantity should move, driven by
`prescription.direction` (`move`, `tone`), not by any wording.

| `move` | `tone` | Reads as |
|---|---|---|
| `reps` | push | `80 × 6, 6, 5↑`: hold the weight, add reps |
| `load` | new | `> 80↑ × 4`: go up a weight, bars reset |
| `load` | back-off | `72↓ × 4`: amber, ease off |
| `none` | hold | no arrow: once more, repeat or match |
| `none` | new | no bar fill: set a baseline |

**Colour: one meaning each.**

| Colour | Means |
|---|---|
| accent | act on this today |
| success | done |
| gold | an achievement or a new rung |
| amber | ease off, or sets missed |
| dim / muted | reference only |

**Type: four steps.** `t-display` 20px for instruction numbers, `t-title` 15px
for the exercise name, `t-body` 13px for notes, `t-label` / `t-meta` 11px for
everything else.

## Sheets

Every modal is one `Sheet.svelte`: capped at 85vh, with a sticky header carrying
a 44px close button, plus Escape and backdrop-tap, so it can be left one-handed
between sets. The one exception is the restore prompt, which needs an explicit
choice (`dismissible={false}`).

## Equipment variations

The same movement on a different station is not the same load. Each slot's ★
pick and its built-in alternatives (from `program.js`) show as chips on the
card. Each has its own movement key, so its own history. An alternative trains
like its slot: same sets, range and band.

You can also add your own variation from inside the app ("Cable machine by
the pilates room"). It gets its own movement key and history too. With no
history on the variant you picked, the app shows a sibling's last session as a
**reference**, not a target. `variations.js` suggests extra stations; nothing
is created until you tap one. Custom variants are never Low-band eligible.

## Myo-reps are retired

Twelve slots used to be myo-reps. The programme no longer has a `method`
field, and `verify-program.js` asserts that. Old myo-rep sessions keep their
totals (see above).
