// The coaching layer: turns your history into one instruction for today.
//
// Double progression on a total. Hold the weight and add total reps each
// session until you reach the top of the band's range, then go up a weight and
// start again from the bottom. Every set goes to failure, so there is no
// effort question: reaching the top is the whole signal. See
// docs/training-model.md for the reasoning.

import { BANDS, sessionScore } from './bands.js';

export const STALL_SESSIONS = 3; // no gain at one weight over this many -> deload
export const DELOAD_PCT = 0.9;
export const REDUCE_PCT = 0.9;

export function roundLoad(kg) {
	return Math.round(kg * 2) / 2;
}

// Sessions in one band, oldest first.
export function sessionsInBand(sessions, band) {
	return sessions.filter((s) => s.band === band);
}

// No gain across the most recent STALL_SESSIONS sessions at the same weight.
// A new weight resets the count: the total is expected to drop after a jump.
export function isStalled(sessions) {
	if (sessions.length < STALL_SESSIONS) return false;
	const recent = sessions.slice(-STALL_SESSIONS);
	if (recent.some((s) => s.weight !== recent[0].weight)) return false;
	return recent.slice(1).every((s) => s.total <= recent[0].total);
}

// --- Direction ---
//
// Which quantity should move today, and in what spirit. The UI renders the
// arrow and the total bar from these fields rather than from any wording, so
// wording and visuals can change independently.
//
//   move  'reps' | 'load' | 'none'  — which number carries the arrow
//   tone  'push' | 'hold' | 'back-off' | 'new'
const KIND_DIRECTION = {
	establish: { move: 'none', tone: 'new' },
	calibrate: { move: 'none', tone: 'new' },
	'add-reps': { move: 'reps', tone: 'push' },
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
	'add-load': 'ADD WEIGHT',
	'reduce-load': 'DROP THE WEIGHT',
	deload: 'DELOAD',
	repeat: 'REPEAT IT',
	match: 'MATCH IT'
};

// sessions:  every session for THIS variant (movement), any band, oldest first
// band:      the band picked on the card; the exercise's default otherwise
// reference: optional { name, weight, total } from a sibling station, shown
//            when you have no history on the one you picked today
export function prescribe({ exercise, sessions = [], band, readiness = 'normal', reference = null }) {
	const b = exercise.bands?.includes(band) ? band : exercise.defaultBand;
	const [lo, hi] = exercise.targetTotals?.[b] ?? [BANDS[b].perSet[0] * 3, BANDS[b].perSet[1] * 3];
	const step = BANDS[b].step;
	const inBand = sessionsInBand(sessions, b);
	const last = inBand[inBand.length - 1] ?? null;
	const base = { band: b, targetLow: lo, targetHigh: hi, last, reference };

	let kind, targetLoad, targetReps, note, loadUp = false;

	if (!last) {
		kind = reference ? 'calibrate' : 'establish';
		targetLoad = null;
		targetReps = null;
		note = reference
			? `start near ${reference.weight}kg (${reference.name})`
			: 'pick a weight you can control';
	} else if (isStalled(inBand)) {
		kind = 'deload';
		targetLoad = roundLoad(last.weight * DELOAD_PCT);
		targetReps = lo;
		note = `${STALL_SESSIONS} sessions stuck at ${last.weight}kg`;
	} else if (last.total >= hi) {
		// The app cannot know the next weight on this machine, so it asks for
		// "more than last time" and you type what you actually used.
		kind = 'add-load';
		targetLoad = last.weight;
		loadUp = true;
		targetReps = lo;
		note = `next weight up from ${last.weight}kg`;
	} else if (last.total >= lo) {
		kind = 'add-reps';
		targetLoad = last.weight;
		targetReps = Math.min(last.total + step, hi);
	} else {
		const prev = inBand[inBand.length - 2];
		if (prev && prev.weight === last.weight && prev.total < lo) {
			kind = 'reduce-load';
			targetLoad = roundLoad(last.weight * REDUCE_PCT);
			targetReps = lo;
			note = `under ${lo} twice at ${last.weight}kg`;
		} else {
			// Normal straight after a weight jump.
			kind = 'repeat';
			targetLoad = last.weight;
			targetReps = lo;
			note = `under ${lo} last time`;
		}
	}

	// A rough day never chases a gain. Readiness never blocks a deload.
	if (readiness === 'low' && (kind === 'add-load' || kind === 'add-reps')) {
		kind = 'match';
		targetLoad = last.weight;
		loadUp = false;
		targetReps = last.total;
		note = 'rough day: match it, do not chase it';
	}

	const { move, tone } = KIND_DIRECTION[kind];
	return {
		...base,
		kind,
		targetLoad,
		loadUp,
		targetReps,
		note: note ?? null,
		// The bar fills to where the last session landed and rings today's
		// target. A weight step empties it: the new rung starts from nothing.
		direction: {
			move,
			tone,
			total: { from: move === 'load' ? null : (last?.total ?? null), to: targetReps, lo, hi }
		}
	};
}

// What a total just typed on the log sheet means for next time, worked out by
// the same rules that set today's target.
export function preview({ exercise, sessions, band, weight, total }) {
	const w = Number(weight);
	const t = Number(total);
	if (!(w > 0) || !(t > 0)) return null;
	const next = prescribe({
		exercise,
		sessions: [...sessions, { date: new Date().toISOString(), weight: w, total: t, band, score: sessionScore(w, t) }],
		band
	});
	switch (next.kind) {
		case 'add-reps':
			return { tone: 'push', text: `next time ${next.targetReps}` };
		case 'add-load':
			return { tone: 'new', text: 'top of the range: go up a weight next time' };
		case 'repeat':
			return { tone: 'hold', text: `under ${next.targetLow}: same weight next time` };
		case 'reduce-load':
			return { tone: 'back-off', text: `under ${next.targetLow} twice: drop the weight next time` };
		case 'deload':
			return { tone: 'back-off', text: `no gain in ${STALL_SESSIONS} sessions: deload next time` };
		default:
			return null;
	}
}
