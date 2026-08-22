// The coaching layer: turns your history into one instruction for today.
//
// Engine is double progression — hold a load until you reach the top of the
// target rep range, then add the smallest increment and drop back to the
// bottom. RIR gates it, so the app never tells you to add weight off a set you
// barely survived. See docs/training-model.md for the reasoning.

import { BANDS, bucketFor, scoreFor, effectiveReps } from './bands.js';

export const HEAVY_TEST_DAYS = 21; // min gap between heavy attempts on a movement
export const HEAVY_TEST_DAYS_FRESH = 14; // relaxed when you report feeling good
export const HEAVY_MIN_MODERATE_SESSIONS = 3; // build a base before testing
export const STALL_SESSIONS = 3; // no improvement over this many -> deload
export const DELOAD_PCT = 0.9;
export const REDUCE_PCT = 0.9;

const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(iso) {
	return new Date(iso).toISOString().slice(0, 10);
}

function daysSince(iso, now = Date.now()) {
	return (now - new Date(iso).getTime()) / DAY_MS;
}

export function roundLoad(kg) {
	return Math.round(kg * 2) / 2;
}

// Collapse a bucket's entries into one session per calendar day, keeping the
// best-scoring set of that day. Returns oldest-first.
export function sessionsIn(history, bucket, eligible) {
	const byDay = new Map();
	for (const e of history) {
		if (e.weight == null || e.reps == null) continue;
		if (bucketFor(e, eligible) !== bucket) continue;
		const key = dayKey(e.date);
		const score = scoreFor(bucket, e.weight, effectiveReps(e));
		const cur = byDay.get(key);
		if (!cur || score > cur.score) byDay.set(key, { ...e, score });
	}
	return [...byDay.values()].sort((a, b) => new Date(a.date) - new Date(b.date));
}

// No improvement across the most recent STALL_SESSIONS sessions.
//
// Only counts sessions logged under the current model. Migrated history has no
// effort recorded against it, and a single mis-entered old set would otherwise
// look like a plateau and trigger a deload you do not need.
export function isStalled(sessions) {
	if (sessions.length < STALL_SESSIONS) return false;
	const recent = sessions.slice(-STALL_SESSIONS);
	if (recent.some((s) => s.legacy)) return false;
	const base = recent[0].score;
	return recent.slice(1).every((s) => s.score <= base);
}

// --- Band selection -------------------------------------------------------

// Heavy work is a periodic test, not a weekly habit: you only earn it when the
// exercise allows it, you have a moderate base, enough time has passed, and
// your moderate work has actually improved since the last attempt.
export function chooseBand(exercise, history, readiness = 'normal', now = Date.now()) {
	let eligible = exercise.bands ?? ['moderate'];
	if (readiness === 'low') eligible = eligible.filter((b) => b !== 'heavy');

	const fallback = eligible.includes(exercise.defaultBand)
		? exercise.defaultBand
		: eligible.includes('moderate')
			? 'moderate'
			: eligible[0];

	if (!eligible.includes('heavy') || fallback === 'heavy') {
		return { band: fallback, heavyTest: false };
	}

	const moderate = sessionsIn(history, 'moderate', exercise.bands);
	if (moderate.length < HEAVY_MIN_MODERATE_SESSIONS) return { band: fallback, heavyTest: false };

	const heavy = sessionsIn(history, 'heavy', exercise.bands);
	const lastHeavy = heavy[heavy.length - 1];
	if (!lastHeavy) return { band: 'heavy', heavyTest: true, reason: 'first heavy anchor' };

	const gate = readiness === 'high' ? HEAVY_TEST_DAYS_FRESH : HEAVY_TEST_DAYS;
	if (daysSince(lastHeavy.date, now) < gate) return { band: fallback, heavyTest: false };

	const since = new Date(lastHeavy.date).getTime();
	const bestSince = Math.max(
		0,
		...moderate.filter((s) => new Date(s.date).getTime() > since).map((s) => s.score)
	);
	const bestBefore = Math.max(
		0,
		...moderate.filter((s) => new Date(s.date).getTime() <= since).map((s) => s.score)
	);
	if (bestSince > bestBefore) {
		return { band: 'heavy', heavyTest: true, reason: 'moderate work has moved up' };
	}
	return { band: fallback, heavyTest: false };
}

// --- The prescription -----------------------------------------------------

