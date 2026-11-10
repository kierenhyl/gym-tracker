import assert from 'node:assert/strict';
import { program, movementForId, movementName, exerciseIndex, slotVariants } from '../src/lib/program.js';
import {
	withTrainingModel,
	bandConfigFor,
	HEAVY_ELIGIBLE,
	indirectMusclesFor,
	INDIRECT_WEIGHT
} from '../src/lib/training.js';
import { prescribe, preview, repsLabel, lastLine } from '../src/lib/prescribe.js';
import { toSessions } from '../src/lib/sessions.js';

// [name, sets, range, heavy, built-in alternatives]
const expected = [
	['Push Heavy', [
		['Smith Machine Bench Press', 3, '4-6', true, ['Machine Chest Press']],
		['Hack Squat', 3, '5-8', true, ['Leg Press']],
		['Cable Lateral Raise', 3, '12-20', false, ['Machine Lateral Raise']],
		['Overhead Cable Triceps Extension', 3, '10-15', false, ['Overhead Dumbbell Triceps Extension']],
		['Cable Crunch', 2, '10-15', false, []]
	]],
	['Pull Heavy', [
		['Chest-Supported Row', 3, '5-8', true, ['Machine Row']],
		['Neutral-Grip Lat Pulldown', 3, '6-10', true, ['Wide-Grip Lat Pulldown']],
		['Seated Hamstring Curl', 3, '8-12', false, ['Lying Leg Curl']],
		['Reverse Pec Deck', 3, '12-20', false, ['Reverse Cable Crossover']],
		['Bayesian Cable Curl', 3, '10-15', false, ['Cable Curl']]
	]],
	['Shoulders & Legs', [
		['Machine Shoulder Press', 3, '5-8', true, ['Smith Shoulder Press']],
		['Leg Press', 3, '5-8', true, ['Belt Squat', 'Machine Hip Thrust']],
		['Machine Incline Press', 3, '8-12', false, ['Incline Dumbbell Press']],
		['Cable Lateral Raise', 3, '12-20', false, []],
		['Rope Triceps Pushdown', 2, '10-15', false, []],
		['Cable Crunch', 2, '10-15', false, []]
	]],
	['Pull Light & Legs', [
		['Neutral-Grip Lat Pulldown', 3, '10-15', false, []],
		['Machine Row', 3, '10-15', false, ['Seated Cable Row']],
		['Leg Extension', 3, '10-15', false, []],
		['Seated Hamstring Curl', 3, '10-15', false, []],
		['Incline Dumbbell Curl', 3, '10-15', false, ['Preacher Curl']],
		['Reverse Cable Crossover', 2, '12-20', false, []]
	]],
	['Push Light', [
		['Smith Machine Bench Press', 3, '8-12', false, []],
		['Hack Squat', 2, '10-15', false, []],
		['Pec Deck', 2, '12-20', false, ['Cable Fly']],
		['Cable Lateral Raise', 3, '12-20', false, []],
		['Overhead Cable Triceps Extension', 2, '10-15', false, []],
		['Standing Calf Raise', 3, '8-15', false, ['Leg Press Calf Raise']],
		['Ab Crunch Machine', 2, '10-15', false, []]
	]]
];

// Five days, so any stored currentDayIndex (0-4) still points at a day.
assert.equal(program.length, 5);

const MAX_DIRECT_SETS_PER_SESSION = 11;

for (const [index, day] of program.entries()) {
	assert.equal(day.day, index + 1);
	assert.equal(day.name, expected[index][0]);
	assert.deepEqual(
		day.exercises.map((e) => [
			e.name,
			e.sets,
			e.repRange,
			e.heavy === true,
			(e.alternatives ?? []).map((a) => a.name)
		]),
		expected[index][1],
		day.name
	);

	// Heavy days (1-3) have exactly two heavy slots, done first; the light
	// days (4-5) have none. Every heavy slot is on a stable setup and trained
	// in the Low band, alternatives included.
	const heavy = day.exercises.filter((e) => e.heavy);
	const heavyDay = index < 3;
	assert.equal(heavy.length, heavyDay ? 2 : 0, `${day.name}: ${heavyDay ? 'two' : 'no'} heavy slots`);
	if (heavyDay) {
		assert.ok(day.exercises[0].heavy && day.exercises[1].heavy, `${day.name}: heavy lifts first`);
	}
	for (const slot of heavy) {
		for (const v of slotVariants(slot)) {
			assert.ok(HEAVY_ELIGIBLE.has(v.movement), `${v.name} is heavy-eligible`);
			assert.equal(withTrainingModel(v).defaultBand, 'heavy', `${v.name} defaults to Low`);
		}
	}

	// No muscle gets more than ~11 direct sets in one session: past that,
	// extra sets in a session add little.
	const perMuscle = {};
	for (const e of day.exercises) perMuscle[e.muscle] = (perMuscle[e.muscle] ?? 0) + e.sets;
	for (const [muscle, sets] of Object.entries(perMuscle)) {
		assert.ok(sets <= MAX_DIRECT_SETS_PER_SESSION, `${day.name}: ${muscle} has ${sets} direct sets`);
	}

	assert.ok(day.exercises.every((e) => e.method === undefined), 'myo-reps are retired');
	assert.ok(
		day.exercises.every((e) => /^Stop /.test(e.effort)),
		'every set stops short of failure'
	);
}

