# Training model

Why the app tracks what it tracks. This is the reasoning behind `bands.js`,
`prescribe.js`, and the band config in `program.js` — read it before changing
any of the numbers below.

## The problem this replaces

The old model kept one record per exercise, ranked by weight with reps only as
a tiebreaker. So 4 × 100kg beat 10 × 90kg and stayed on the card forever, even
though the second set is better work by every measure that matters:

| Set | Total load | e1RM (Epley) | e1RM (Brzycki) |
|---|---|---|---|
| 4 × 100kg | 400 | 113kg | 109kg |
| 10 × 90kg | 900 | 120kg | 120kg |

Worse, the *method* (`straight` / `myorep` / `volume`) was a property of the
program, decided before you walked into the gym. A high-rep day on an exercise
programmed as `straight` was filed against a heavy PR it was never chasing, so
it could only ever read as a failure.

## Two independent axes

The old `method` field conflated two different things. They are now separate:

- **Band** — *derived* from the reps you actually performed. Never declared.
- **Structure** — *declared*, because the app cannot infer it: `straight` or
  `myorep`.

### Bands

| Band | Reps | Purpose |
|---|---|---|
| Heavy | 1–5 | Express and re-anchor strength |
| Moderate | 6–15 | The default. Most of the work. |
| Volume | 16+ | Isolation, joint-friendly work, under-recovered days |

The moderate/volume line sits at 15, not the more conventional 12, because the
boundaries are fitted to this programme rather than the other way round. With a
6–12 moderate band, 18 of the programme's 26 movements have a prescribed rep
range straddling a boundary — 10-15 and 8-15 appear everywhere. At 6–15 only
four straddle, and all four are myo-rep movements, which are bucketed
separately anyway. In practice nothing straddles.

Because the moderate band now reaches 15 reps, the estimated-1RM calculation
clamps reps at 12 (`E1RM_REP_CAP`). Epley inflates badly past that, and a set of
15 must not score as a bigger 1RM than it really represents.

A set is filed by what you did, so a good high-rep day is compared against
high-rep history. If the reps land in a band the exercise is not eligible for,
the set snaps to the nearest eligible band rather than vanishing into an unused
bucket (`nearestEligibleBand`).

### Records

Records bucket by `movement::bucket`, where bucket is the band for straight
sets and `myo` for myo-reps. Ranking within a bucket:

- **Heavy and moderate** → estimated 1RM (Epley). Only trustworthy to ~12 reps,
  which is exactly the range these two bands cover.
- **Volume and myo** → total load (weight × reps). Epley is fantasy above ~12
  reps: it awards a set of 20 a 1.67× multiplier.

### Myo-reps

Not a band — a set structure, usually sitting in the moderate-to-high rep
range. Comparing `weight × reps` to a straight set is meaningless, so myo-reps
get their own track per movement. They record an activation set to near
failure plus mini-sets with 10–20s rest.

**Progression is on the activation set; the total is the record.** These are
two different jobs and they were previously muddled — the card targeted the
activation set, promised to beat the total, and drew its track over the
activation range. One number now does each job:

- **Activation reps** are what you chase, and what gates the load step. Reach
  the top of the range on the activation set and the weight goes up.
- **Total reps** (activation + mini-sets) is scored as tonnage and holds the
  record for the movement. It is displayed, never targeted.

Chasing the total would reward holding back on the activation set to earn more
mini-sets, which is exactly backwards. The mini-sets self-terminate; the
activation set is the part you actually control.

On the card this is one number with a `+`: `55kg × 12+ × 2` — twelve on the
activation set, then mini-sets until you cannot, twice. The reference line
carries the total: `last 55 × 11 → 23 total`.

## Band eligibility is a safety rule

Heavy work is allowed only where the setup is stable and a near-maximal effort
does not depend on stabiliser fatigue or spinal position. See `HEAVY_ELIGIBLE`
in `program.js`.

**Allowed (8 of 26):** smith bench press, machine shoulder press, machine
incline press, chest-supported row, machine row, neutral-grip pulldown, hack
squat, machine hip thrust.

**Capped at moderate:** everything else — all dumbbell work (stabiliser
limited), all cable isolation, the half-kneeling pulldown (unstable by design),
leg extension and seated hamstring curl (knee and hamstring risk under
near-maximal load), Pallof press (an anti-rotation drill, not a loadable lift).

The programme itself never prescribes heavy work: its lowest range is 6–10. The
heavy band is therefore only ever reached through the periodic heavy test. The
one leg exercise per day is programmed at exactly one set, which happens to be
the right shape for a heavy test anyway.

