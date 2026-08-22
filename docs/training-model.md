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
| Moderate | 6–12 | The default. Most of your work. |
| Volume | 13+ | Isolation, joint-friendly work, under-recovered days |

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
failure plus mini-sets with 10–20s rest. Progression is on **total effective
reps at a load**; the activation set gates when load goes up.

## Band eligibility is a safety rule

Heavy work is allowed only where the setup is stable and a near-maximal effort
does not depend on stabiliser fatigue or spinal position. See `HEAVY_ELIGIBLE`
in `program.js`.

**Allowed:** smith / barbell / machine chest press, incline smith and machine
incline press, machine and smith shoulder press, hack squat, leg press, smith
squat, pendulum squat, all pulldowns, assisted pull-up, chest-supported row,
machine row.

**Capped at moderate:** barbell row, Pendlay row, T-bar row, seated cable row,
RDL and DB RDL (sub-6 hinging is where backs go), all unilateral leg work, all
dumbbell pressing (stabiliser-limited).

**Volume-primary:** every isolation movement — lateral raises, rear delts,
face pulls, flies, curls, triceps, calves, abs, leg curls and extensions.

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
   over 7 days, against a 10–20 target band.

## Equipment variations

The same movement on a different station is not the same load — cable stacks
are wired differently and machines have different leverage. Rather than fudge
it with calibration offsets, you can add your own variation from inside the app
("Cable machine by the pilates room"). It gets its own movement key and its own
records, so numbers stay apples-to-apples. When you have no history on the
variant you picked, the app shows a sibling's best as a **reference**, not a
target, and treats the session as calibration.

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