// Weekly direct sets, as planned.
const weekly = {};
for (const day of program) for (const e of day.exercises) weekly[e.muscle] = (weekly[e.muscle] ?? 0) + e.sets;
assert.deepEqual(weekly, {
	Chest: 11,
	Back: 12,
	Quads: 11,
	'Side Delts': 9,
	Triceps: 7,
	Biceps: 6,
	Hamstrings: 6,
	'Rear Delts': 5,
	Abs: 6,
	Calves: 3,
	'Front Delts': 3
});
assert.equal(Object.values(weekly).reduce((a, b) => a + b, 0), 79);

// Indirect work counts half: pressing for triceps and front delts, pulling for
// biceps and rear delts, squats for glutes.
assert.deepEqual(indirectMusclesFor('smith-bench-press', 'Chest'), ['Triceps', 'Front Delts']);
assert.deepEqual(indirectMusclesFor('machine-shoulder-press', 'Front Delts'), ['Triceps']);
assert.deepEqual(indirectMusclesFor('neutral-pulldown', 'Back'), ['Biceps', 'Rear Delts']);
assert.deepEqual(indirectMusclesFor('leg-press', 'Quads'), ['Glutes']);
assert.deepEqual(indirectMusclesFor('cable-lateral-raise', 'Side Delts'), []);
assert.equal(INDIRECT_WEIGHT, 0.5);

// Every id is unique, so each built-in alternative is its own variant.
const ids = program.flatMap((d) => d.exercises.flatMap((e) => [e.id, ...(e.alternatives ?? []).map((a) => a.id)]));
assert.equal(new Set(ids).size, ids.length, 'ids are unique');
assert.equal(Object.keys(exerciseIndex).length, ids.length);
// An alternative trains like its slot.
assert.deepEqual(
	[exerciseIndex['leg-press-d1'].sets, exerciseIndex['leg-press-d1'].repRange, exerciseIndex['leg-press-d1'].band],
	[3, '5-8', 'heavy']
);
assert.equal(exerciseIndex['machine-hip-thrust'].muscle, 'Glutes');

// Old ids still resolve, so stored history keeps its grouping and names.
assert.equal(movementForId('bb-row'), 'barbell-row');
assert.equal(movementForId('leg-press-d3'), 'leg-press');
assert.equal(movementForId('db-incline-press-vol'), 'incline-db-press');
assert.equal(movementForId('overhead-db-tri'), 'overhead-db-triceps');
assert.equal(movementForId('incline-db-press-d5'), 'incline-db-press');
assert.equal(movementForId('triceps-pushdown-d5'), 'triceps-pushdown');
assert.equal(movementForId('pallof-press'), 'pallof-press');
assert.equal(movementName('pallof-press'), 'Pallof Press');
assert.equal(movementName('hammer-curl'), 'Hammer Curl');
assert.equal(movementName('half-kneel-pulldown'), 'Half-Kneeling 1-Arm Lat Pulldown');

// --- Bands ---

const bench = withTrainingModel(program[0].exercises[0]); // heavy, 3 × 4-6
assert.deepEqual(bench.bands, ['heavy', 'moderate', 'volume']);
assert.equal(bench.defaultBand, 'heavy');
assert.deepEqual(bench.ranges.heavy, [4, 6]);
assert.deepEqual(bench.ranges.moderate, [8, 12]);

const benchLight = withTrainingModel(program[4].exercises[0]); // light, 3 × 8-12
assert.equal(benchLight.movement, bench.movement, 'heavy and light share the movement key');
assert.equal(benchLight.defaultBand, 'moderate', '...in different bands');

// Hack squat 5-8 would read as Normal from its range; the slot says Low.
assert.equal(withTrainingModel(program[0].exercises[1]).defaultBand, 'heavy');