## Load steps, and where they are not available

Smallest realistic jump is 2.5kg on a bar or dumbbell, 5kg on a plate-loaded
machine or a stack. On four movements — cable lateral raise, reverse pec deck,
reverse cable crossover, pec deck — a 5kg stack step is 30–50% of the working
load. Single-step load progression is not really available there, which is
presumably why they are programmed 12–20 rather than 8–12. Those movements are
flagged `REP_PROGRESSION_ONLY`: they chase reps to the top of the range, and a
load step is presented as an event that will drop reps sharply, not a routine
increment.

## The prescription engine

The target comes from your **last session in this band on this variant**, never
from an all-time PR. Chasing an all-time PR every session means training at RIR
0 five days a week, which is how people stall and get hurt.

### Double progression

Hold a load until you reach the top of the target rep range, then add the
smallest increment and drop back to the bottom.

| Last time in this band | RIR | Today |
|---|---|---|
| Below range | 0 | Load is too heavy — drop ~10% |
| Below range | 1+ | Same load, push closer to failure |
| Inside range | any | Same load, +1 rep |
| At/above top | 1+ | Add the smallest increment, back to the bottom |
| At/above top | 0 | Repeat once to consolidate, then add |
| At/above top | unknown | Repeat and record the effort first |
| No gain × 3 sessions | any | Deload 10% for one session, then rebuild |

A load jump needs to know how hard the last set was. Adding a rep at the same
load is safe without that; adding weight is not — hence the `confirm` case.

### Effort is only asked for when it changes the answer

Read the table above and the RIR column is blank — "any" — for every row where
the reps land *inside* the range. The engine reads `rir` in exactly two places:
below the range, and at or above the top of it. So those are the only two times
the log screen asks.

Land mid-range and the question does not appear at all; most sessions never see
it. When it does appear, its appearing is the signal that this one matters, so
it needs no explanatory copy beneath it.

The check runs across every set in the group, not just the best one: sets in a
group can land in different bands, and each band keeps its own history, so a set
that is mid-range for today's prescription may be top-of-range for the band it
actually lands in.

### Choosing the band

Hypertrophy is roughly equivalent from about 5 to 30 reps *provided the set is
taken close to failure*. What differs is fatigue cost per unit of stimulus:
heavy sets cost more joint and CNS fatigue, very high reps gas you out. Moderate
is the efficiency sweet spot. Therefore:

- Moderate is the default — most of your sets.
- Heavy is a periodic test. It requires the exercise to be heavy-eligible, at
  least 3 moderate sessions of base, at least 21 days since the last heavy
  attempt on that movement (14 if you report feeling good), **and** measurable
  improvement in your moderate work since that attempt.
- Volume covers isolation, joint-unfriendly work, and under-recovered days.

### Readiness

One tap at session start (rough / normal / good). A rough day never programmes
a heavy test, and downgrades "add load" or "add a rep" to "match last session".
A maintained session beats a bad one you have to recover from. Readiness never
blocks a deload.

## Fatigue guardrails

Three checks on the stats tab:

1. **Stall detection** → the deload row above.
2. **RIR drift** → if most sets in each of the last two sessions went to
   failure, that is accumulated fatigue, not a strength problem.
3. **Weekly hard sets per muscle** → programmed sets from completed sessions
   over 7 days, against a 10–20 target band. Leg muscles are excluded
   (`GUARDRAIL_EXEMPT_MUSCLES`): one exercise at one set per day is the
   programme's deliberate recovery choice, asserted by
   `scripts/verify-program.js`, not an accident to flag.

## Equipment variations

The same movement on a different station is not the same load — cable stacks
are wired differently and machines have different leverage. Rather than fudge
it with calibration offsets, you can add your own variation from inside the app
("Cable machine by the pilates room"). It gets its own movement key and its own
records, so numbers stay apples-to-apples. When you have no history on the
variant you picked, the app shows a sibling's best as a **reference**, not a
target, and treats the session as calibration.

The programme deliberately ships no built-in alternatives — `verify-program.js`
asserts there are none, and switching was previously disabled outright on the
grounds that the researched primary movement should always win. User-created
variations are the only swap mechanism, which keeps that intent: the programme
is still fixed, you are only naming which physical station you used.

## Migrated data

Entries logged under the old model are kept in full. They are split into
structure plus a band re-derived from the reps actually performed, and stamped
`legacy: true` because no effort was ever recorded against them. Legacy entries
seed your bests but deliberately do not drive prescriptions:

