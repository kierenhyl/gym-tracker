// Checks the pure sync helpers in src/lib/sync.js: the equality used to
// recognise our own saves after a lost reply, and the rule that decides
// whether a local copy of unsaved changes is offered back on load.
import assert from 'node:assert/strict';
import { deepEqual, canonicalJSON, fingerprint, shouldOfferRestore } from '../src/lib/sync.js';

// --- deepEqual ---

// Postgres jsonb returns keys in its own order.
assert.ok(deepEqual({ a: 1, b: { c: [1, 2], d: 'x' } }, { b: { d: 'x', c: [1, 2] }, a: 1 }));
assert.ok(deepEqual(80, 80.0));
assert.ok(deepEqual([], []));
assert.ok(deepEqual(null, null));
// JSON drops undefined keys, so they must not count.
assert.ok(deepEqual({ a: 1, b: undefined }, { a: 1 }));
assert.ok(!deepEqual([1, 2], [2, 1]), 'array order matters');
assert.ok(!deepEqual({ a: 1 }, { a: 1, b: 2 }));
assert.ok(!deepEqual({ a: null }, { a: 0 }));
assert.ok(!deepEqual([1], { 0: 1 }));
assert.ok(!deepEqual({ log: [{ w: 80, r: 6 }] }, { log: [{ w: 80, r: 5 }] }));

// A round trip through JSON with reordered keys is still equal.
const state = {
	programVersion: 2,
	currentDayIndex: 3,
	workoutLog: [{ date: '2026-11-10T08:00:00.000Z', weight: 80, reps: 25, band: 'moderate' }],
	activeSession: null
};
const reordered = JSON.parse(canonicalJSON(state));
assert.ok(deepEqual(state, reordered));
assert.equal(fingerprint(state), fingerprint(reordered));
assert.notEqual(
	fingerprint(state),
	fingerprint({ ...state, currentDayIndex: 4 }),
	'different data, different fingerprint'
);

// --- shouldOfferRestore ---

const cloudAt = (version, updatedAt, data) => ({ version, updatedAt, data });
const mirrorOf = (data, baseVersion, changedAt, sent = []) => ({ data, baseVersion, changedAt, sent });
const older = { ...state, currentDayIndex: 2 };

// No copy, or a broken one.
assert.equal(shouldOfferRestore(null, cloudAt(5, '2026-11-10T08:00:00Z', state)), 'discard');
assert.equal(shouldOfferRestore({}, cloudAt(5, '2026-11-10T08:00:00Z', state)), 'discard');

// Lost reply: the save landed, the copy was never cleared. Same data.
assert.equal(
	shouldOfferRestore(mirrorOf(state, 4, '2026-11-10T08:00:00Z'), cloudAt(5, '2026-11-10T08:00:01Z', state)),
	'discard'
);

// Killed before saving: the cloud has not moved since the edits began.
assert.equal(
	shouldOfferRestore(mirrorOf(state, 5, '2026-11-10T07:00:00Z'), cloudAt(5, '2026-11-10T08:00:00Z', older)),
	'restore'
);

// Lost reply, then more changes, then killed: the cloud holds a save of ours.
assert.equal(
	shouldOfferRestore(
		mirrorOf(state, 4, '2026-11-10T07:00:00Z', [fingerprint(older)]),
		cloudAt(5, '2026-11-10T08:00:00Z', older)
	),
	'restore'
);

// The cloud moved on, but the local change is later.
assert.equal(
	shouldOfferRestore(mirrorOf(state, 4, '2026-11-10T09:00:00Z'), cloudAt(6, '2026-11-10T08:00:00Z', older)),
	'restore'
);

// The cloud moved on after the local change (saved from somewhere else).
assert.equal(
	shouldOfferRestore(mirrorOf(state, 4, '2026-11-10T07:00:00Z'), cloudAt(6, '2026-11-10T08:00:00Z', older)),
	'discard'
);

console.log('sync helpers OK');