const lateral = withTrainingModel(program[0].exercises[2]);
assert.equal(lateral.defaultBand, 'volume');
assert.deepEqual(lateral.ranges.volume, [12, 20]);
assert.ok(!lateral.bands.includes('heavy'), 'low-rep band stays limited to stable setups');

// A custom variant on a heavy slot is never Low-eligible.
const custom = bandConfigFor('custom-cable-press', '4-6', 3, 'heavy');
assert.ok(!custom.bands.includes('heavy'));
assert.equal(custom.defaultBand, 'moderate');
assert.deepEqual(custom.ranges.moderate, [8, 12], 'falls back to the Normal default range');

// --- Progression, set by set, on the heavy smith bench (3 × 4-6) ---

const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const day = (n) => `2026-11-${String(n).padStart(2, '0')}T08:00:00.000Z`;
const ps = (weight, reps, n = 1, band = 'heavy') => ({
	date: day(n),
	weight,
	reps,
	total: sum(reps),
	band,
	perSet: true
});
const rx = (sessions, readiness) => prescribe({ exercise: bench, sessions, band: 'heavy', readiness });

let r = rx([]);
assert.equal(r.kind, 'establish');
assert.equal(repsLabel(r), '4-6');

// Old total-rep history: shown as a reference, today is a baseline.
r = rx([{ date: day(1), weight: 80, total: 25, band: 'heavy', perSet: false, reps: null }]);
assert.equal(r.kind, 'establish');
assert.equal(lastLine(r), 'last: 80 × 25 total');
assert.equal(r.targetLoad, null);

// Old set-by-set history went to failure too: reference only.
r = rx([{ date: day(1), weight: 80, total: 15, band: 'heavy', perSet: false, reps: [5, 5, 5] }]);
assert.equal(r.kind, 'establish');
assert.equal(lastLine(r), 'last: 80 × 5, 5, 5 (old)');

// Inside the range: same weight, +1 on any set below the top.
r = rx([ps(80, [6, 5, 4])]);
assert.equal(r.kind, 'add-reps');
assert.deepEqual([r.targetLoad, r.targetReps], [80, [6, 6, 5]]);
assert.equal(lastLine(r), 'last: 80 × 6, 5, 4');
assert.equal(repsLabel(r), '6, 6, 5');

// A set not logged last time aims for the bottom.
r = rx([ps(80, [6, 5])]);
assert.deepEqual(r.targetReps, [6, 6, 4]);

// One short set is not "under the range": the average decides.
r = rx([ps(80, [5, 4, 3])]);
assert.equal(r.kind, 'add-reps');
assert.deepEqual(r.targetReps, [6, 5, 4]);

// Every set at the top once: hold the weight and do it again.
r = rx([ps(80, [6, 6, 6])]);
assert.equal(r.kind, 'confirm');
assert.ok(!r.loadUp);
assert.deepEqual([r.targetLoad, r.targetReps], [80, [6, 6, 6]]);
assert.equal(repsLabel(r), '6');

// At the top twice in a row: go up a weight. The weight is typed, never assumed.
r = rx([ps(80, [6, 6, 6], 1), ps(80, [6, 7, 6], 2)]);
assert.equal(r.kind, 'add-load');
assert.ok(r.loadUp);
assert.deepEqual([r.targetLoad, r.targetReps], [80, [4, 4, 4]]);
assert.equal(r.direction.bars.from, null, 'a weight step empties the bars');

// The streak counts at one weight only.
r = rx([ps(77.5, [6, 6, 6], 1), ps(80, [6, 6, 6], 2)]);
assert.equal(r.kind, 'confirm');

// Under the range once (straight after a jump): same weight, aim for the bottom.
r = rx([ps(80, [6, 6, 6], 1), ps(80, [6, 6, 6], 2), ps(82.5, [4, 3, 3], 3)]);
assert.equal(r.kind, 'repeat');
assert.deepEqual([r.targetLoad, r.targetReps], [82.5, [4, 4, 4]]);

// Under the range twice at that weight: drop about 10%.
r = rx([ps(82.5, [3, 3, 3], 1), ps(82.5, [4, 3, 3], 2)]);
assert.equal(r.kind, 'reduce-load');
assert.equal(r.targetLoad, 74.5);

// No gain in 3 sessions at one weight: deload about 10%.
r = rx([ps(80, [5, 5, 4], 1), ps(80, [5, 5, 4], 2), ps(80, [5, 4, 4], 3)]);
assert.equal(r.kind, 'deload');
assert.equal(r.targetLoad, 72);