- They never trigger a deload (one mis-entered old set would fake a plateau).
- They never trigger a load jump — you get `confirm` instead, so the app has a
  real RIR before adding weight.

A wrong old record is not a blocker either: the target comes from recent work,
and the record itself is editable from the card's BESTS panel.

## Visual language

The interface has one job during a session: answer "what do I do right now, and
which way am I pushing". Everything else is one tap away.

**Hierarchy.** Only the exercise being worked on is expanded; the rest collapse
to a single fixed-height line. The instruction is a row of three values at
`t-display` — **load × reps × sets** — and nothing else on the card is that
size. Sets is the same size but dim, because it never moves; the two numbers
that do move carry the colour and the arrow.

```
80  ×   9↑  ×   3
KG      REPS    SETS
```

There is no explanatory sentence under it. The numbers, the `KIND_LABELS` chip
and the track are the instruction. `prescription.reason` is no longer rendered
anywhere — it read like something that could go stale (it could not; it is
recomputed from current history every render) and it was one more thing to read
mid-set. The `+ how to do it` tap now holds the movement cue and the programme's
own RIR and rest. `reason` remains on the prescription object, unused. A short `prescription.note` stays on the face only where a
bare number would be confusing on its own: a back-off, a `confirm`, a first
session, and the rep-progression-only load jump.

Past bests are reference: one number, low contrast, for the
band being trained today. An earlier version showed up to three all-time bests
in gold at the top right, which both caused ragged card heights and argued
against the model — the whole point is to chase last session in this band, not
an all-time PR.

**The rep-range track.** A dot per rep across the target range: filled where the
last session landed, ringed on today's target. Filling the track and watching it
reset on a load step is double progression made visible. A myo track ends in two
small pips — the mini-sets after the activation set.

**The set-shape mark.** Every collapsed row carries a mark in a fixed column: one
dot for a straight set, a dot plus two smaller pips for a myo set. Twelve of the
twenty-nine slots across the five days are myo, two to four on every day, and it
is the distinction that changes what you do at the machine — full rest, or 15
seconds and go again. It is a picture of the set rather than an icon to learn,
and it matches the pips on the track.

Band is deliberately *not* marked. The programme never prescribes heavy work, so
a band label would read MODERATE on almost every row — the noise that the first
redesign removed. The rep range on the track already separates 6-10 work from
12-20 work, and a heavy test keeps its own gold chip because it is rare enough to
be news.

**Arrows.** The arrow sits on whichever quantity should move, driven by
`prescription.direction` (`move`, `tone`, `load`, `reps`) rather than by parsing
any wording, so copy and visuals can change independently. There is no
`headline` field — the UI composes the hero row from the structured values.

| `move` | `tone` | Reads as |
|---|---|---|
| `reps` | push | `80kg × 9↑` — hold the load, chase the rep |
| `load` | new | `82.5↑kg × 6` — new rung, track resets |
| `load` | back-off | `72.5↓kg × 6` — amber, ease off |
| `none` | hold | no arrow — repeat and consolidate |
| `none` | new | no track — find a starting load |

A load step on the rep-progression-only movements resets reps sharply (20 → 12
on a lateral raise). That must read as a promotion, not a failure: empty track
plus copy that says so.

**Colour — one meaning each.**

| Colour | Means |
|---|---|
| accent | act on this today |
| success | done |
| gold | an achievement just happened — never a resting record |
| amber | ease off |
| dim / muted | reference only |

**Type — four steps.** `t-display` 20px for instruction numbers, `t-title` 15px
for the exercise name, `t-body` 13px for reasons and notes, `t-label` / `t-meta`
11px for everything else. The twelve ad-hoc sizes that preceded this (including
four near-identical micro-sizes) are gone.

**Redundancy.** The band label is implied by the rep range — "MODERATE" next to
"6-10" says nothing. A band is surfaced only when it is news: a heavy test, or a
set landing somewhere unexpected.

## Sheets

Every modal is one `Sheet.svelte`: capped at 85vh, with a sticky header carrying
a 44px close button, plus Escape and backdrop-tap. They were 92vh with the only
close button below the fold, which left an 8% strip of backdrop as the sole
escape route — unusable one-handed between sets.

## Variations

`variations.js` suggests one or two alternate stations per movement, offered as
chips in the picker. Nothing is created until you tap one, so the picker holds
what you actually use. Each becomes a custom variant with its own movement key
and therefore its own records — a different cable stack is a different load.
Suggestions are never heavy-eligible: `HEAVY_ELIGIBLE` lists specific stable
setups, and a substitution made because the gym was busy is not where you test a
near-maximal single.