// history: every log entry for THIS variant (movement), chronological.
// reference: optional { name, weight, reps, bucket } from a sibling movement,
//            shown when you have no history on the station you picked today.
export function prescribe({
	exercise,
	history = [],
	readiness = 'normal',
	reference = null,
	now = Date.now()
}) {
	const { band, heavyTest, reason: bandReason } = chooseBand(exercise, history, readiness, now);
	const isMyo = exercise.structure === 'myorep';
	const bucket = isMyo ? 'myo' : band;
	const increment = exercise.increment ?? 5;

	const [lo, hi] = isMyo
		? (exercise.targetReps?.[exercise.defaultBand] ?? BANDS.volume.defaultTarget)
		: (exercise.targetReps?.[band] ?? BANDS[band].defaultTarget);

	const sessions = sessionsIn(history, bucket, exercise.bands);
	const last = sessions[sessions.length - 1];

	const base = { band, bucket, isMyo, increment, targetLow: lo, targetHigh: hi, heavyTest };

	if (!last) {
		return {
			...base,
			kind: reference ? 'calibrate' : 'establish',
			targetLoad: null,
			targetReps: lo,
			headline: `Find a load for ${lo}-${hi} reps`,
			reason: reference
				? `No history here yet. On ${reference.name} you did ${reference.weight}kg × ${reference.reps} — start near that and treat today as calibration, not a PR attempt.`
				: 'First time on this one. Pick a load you can control for the full range and leave 1-2 reps in the tank.',
			reference
		};
	}

	const lastReps = isMyo ? last.reps : effectiveReps(last); // myo gates on the activation set
	const lastTotal = effectiveReps(last);
	const lastLoad = last.weight;
	const rir = last.rir ?? null;
	const stalled = isStalled(sessions);

	let kind, targetLoad, targetReps, headline, reason;

	if (stalled) {
		kind = 'deload';
		targetLoad = roundLoad(lastLoad * DELOAD_PCT);
		targetReps = lo;
		headline = `${targetLoad}kg × ${lo}`;
		reason = `Three sessions with no gain at ${lastLoad}kg. Back off about 10% today, rebuild from there — grinding a stall just banks fatigue.`;
	} else if (lastReps < lo) {
		if (rir === 0) {
			kind = 'reduce-load';
			targetLoad = roundLoad(lastLoad * REDUCE_PCT);
			targetReps = lo;
			headline = `${targetLoad}kg × ${lo}`;
			reason = `Last time ${lastLoad}kg × ${lastReps} to failure — under the ${lo}-${hi} range. The load is too heavy to grow on. Drop it and earn the reps.`;
		} else {
			kind = 'push-harder';
			targetLoad = lastLoad;
			targetReps = lo;
			headline = `${lastLoad}kg × ${lo}`;
			reason = `Last time ${lastLoad}kg × ${lastReps} with reps left over. Same load — get to ${lo} and take it closer to failure.`;
		}
	} else if (lastReps < hi) {
		kind = 'add-reps';
		targetLoad = lastLoad;
		targetReps = lastReps + 1;
		headline = isMyo
			? `${lastLoad}kg — beat ${lastTotal} total`
			: `${lastLoad}kg × ${lastReps + 1}`;
		reason = isMyo
			? lastTotal > lastReps
				? `Last time ${lastLoad}kg, ${lastReps} on the activation set for ${lastTotal} reps total. Hold the load and beat the total. At ${hi} on the activation set we add weight.`
				: `Last time ${lastLoad}kg × ${lastReps}. Hold the load and beat that on total reps. At ${hi} on the activation set we add weight.`
			: `Last time ${lastLoad}kg × ${lastReps}. One more rep. Top of the range is ${hi}, then we add ${increment}kg.`;
	} else {
		const prev = sessions[sessions.length - 2];
		const alreadyConsolidated =
			prev && prev.weight === lastLoad && (isMyo ? prev.reps : effectiveReps(prev)) >= hi;
		if (rir == null) {
			kind = 'confirm';
			targetLoad = lastLoad;
			targetReps = lastReps;
			headline = `${lastLoad}kg × ${lastReps}`;
			reason = `Last time ${lastLoad}kg × ${lastReps}, but no effort was recorded against it. Repeat it and tell me how close to failure you got — then I know whether to add ${increment}kg.`;
		} else if (rir === 0 && !alreadyConsolidated) {
			kind = 'consolidate';
			targetLoad = lastLoad;
			targetReps = hi;
			headline = `${lastLoad}kg × ${hi}`;
			reason = `You hit the top of the range but had nothing left. Repeat ${lastLoad}kg once to own it, then we add ${increment}kg.`;
		} else {
			kind = 'add-load';
			targetLoad = roundLoad(lastLoad + increment);
			targetReps = lo;
			headline = `${targetLoad}kg × ${lo}`;
			reason = `You topped the range at ${lastLoad}kg. Add ${increment}kg and drop back to ${lo} reps — or the nearest load you can actually get on.`;
		}
	}

	// Readiness never blocks a deload, but it does stop you chasing a jump on a
	// bad day. Match last session instead of beating it.
	if (readiness === 'low' && (kind === 'add-load' || kind === 'add-reps')) {
		kind = 'match';
		targetLoad = lastLoad;
		targetReps = lastReps;
		headline = `${lastLoad}kg × ${lastReps}`;
		reason = `You flagged a rough day. Match last session rather than chasing it — a maintained session beats a bad one you have to recover from.`;
	}

	if (heavyTest) {
		reason = `Heavy test — ${bandReason ?? 'time to cash in your moderate work'}. Stay strict, stop with a rep in reserve. ${reason}`;
	}

	return { ...base, kind, targetLoad, targetReps, headline, reason, last, reference };
}

export const KIND_LABELS = {
	establish: 'SET A BASELINE',
	calibrate: 'CALIBRATE',
	'add-reps': 'ADD A REP',
	'add-load': 'ADD LOAD',
	consolidate: 'CONSOLIDATE',
	'push-harder': 'PUSH HARDER',
	'reduce-load': 'DROP THE LOAD',
	confirm: 'CONFIRM IT',
	deload: 'DELOAD',
	match: 'MATCH IT'
};
