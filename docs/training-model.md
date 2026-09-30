# Training model

Why the app tracks what it tracks. This is the reasoning behind `bands.js`,
`sessions.js`, `prescribe.js` and `training.js`. Read it before changing any
of the numbers below.

## One number per exercise

Each exercise has one target: a weight and a **total** number of reps, for
example `80kg × 25`. You reach the total in as many sets as you need, up to
five. Every set goes to failure, so the set count follows from fatigue on the
day rather than from a plan.

This replaced a fixed `weight × reps × sets` target (`80 × 9 × 3`), where
progress was judged on the best single set.

### The set cap

The card and the log sheet both say **"No more than 5 sets to reach this"**
(`MAX_SETS` in `bands.js`). Without it, a total can grow by adding sets rather
than strength. At failure, reps drop with every set: `9, 7, 5, 3, 2, 2, 1` is 29,
but sets five to seven add 5 reps of endurance, not strength.

Sets are not logged, so the app cannot check the cap. It is a rule you keep.

## Bands

| Band | Key | Default per-set range | Step per session |
|---|---|---|---|
| Low | `heavy` | 3-5 | +1 |
| Normal | `moderate` | 8-12 | +2 |
| High | `volume` | 16-20 | +3 |

The keys predate the labels and stay as they are, because every stored row
already carries them.

**The band is picked, not worked out.** With three fixed sets, reps per set
told you the band. With a free set count they do not: 25 reps as five sets of
five would read as low-rep work. So the card has a chip per band, and the band
you pick is the band the session is saved under. Unpicked, a card uses the band
its programmed range sits in. The pick lasts for the day.

Each band keeps its own weight and its own history. A chip shows the weight you
last used in that band.

### Total-rep ranges

A band's range is **programme sets × per-set range**. Smith bench is programmed
3 × 6-10, so:

| Band | Range |
|---|---|
| Low | 3 × 3-5 = 9-15 |
| Normal | 3 × 6-10 = 18-30 |
| High | 3 × 16-20 = 48-60 |

The band the programme's own range sits in uses that range as written, not the
band default. Lateral raise is 3 × 12-20, which sits in High, so its High range
is 36-60, not 48-60.

## Progression

Double progression, on the total. Target and history both come from your
**last session in this band on this variant**, never from an all-time best.

| Last session in this band | Today |
|---|---|
| None | Set a baseline: pick a weight, aim for the range |
| At or over the top | **Add weight.** Anything over last time; the total goes back to the bottom |
| Inside the range | Same weight, last total + step, capped at the top |
| Under the bottom, once | Same weight, aim for the bottom. Normal right after a weight jump |
| Under the bottom, twice at that weight | Drop about 10% |
| No gain in 3 sessions at one weight | Deload about 10% |
| Rough day (readiness) | Match last session instead of adding weight or reps |

Worked example, Normal (18-30):

| Session | Target | Did | Next |
|---|---|---|---|
| 1 | 80 × 25 | 26 | 80 × 28 |
| 2 | 80 × 28 | 28 | 80 × 30 |
| 3 | 80 × 30 | 31 | more than 80 × 18 |
| 4 | 82.5 × 18 | 19 | 82.5 × 21 |

`scripts/verify-program.js` checks every row of that table.

### The weight is typed, never assumed

Machines and stacks step differently, so the app never works out the next
weight. After topping the range the card shows `> 80↑` and the log sheet's
weight field starts empty. Whatever you type becomes the new rung. Totals are
only compared at the same weight.

### No effort question

Every set goes to failure, so "how close to failure?" always has the same
answer. The old engine used it to decide when to add weight. Now, reaching the
top of the range is the whole signal.

### The log sheet previews next time

Type a total and the sheet says what it means, using the same rules that set
today's target: `next time 27`, `top of the range: go up a weight next time`,
or `under 18: same weight next time`.

## Records

A best is per movement and band, ranked by **weight × total**. At the same
weight, more reps wins. At the same total, a heavier weight wins.

The best is not on the card. The card is today's job; the best is history.
The two often disagree on purpose: after `80 × 31`, the next target is
`82.5 × 18`, which is progress but below the best. Bests live in the history
sheet and on the Stats tab.

The Stats tab charts **working weight** per movement and band. It rises only
when a range is topped, so it is the cleanest line of progress. The reps inside
a rung show on the "now" line.

## History logged set by set

Nothing stored is rewritten. `sessions.js` reads the log and returns one row
per session, whichever way it was logged:

