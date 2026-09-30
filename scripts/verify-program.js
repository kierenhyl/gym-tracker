import assert from 'node:assert/strict';
import { program, movementForId } from '../src/lib/program.js';
import { withTrainingModel } from '../src/lib/training.js';
import { MAX_SETS } from '../src/lib/bands.js';
import { prescribe, preview } from '../src/lib/prescribe.js';
import { toSessions } from '../src/lib/sessions.js';

const expected = [
	['Chest & Width', [
		['Smith Machine Bench Press', 3, '6-10'],
		['Cable Lateral Raise', 3, '12-20'],
		['Overhead Cable Triceps Extension', 2, '10-15'],
		['Hack Squat', 3, '6-10'],
		['Cable Crunch', 2, '10-15']
	]],
	['Back Thickness', [
		['Chest-Supported Row', 4, '8-12'],
		['Neutral-Grip Lat Pulldown', 3, '8-12'],
		['Reverse Pec Deck', 3, '12-20'],
		['Bayesian Cable Curl', 3, '10-15'],
		['Seated Hamstring Curl', 3, '8-15']
	]],
	['Shoulders & Upper Chest', [
		['Machine Shoulder Press', 2, '6-10'],
		['Machine Incline Press', 3, '8-12'],
		['Cable Lateral Raise', 3, '12-20'],
		['Rope Triceps Pushdown', 2, '10-15'],
		['Machine Hip Thrust', 3, '8-12'],
		['Pallof Press', 2, '10-15 each side']
	]],
	['Back & Arms', [
		['Half-Kneeling 1-Arm Lat Pulldown', 3, '8-12 each side'],
		['Machine Row', 3, '10-15'],
		['Reverse Cable Crossover', 3, '12-20'],
		['Incline Dumbbell Curl', 3, '10-15'],
		['Overhead Dumbbell Triceps Extension', 2, '10-15'],
		['Leg Extension', 3, '10-15']
	]],
	['Upper Hypertrophy', [
		['Incline Dumbbell Press', 3, '10-15'],
		['Cable Lateral Raise', 4, '12-20'],
		['Pec Deck', 2, '12-20'],
		['Hammer Curl', 2, '10-15'],
		['Rope Triceps Pushdown', 2, '10-15'],
		['Standing Calf Raise', 3, '8-15'],
		['Ab Crunch Machine', 2, '10-15']
	]]
];

assert.equal(program.length, 5);
for (const [index, day] of program.entries()) {
	assert.equal(day.day, index + 1);
	assert.equal(day.name, expected[index][0]);
	assert.deepEqual(
		day.exercises.map(({ name, sets, repRange }) => [name, sets, repRange]),
		expected[index][1]
	);
	// One leg exercise per day is the recovery choice; how many sets it takes
	// to reach the total is not fixed any more.
	assert.equal(day.exercises.filter((exercise) => exercise.type === 'leg').length, 1);
	assert.ok(day.exercises.every((exercise) => (exercise.alternatives?.length ?? 0) === 0));
	assert.ok(day.exercises.every((exercise) => exercise.method === undefined), 'myo-reps are retired');
	// A target must be reachable inside the set cap.
	assert.ok(day.exercises.every((exercise) => exercise.sets <= MAX_SETS));
}

assert.equal(movementForId('bb-row'), 'barbell-row');
assert.equal(movementForId('rdl'), 'rdl');
assert.equal(movementForId('leg-press-d3'), 'leg-press');
assert.equal(movementForId('hammer-curl-combo'), 'hammer-curl-combo');
assert.equal(movementForId('db-incline-press-vol'), 'incline-db-press');

// --- The total-rep model, on the smith bench (3 × 6-10) ---

const bench = withTrainingModel(program[0].exercises[0]);
assert.deepEqual(bench.bands, ['heavy', 'moderate', 'volume']);
assert.equal(bench.defaultBand, 'moderate');
assert.deepEqual(bench.targetTotals, { heavy: [9, 15], moderate: [18, 30], volume: [48, 60] });

// Lateral raise: the programme's 12-20 is kept verbatim for its own band.
const lateral = withTrainingModel(program[0].exercises[1]);
assert.equal(lateral.defaultBand, 'volume');
assert.deepEqual(lateral.targetTotals.volume, [36, 60]);
assert.ok(!lateral.bands.includes('heavy'), 'low-rep band stays limited to stable setups');

const at = (weight, total, band = 'moderate', day = 1) => ({
	date: `2026-09-${String(day).padStart(2, '0')}T08:00:00.000Z`,
	weight,
	total,
	band
});
const rx = (sessions, readiness) => prescribe({ exercise: bench, sessions, band: 'moderate', readiness });

let r = rx([]);
assert.equal(r.kind, 'establish');

r = rx([at(80, 23)]);
assert.equal(r.kind, 'add-reps');
assert.deepEqual([r.targetLoad, r.targetReps], [80, 25]);

r = rx([at(80, 29)]);
assert.equal(r.targetReps, 30, 'the step never overshoots the top of the range');

r = rx([at(80, 31)]);
assert.equal(r.kind, 'add-load');
assert.ok(r.loadUp);
assert.deepEqual([r.targetLoad, r.targetReps], [80, 18]);
assert.equal(r.direction.total.from, null, 'a weight step empties the bar');

r = rx([at(80, 31, 'moderate', 1), at(82.5, 16, 'moderate', 2)]);
assert.equal(r.kind, 'repeat', 'under the range once after a jump: same weight');
assert.deepEqual([r.targetLoad, r.targetReps], [82.5, 18]);

r = rx([at(82.5, 16, 'moderate', 1), at(82.5, 15, 'moderate', 2)]);
assert.equal(r.kind, 'reduce-load');
assert.equal(r.targetLoad, 74.5);

r = rx([at(80, 24, 'moderate', 1), at(80, 24, 'moderate', 2), at(80, 23, 'moderate', 3)]);
assert.equal(r.kind, 'deload');
assert.equal(r.targetLoad, 72);

r = rx([at(80, 23)], 'low');
assert.equal(r.kind, 'match');
assert.deepEqual([r.targetLoad, r.targetReps], [80, 23]);

// Bands keep separate histories.
r = prescribe({ exercise: bench, sessions: [at(80, 23), at(90, 12, 'heavy', 2)], band: 'heavy' });
assert.deepEqual([r.targetLoad, r.targetReps], [90, 13]);

assert.equal(preview({ exercise: bench, sessions: [], band: 'moderate', weight: 80, total: 30 }).tone, 'new');
assert.equal(preview({ exercise: bench, sessions: [], band: 'moderate', weight: 80, total: 25 }).text, 'next time 27');

// --- Converting set-by-set history ---

const configOf = () => ({ bands: bench.bands, defaultBand: bench.defaultBand });
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

let converted = toSessions([row(80, 9), row(80, 8), row(80, 7)], movementOf, configOf);
assert.equal(converted.length, 1);
assert.deepEqual([converted[0].weight, converted[0].total, converted[0].band, converted[0].sets], [80, 24, 'moderate', 3]);

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
assert.deepEqual([converted[0].total, converted[0].converted], [25, false]);

console.log('Programme verification passed.');
