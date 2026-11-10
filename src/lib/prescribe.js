// The coaching layer: turns your history into one instruction for today.
//
// Double progression, set by set. A fixed number of sets, each with a rep
// range, each stopping 1-2 reps short of failure. Hold the weight and add a
// rep to any set below the top. Once every set reaches the top, do it once
// more to confirm it, then go up a weight. See docs/training-model.md.
//
// Only sessions logged under this model (`perSet: true`, see sessions.js)
// drive the target. Older sessions went to failure: they show as a reference
// and today becomes a baseline.

import { BANDS, sessionScore, bandLabel } from './bands.js';
import { formatSession } from './sessions.js';

export const TOP_SESSIONS = 2; // sessions in a row at the top of the range before adding weight
export const STALL_SESSIONS = 3; // no gain at one weight over this many -> deload
export const DELOAD_PCT = 0.9;
export const REDUCE_PCT = 0.9;

export function roundLoad(kg) {
	return Math.round(kg * 2) / 2;
}

// Sessions in one band, any model, oldest first.
export function sessionsInBand(sessions, band) {
	return sessions.filter((s) => s.band === band);
}

// Sessions logged under the per-set model, in one band, oldest first.
export function perSetSessions(sessions, band) {
	return sessions.filter((s) => s.perSet && s.band === band);
}

const sum = (xs) => xs.reduce((a, b) => a + b, 0);

// Every programmed set at or above the top of the range.
export function atTop(session, hi, sets) {
	const reps = session?.reps ?? [];
	return reps.length >= sets && reps.slice(0, sets).every((r) => r >= hi);
}

// Under the range: the average reps per set is below the bottom. One tired
// last set does not count as a miss on its own.
export function underRange(session, lo) {
	const reps = session?.reps ?? [];
	return reps.length > 0 && sum(reps) / reps.length < lo;
}

// How many sessions in a row, ending with the last, hit the top at its weight.
function topStreak(inBand, hi, sets) {
	const last = inBand.at(-1);
	let streak = 0;
	for (let i = inBand.length - 1; i >= 0; i--) {
		const s = inBand[i];
		if (s.weight !== last.weight || !atTop(s, hi, sets)) break;
		streak++;
	}
	return streak;
}

// No gain across the most recent STALL_SESSIONS sessions at the same weight.
// A new weight resets the count: reps are expected to drop after a jump.
export function isStalled(sessions) {
	if (sessions.length < STALL_SESSIONS) return false;
	const recent = sessions.slice(-STALL_SESSIONS);
	if (recent.some((s) => s.weight !== recent[0].weight)) return false;
	return recent.slice(1).every((s) => s.total <= recent[0].total);
}

const fill = (n, value) => Array.from({ length: n }, () => value);
const firstSets = (reps, n, lo) => Array.from({ length: n }, (_, i) => reps?.[i] ?? lo);

// --- Direction ---
//
// Which quantity should move today, and in what spirit. The UI renders the
// arrow and the set bars from these fields rather than from any wording.
//
//   move  'reps' | 'load' | 'none'  — which number carries the arrow
//   tone  'push' | 'hold' | 'back-off' | 'new'
const KIND_DIRECTION = {
	establish: { move: 'none', tone: 'new' },
	calibrate: { move: 'none', tone: 'new' },
	'add-reps': { move: 'reps', tone: 'push' },
	confirm: { move: 'none', tone: 'hold' },
	'add-load': { move: 'load', tone: 'new' },
	'reduce-load': { move: 'load', tone: 'back-off' },
	deload: { move: 'load', tone: 'back-off' },
	repeat: { move: 'none', tone: 'hold' },
	match: { move: 'none', tone: 'hold' }
};

export const KIND_LABELS = {
	establish: 'SET A BASELINE',
	calibrate: 'CALIBRATE',
	'add-reps': 'ADD REPS',
	confirm: 'ONCE MORE',
	'add-load': 'ADD WEIGHT',
	'reduce-load': 'DROP THE WEIGHT',
	deload: 'DELOAD',
	repeat: 'REPEAT IT',
	match: 'MATCH IT'
};

