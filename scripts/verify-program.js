import assert from 'node:assert/strict';
import { program, movementForId } from '../src/lib/program.js';

const expected = [
	['Chest & Width', [
		['Smith Machine Bench Press', 3, '6-10', 'straight'],
		['Cable Lateral Raise', 3, '12-20', 'myorep'],
		['Overhead Cable Triceps Extension', 2, '10-15', 'myorep'],
		['Hack Squat', 1, '6-10', 'straight'],
		['Cable Crunch', 2, '10-15', 'straight']
	]],
	['Back Thickness', [
		['Chest-Supported Row', 4, '8-12', 'straight'],
		['Neutral-Grip Lat Pulldown', 3, '8-12', 'straight'],
		['Reverse Pec Deck', 3, '12-20', 'myorep'],
		['Bayesian Cable Curl', 3, '10-15', 'myorep'],
		['Seated Hamstring Curl', 1, '8-15', 'straight']
	]],
	['Shoulders & Upper Chest', [
		['Machine Shoulder Press', 2, '6-10', 'straight'],
		['Machine Incline Press', 3, '8-12', 'straight'],
		['Cable Lateral Raise', 3, '12-20', 'myorep'],
		['Rope Triceps Pushdown', 2, '10-15', 'myorep'],
		['Machine Hip Thrust', 1, '8-12', 'straight'],
		['Pallof Press', 2, '10-15 each side', 'straight']
	]],
	['Back & Arms', [
		['Half-Kneeling 1-Arm Lat Pulldown', 3, '8-12 each side', 'straight'],
		['Machine Row', 3, '10-15', 'straight'],
		['Reverse Cable Crossover', 3, '12-20', 'myorep'],
		['Incline Dumbbell Curl', 3, '10-15', 'myorep'],
		['Overhead Dumbbell Triceps Extension', 2, '10-15', 'myorep'],
		['Leg Extension', 1, '10-15', 'straight']
	]],
	['Upper Hypertrophy', [
		['Incline Dumbbell Press', 3, '10-15', 'straight'],
		['Cable Lateral Raise', 4, '12-20', 'myorep'],
		['Pec Deck', 2, '12-20', 'myorep'],
		['Hammer Curl', 2, '10-15', 'myorep'],
		['Rope Triceps Pushdown', 2, '10-15', 'myorep'],
		['Standing Calf Raise', 1, '8-15', 'straight'],
		['Ab Crunch Machine', 2, '10-15', 'straight']
	]]
];

assert.equal(program.length, 5);
for (const [index, day] of program.entries()) {
	assert.equal(day.day, index + 1);
	assert.equal(day.name, expected[index][0]);
	assert.deepEqual(
		day.exercises.map(({ name, sets, repRange, method }) => [name, sets, repRange, method]),
		expected[index][1]
	);
	assert.equal(day.exercises.filter((exercise) => exercise.type === 'leg').length, 1);
	assert.equal(day.exercises.find((exercise) => exercise.type === 'leg').sets, 1);
	assert.ok(day.exercises.every((exercise) => (exercise.alternatives?.length ?? 0) === 0));
}

assert.equal(movementForId('bb-row'), 'barbell-row');
assert.equal(movementForId('rdl'), 'rdl');
assert.equal(movementForId('leg-press-d3'), 'leg-press');
assert.equal(movementForId('hammer-curl-combo'), 'hammer-curl-combo');
assert.equal(movementForId('db-incline-press-vol'), 'incline-db-press');

console.log('Programme verification passed.');