// Rough day: match the last session instead of adding weight or reps.
r = rx([ps(80, [6, 5, 4])], 'low');
assert.equal(r.kind, 'match');
assert.deepEqual([r.targetLoad, r.targetReps], [80, [6, 5, 4]]);
r = rx([ps(80, [6, 6, 6], 1), ps(80, [6, 6, 6], 2)], 'low');
assert.equal(r.kind, 'match', 'a rough day does not add weight');
assert.ok(!r.loadUp);

// Heavy and light days keep separate histories: a light session is only a
// labelled reference for the heavy slot, never its target.
r = rx([ps(60, [12, 12, 12], 1, 'moderate')]);
assert.equal(r.kind, 'establish');
assert.equal(r.targetLoad, null);
r = rx([{ date: day(1), weight: 100, total: 17, band: 'moderate', perSet: false, reps: [9, 8] }]);
assert.equal(lastLine(r), 'last normal: 100 × 9, 8 (old)', 'old work in another band is still shown');
r = prescribe({ exercise: benchLight, sessions: [ps(80, [6, 5, 4], 1), ps(60, [10, 9, 9], 2, 'moderate')], band: 'moderate' });
assert.deepEqual([r.targetLoad, r.targetReps], [60, [11, 10, 10]]);

// The log sheet previews next time by the same rules.
assert.equal(preview({ exercise: bench, sessions: [], band: 'heavy', weight: 80, reps: [6, 5, 4] }).text, 'next time 80 × 6, 6, 5');
assert.equal(preview({ exercise: bench, sessions: [], band: 'heavy', weight: 80, reps: [6, 6, 6] }).tone, 'hold');
assert.equal(
	preview({ exercise: bench, sessions: [ps(80, [6, 6, 6])], band: 'heavy', weight: 80, reps: [6, 6, 6] }).tone,
	'new'
);

// --- Reading the log ---

const configOf = () => ({ bands: benchLight.bands, defaultBand: benchLight.defaultBand });
const movementOf = (e) => e.movement;
const row = (weight, reps, extra = {}) => ({
	date: '2026-08-01T08:00:00.000Z',
	movement: 'smith-bench-press',
	exerciseId: 'smith-bench',
	setGroupId: 'g1',
	weight,
	reps,
	...extra
});

// The current model: a row per set, band declared, reps in set order.
let converted = toSessions(
	[
		row(80, 5, { format: 'set', band: 'heavy', setIndex: 1 }),
		row(80, 6, { format: 'set', band: 'heavy', setIndex: 0 }),
		row(80, 4, { format: 'set', band: 'heavy', setIndex: 2 })
	],
	movementOf,
	configOf
);
assert.equal(converted.length, 1);
assert.deepEqual(
	[converted[0].perSet, converted[0].band, converted[0].reps, converted[0].total, converted[0].score],
	[true, 'heavy', [6, 5, 4], 15, 1200]
);

// Old set-by-set rows: a session, but not a per-set one.
converted = toSessions([row(80, 9), row(80, 8), row(80, 7)], movementOf, configOf);
assert.deepEqual(
	[converted[0].weight, converted[0].total, converted[0].band, converted[0].sets, converted[0].perSet],
	[80, 24, 'moderate', 3, false]
);

converted = toSessions([row(80, 9), row(80, 8), row(75, 10)], movementOf, configOf);
assert.deepEqual([converted[0].weight, converted[0].total], [80, 17], 'a lighter back-off set does not count');

converted = toSessions([row(100, 4), row(100, 4), row(100, 3)], movementOf, configOf);
assert.equal(converted[0].band, 'heavy');

converted = toSessions([row(12.5, 14, { structure: 'myorep', totalReps: 30 })], movementOf, configOf);
assert.deepEqual([converted[0].total, converted[0].band], [30, 'moderate'], 'myo-reps keep their total');

// Rows with no group id, from before grouping, are one session per day.
converted = toSessions(
	[row(80, 8, { setGroupId: undefined }), row(80, 8, { setGroupId: undefined })],
	movementOf,
	configOf
);
assert.deepEqual([converted.length, converted[0].total], [1, 16]);

converted = toSessions(
	[{ format: 'total', date: '2026-09-01T08:00:00.000Z', movement: 'smith-bench-press', weight: 80, reps: 25, band: 'moderate' }],
	movementOf,
	configOf
);
assert.deepEqual([converted[0].total, converted[0].converted, converted[0].perSet], [25, false, false]);

console.log('Programme verification passed.');