// sessions:  every session for THIS variant (movement), any band, oldest first
// band:      the band picked on the card; the exercise's default otherwise
// reference: optional { name, weight, text } from a sibling station, shown
//            when you have no history on the one you picked today
export function prescribe({ exercise, sessions = [], band, readiness = 'normal', reference = null }) {
	const b = exercise.bands?.includes(band) ? band : exercise.defaultBand;
	const [lo, hi] = exercise.ranges?.[b] ?? BANDS[b].perSet;
	const n = exercise.sets ?? 3;
	const inBand = perSetSessions(sessions, b);
	const last = inBand.at(-1) ?? null;
	// With no per-set session yet, the last old-model session is a reference:
	// this band's if there is one, else any band's (old heavy-day work mostly
	// sits in Normal, and a reference beats starting blind).
	const old = last ? null : (sessionsInBand(sessions, b).at(-1) ?? sessions.at(-1) ?? null);
	const base = { band: b, lo, hi, sets: n, last, old, reference };

	let kind;
	let targetLoad = null;
	let targetReps = null;
	let note = null;
	let loadUp = false;

	if (!last) {
		kind = reference && !old ? 'calibrate' : 'establish';
		note = old
			? 'baseline: the old numbers went to failure; stop 1-2 short today'
			: reference
				? `start near ${reference.weight}kg (${reference.name})`
				: 'pick a weight you can control';
	} else if (atTop(last, hi, n)) {
		targetLoad = last.weight;
		if (topStreak(inBand, hi, n) >= TOP_SESSIONS) {
			// The app cannot know the next weight on this machine, so it asks
			// for "more than last time" and you type what you actually used.
			kind = 'add-load';
			loadUp = true;
			targetReps = fill(n, lo);
			note = `next weight up from ${last.weight}kg`;
		} else {
			kind = 'confirm';
			targetReps = fill(n, hi);
			note = 'top of the range: hit it once more, then add weight';
		}
	} else if (isStalled(inBand)) {
		kind = 'deload';
		targetLoad = roundLoad(last.weight * DELOAD_PCT);
		targetReps = fill(n, lo);
		note = `${STALL_SESSIONS} sessions with no gain at ${last.weight}kg`;
	} else if (underRange(last, lo)) {
		const prev = inBand.at(-2);
		targetReps = fill(n, lo);
		if (prev && prev.weight === last.weight && underRange(prev, lo)) {
			kind = 'reduce-load';
			targetLoad = roundLoad(last.weight * REDUCE_PCT);
			note = `under ${lo} twice at ${last.weight}kg`;
		} else {
			// Normal straight after a weight jump.
			kind = 'repeat';
			targetLoad = last.weight;
			note = `under ${lo} last time`;
		}
	} else {
		kind = 'add-reps';
		targetLoad = last.weight;
		targetReps = Array.from({ length: n }, (_, i) => {
			const r = last.reps[i];
			if (r == null) return lo;
			return r >= hi ? hi : r + 1;
		});
	}

	// A rough day never chases a gain. Readiness never blocks a deload.
	if (readiness === 'low' && ['add-load', 'add-reps', 'confirm'].includes(kind)) {
		kind = 'match';
		targetLoad = last.weight;
		loadUp = false;
		targetReps = firstSets(last.reps, n, lo);
		note = 'rough day: match it, do not chase it';
	}

	const { move, tone } = KIND_DIRECTION[kind];
	return {
		...base,
		kind,
		targetLoad,
		loadUp,
		targetReps,
		note,
		// The set bars fill to where each set landed last time and ring today's
		// target. A weight step empties them: the new rung starts from nothing.
		direction: {
			move,
			tone,
			bars: { from: move === 'load' ? null : (last?.reps ?? null), to: targetReps, lo, hi }
		}
	};
}

// Today's reps as one label: `7` when every set aims the same, `7, 7, 6`
// when they differ, the range when there is no target yet.
export function repsLabel(rx) {
	if (!rx) return '';
	const t = rx.targetReps;
	if (!t?.length) return `${rx.lo}-${rx.hi}`;
	return t.every((r) => r === t[0]) ? String(t[0]) : t.join(', ');
}

// The "last:" line under the target. An old total-rep session reads
// `last: 80 × 25 total`; old set-by-set rows are marked (old).
export function lastLine(rx) {
	if (rx?.last) return `last: ${formatSession(rx.last)}`;
	if (rx?.old) {
		const band = rx.old.band !== rx.band ? ` ${bandLabel(rx.old.band).toLowerCase()}` : '';
		return `last${band}: ${formatSession(rx.old)}${rx.old.reps?.length ? ' (old)' : ''}`;
	}
	return null;
}

// What the sets just typed on the log sheet mean for next time, worked out by
// the same rules that set today's target. `reps` are the sets at `weight`.
export function preview({ exercise, sessions, band, weight, reps }) {
	const w = Number(weight);
	const done = (reps ?? []).map(Number).filter((r) => r > 0);
	if (!(w > 0) || done.length === 0) return null;
	const total = sum(done);
	const next = prescribe({
		exercise,
		sessions: [
			...sessions,
			{ date: new Date().toISOString(), weight: w, reps: done, total, band, perSet: true, score: sessionScore(w, total) }
		],
		band
	});
	switch (next.kind) {
		case 'add-reps':
			return { tone: 'push', text: `next time ${w} × ${repsLabel(next)}` };
		case 'confirm':
			return { tone: 'hold', text: 'top of the range: hit it once more next time' };
		case 'add-load':
			return { tone: 'new', text: `top of the range ${TOP_SESSIONS} sessions running: go up a weight next time` };
		case 'repeat':
			return { tone: 'hold', text: `under ${next.lo}: same weight next time` };
		case 'reduce-load':
			return { tone: 'back-off', text: `under ${next.lo} twice: drop the weight next time` };
		case 'deload':
			return { tone: 'back-off', text: `no gain in ${STALL_SESSIONS} sessions: deload next time` };
		default:
			return null;
	}
}