- **Logged as a total** (`format: 'total'`): one row, used as it is.
- **Logged set by set**: rows sharing a `setGroupId` are one session. Rows from
  before grouping existed are grouped by movement and day.
  - **Total**: the reps of every set at the main weight, added up. `9, 8, 7`
    is 24.
  - **Weight**: the weight most sets used, the heaviest on a tie. A lighter
    back-off set does not count towards the total.
  - **Band**: the average reps per set, snapped to a band the exercise allows.
- **Old myo-rep rows** already carried the whole effort in `totalReps`, so
  that is the total. They go to the exercise's default band, because their
  reps per set say nothing about the band they aimed at.

A backup taken before this change restores cleanly, because the stored shape
of old rows never changed.

## Low-rep eligibility is a safety rule

The Low band is offered only where the setup is stable and a near-maximal
effort does not depend on stabiliser fatigue or spinal position. See
`HEAVY_ELIGIBLE` in `training.js`.

**Allowed (8 of 26):** smith bench press, machine shoulder press, machine
incline press, chest-supported row, machine row, neutral-grip pulldown, hack
squat, machine hip thrust.

**Normal and High only:** everything else — all dumbbell work (stabiliser
limited), all cable isolation, the half-kneeling pulldown (unstable by design),
leg extension and seated hamstring curl (knee and hamstring risk under
near-maximal load), Pallof press (an anti-rotation drill, not a loadable lift).

## Myo-reps are retired

Twelve slots used to be myo-reps: an activation set, then mini-sets with 15
seconds' rest. A total with every set to failure does the same job with one
rule instead of two, so the programme no longer has a `method` field.
`verify-program.js` asserts that. Old myo-rep sessions keep their totals (see
above).

## Legs

The programme still has one leg exercise per day, asserted by
`verify-program.js`. It no longer forces one hard set: leg exercises are
programmed at 3 sets like the other compounds, so their range is 3 × the rep
range, with the same set cap.

History logged under the one-set rule is a single set, so it converts to a
total under the new range (`100 × 9` against 18-30). The first session back
reads as "repeat it" at the bottom of the range. That is expected, once.

The weekly hard-set guardrail on the Stats tab still leaves leg muscles out
(`GUARDRAIL_EXEMPT_MUSCLES`), because one exercise per day is still the
programme's recovery choice.

## Visual language

The interface has one job during a session: answer "what do I do right now,
and which way am I pushing". Everything else is one tap away.

**Hierarchy.** Only the exercise being worked on is expanded; the rest collapse
to a single fixed-height line. Before a session starts, tapping a card opens it
as a preview: the target, the band chips and history all work, but logging and
ticking wait for the session, so a stray tap cannot save anything. The
instruction is two values at `t-display` —
**weight × total** — and nothing else on the card is that size.

```
80   ×   25↑
KG       TOTAL REPS
```

Above it sit the band chips. Below it sit the total bar, a short note only
where a bare number would confuse (a back-off, a baseline, a weight step), and
the highlighted set-cap line.

**The total bar.** From zero to the top of the range, with the range shaded.
It fills to where the last session landed and rings today's target. A weight
step empties it: the new rung starts from nothing, and the ring turns gold
because that is progress, not failure.

**Arrows.** The arrow sits on whichever quantity should move, driven by
`prescription.direction` (`move`, `tone`), not by any wording.

| `move` | `tone` | Reads as |
|---|---|---|
| `reps` | push | `80 × 25↑` — hold the weight, add reps |
| `load` | new | `> 80↑ × 18` — go up a weight, bar resets |
| `load` | back-off | `72↓ × 18` — amber, ease off |
| `none` | hold | no arrow — repeat or match |
| `none` | new | no bar fill — set a baseline |

**Colour — one meaning each.**

| Colour | Means |
|---|---|
| accent | act on this today |
| success | done |
| gold | an achievement or a new rung |
| amber | ease off |
| dim / muted | reference only |

**Type — four steps.** `t-display` 20px for instruction numbers, `t-title` 15px
for the exercise name, `t-body` 13px for notes, `t-label` / `t-meta` 11px for
everything else.

## Sheets

Every modal is one `Sheet.svelte`: capped at 85vh, with a sticky header carrying
a 44px close button, plus Escape and backdrop-tap, so it can be left one-handed
between sets.

## Equipment variations

The same movement on a different station is not the same load. You can add
your own variation from inside the app ("Cable machine by the pilates room").
It gets its own movement key and its own history, so numbers stay
apples-to-apples. With no history on the variant you picked, the app shows a
sibling's last session as a **reference**, not a target.

`variations.js` suggests one or two alternate stations per movement as chips in
the picker. Nothing is created until you tap one. Custom variants are never
Low-band eligible: `HEAVY_ELIGIBLE` lists specific stable setups, and a
substitution made because the gym was busy is not where you test near-maximal
work.

The programme ships no built-in alternatives — `verify-program.js` asserts
there are none.
