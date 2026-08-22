import { writable, derived, get } from 'svelte/store';
import {
	program,
	slotVariants,
	exerciseIndex,
	movementForId,
	movementName,
	siblingMovements,
	bandConfigFor,
	structureFor
} from './program.js';
import {
	BAND_ORDER,
	bucketFor,
	bucketLabel,
	scoreFor,
	effectiveReps,
	estimatedOneRepMax,
	classifyBand
} from './bands.js';
import { prescribe, sessionsIn } from './prescribe.js';

// --- Config ---
export const STALE_DAYS = 14; // a record older than this gets a "GO FOR IT" nudge
export const WEEKLY_SETS_MIN = 10; // per muscle, per week — below this is under-dosed
export const WEEKLY_SETS_MAX = 20; // above this and you are buying fatigue, not growth
export const RIR_DRIFT_SESSIONS = 2; // consecutive sessions mostly at failure -> flag

export const READINESS = ['low', 'normal', 'high'];
export const READINESS_LABELS = { low: 'ROUGH', normal: 'NORMAL', high: 'GOOD' };

// --- Persistence helpers ---
function loadJSON(key, fallback) {
	try {
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) : fallback;
	} catch {
		return fallback;
	}
}

function persist(key, store) {
	store.subscribe((val) => {
		try {
			localStorage.setItem(key, JSON.stringify(val));
		} catch {
			// ignore quota / serialization errors
		}
	});
	return store;
}

// --- Stores ---

// Which day in the 5-day cycle (0-indexed)
export const currentDayIndex = persist('gym_currentDay', writable(loadJSON('gym_currentDay', 0)));

// User-created variations, per slot: { [slotId]: [{ id, movement, name, basedOn }] }
// These exist because the same exercise on a different station is not the same
// load. "Cable machine by the pilates room" gets its own records rather than
// polluting the main stack's numbers.
export const customVariants = persist(
	'gym_customVariants',
	writable(loadJSON('gym_customVariants', {}))
);

// All logged sets:
//   { date, exerciseId, movement, structure, bucket, weight, reps,
//     totalReps?, rir?, readiness?, legacy? }
//
// `bucket` is stamped at log time: the rep band for straight sets ('heavy' |
// 'moderate' | 'volume'), or 'myo' for myo-reps. Bands come from the reps you
// actually did, so a high-rep day is judged against high-rep history rather
// than against a heavy PR it was never chasing.
//
// Migration: entries logged under the old model carry `method`, which
// conflated set structure with rep band. We split it — 'myorep' becomes a
// structure, 'volume' becomes a straight set that lands in the volume band —
// and re-derive the bucket from the reps actually performed. They keep every
// number but are stamped `legacy: true`: no RIR was ever recorded against
// them, so they seed your bests without driving today's prescriptions.
function migrateEntry(entry) {
	if (entry.structure && entry.bucket) return entry;
	const movement = entry.movement ?? movementForId(entry.exerciseId);
	const def = exerciseIndex[entry.exerciseId];
	const structure = entry.structure ?? structureFor(entry.method ?? def?.method);
	const bands = def?.bands ?? bandConfigFor(movement, def?.repRange).bands;
	const next = { ...entry, movement, structure };
	next.bucket = bucketFor(next, bands);
	if (entry.rir == null) next.legacy = true;
	return next;
}

function migrateLog(log) {
	return log.map(migrateEntry);
}

export const workoutLog = persist('gym_log', writable(migrateLog(loadJSON('gym_log', []))));

// Completion ticks (trained but no new record): { date, exerciseId }
export const completionLog = persist('gym_completions', writable(loadJSON('gym_completions', [])));

// Which variant is active per slot: { [slotId]: variantId }
export const exerciseSelections = persist('gym_selections', writable(loadJSON('gym_selections', {})));

// Current session in progress:
// { dayIndex, startedAt, readiness, completedExercises: [slotId] }
export const activeSession = persist('gym_session', writable(loadJSON('gym_session', null)));

// Session history: [{ date, dayIndex, exerciseCount, prCount, readiness }]
export const sessionHistory = persist('gym_history', writable(loadJSON('gym_history', [])));

// --- Derived ---

export const currentDay = derived(currentDayIndex, ($i) => program[$i]);

// A record is identified by movement + bucket. The same exercise shares one
// record per bucket across every day it appears on; a different rep band (or
// myo-reps) keeps its own.
export function recordKey(movement, bucket) {
	return `${movement}::${bucket}`;
}

// Eligible bands for a log entry's exercise (used to snap orphaned bands).
function bandsForEntry(entry) {
	const def = exerciseIndex[entry.exerciseId];
	if (def?.bands) return def.bands;
	const movement = entry.movement ?? movementForId(entry.exerciseId);
	return bandConfigFor(movement, def?.repRange).bands;
}

// The movement + bucket a log entry belongs to (resilient to un-migrated rows).
export function entryKey(entry) {
	const movement = entry.movement ?? movementForId(entry.exerciseId);
	const bucket = bucketFor(entry, bandsForEntry(entry)) ?? 'moderate';
	return recordKey(movement, bucket);
}

// Best per movement+bucket:
//   { 'movement::bucket': { weight, reps, totalReps, score, date, bucket } }
// Scored by estimated 1RM in the heavy and moderate bands (so 10 x 90kg
// correctly beats 4 x 100kg) and by total load in the volume and myo buckets.
export const records = derived(workoutLog, ($log) => {
	const recs = {};
	for (const entry of $log) {
		if (entry.weight == null || entry.reps == null) continue;
		const movement = entry.movement ?? movementForId(entry.exerciseId);
		const bucket = bucketFor(entry, bandsForEntry(entry));
		if (!bucket) continue;
		const key = recordKey(movement, bucket);
		const reps = effectiveReps(entry);
		const score = scoreFor(bucket, entry.weight, reps);
		const current = recs[key];
		if (!current || score > current.score) {
			recs[key] = {
				weight: entry.weight,
				reps: entry.reps,
				totalReps: entry.totalReps ?? null,
				score,
				bucket,
				date: entry.date,
				legacy: !!entry.legacy
			};
		}
	}
	return recs;
});

// Every bucket record for an exercise variant, in band order (myo last).
export function recordsFor(recs, exercise) {
	if (!exercise) return [];
	const buckets =
		exercise.structure === 'myorep' ? ['myo'] : (exercise.bands ?? BAND_ORDER);
	return buckets
		.map((bucket) => ({ bucket, record: recs[recordKey(exercise.movement, bucket)] }))
		.filter((b) => b.record);
}

// The record for the bucket an exercise is being trained in today.
export function recordFor(recs, exercise, bucket) {
	if (!exercise) return undefined;
	const b = bucket ?? (exercise.structure === 'myorep' ? 'myo' : exercise.defaultBand);
	return recs[recordKey(exercise.movement, b)];
}

function daysBetween(iso, now = Date.now()) {
	return (now - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

// Records that have gone stale (older than STALE_DAYS).
export const staleRecords = derived(records, ($recs) => {
	const stale = {};
	const now = Date.now();
	for (const [key, rec] of Object.entries($recs)) {
		const days = daysBetween(rec.date, now);
		if (days >= STALE_DAYS) stale[key] = Math.floor(days);
	}
	return stale;
});

// Stale days for the bucket an exercise is being trained in (0 if fresh).
export function staleDaysFor(stale, exercise, bucket) {
	if (!exercise) return 0;
	const b = bucket ?? (exercise.structure === 'myorep' ? 'myo' : exercise.defaultBand);
	return stale[recordKey(exercise.movement, b)] ?? 0;
}

// Every logged set for a movement, chronological. This is the input to the
// prescription engine — it spans all buckets, because choosing today's band
// needs to see your moderate work as well as your heavy work.
export function historyForMovement(log, movement) {
	return log
		.filter((e) => e.weight != null && (e.movement ?? movementForId(e.exerciseId)) === movement)
		.slice()
		.sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Sets for one movement + bucket (used by the edit-history view).
export function getExerciseHistory(movement, bucket) {
	const key = recordKey(movement, bucket);
	return derived(workoutLog, ($log) => $log.filter((e) => e.weight != null && entryKey(e) === key));
}

// --- Selection helpers ---

export function customVariantsFor(custom, slotId) {
	return custom?.[slotId] ?? [];
}

// Resolve the active variant (full exercise object) for a program slot.
export function getActiveVariant(slot, selections, custom) {
	const variants = slotVariants(slot, customVariantsFor(custom, slot.id));
	const selectedId = selections?.[slot.id];
	return variants.find((v) => v.id === selectedId) ?? variants[0];
}

export function selectVariant(slotId, variantId) {
	exerciseSelections.update(($s) => ({ ...$s, [slotId]: variantId }));
}

// Add a gym-specific variation from inside the app ("Cable machine by the
// pilates room"). It gets its own movement key, so its records never mix with
// the station you normally use, and it is selected immediately.
export function addCustomVariant(slotId, name) {
	const clean = String(name ?? '').trim();
	if (!clean) return null;
	const slug = clean
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
	const slot = program.flatMap((d) => d.exercises).find((e) => e.id === slotId);
	if (!slot || !slug) return null;
	const id = `custom-${slotId}-${slug}`;
	const variant = {
		id,
		movement: `custom-${slug}`,
		name: clean,
		basedOn: slot.movement,
		muscle: slot.muscle
	};
	let created = null;
	customVariants.update(($c) => {
		const existing = $c[slotId] ?? [];
		if (existing.some((v) => v.id === id)) {
			created = existing.find((v) => v.id === id);
			return $c;
		}
		created = variant;
		return { ...$c, [slotId]: [...existing, variant] };
	});
	if (created) selectVariant(slotId, created.id);
	return created;
}

export function removeCustomVariant(slotId, variantId) {
	customVariants.update(($c) => ({
		...$c,
		[slotId]: ($c[slotId] ?? []).filter((v) => v.id !== variantId)
	}));
	exerciseSelections.update(($s) => (($s[slotId] === variantId ? { ...$s, [slotId]: undefined } : $s)));
}

// --- Coaching ---

// The best set from a sibling movement in the same slot, used as a reference
// when you have no history on the station you picked today.
export function referenceFor(log, slot, exercise) {
	if (!slot || !exercise) return null;
	const siblings = siblingMovements(slot).filter((m) => m && m !== exercise.movement);
	let best = null;
	for (const entry of log) {
		if (entry.weight == null) continue;
		const movement = entry.movement ?? movementForId(entry.exerciseId);
		if (!siblings.includes(movement)) continue;
		const score = estimatedOneRepMax(entry.weight, effectiveReps(entry));
		if (!best || score > best.score) {
			best = { name: movementName(movement), weight: entry.weight, reps: entry.reps, score };
		}
	}
	return best;
}

// Today's instruction for one exercise. This is what the card and the log
// modal both read — the target comes from your last session in this band on
// this variant, never from an all-time PR you should not be chasing weekly.
export function prescriptionFor(log, slot, exercise, readiness = 'normal', now = Date.now()) {
	if (!exercise) return null;
	return prescribe({
		exercise,
		history: historyForMovement(log, exercise.movement),
		readiness,
		reference: referenceFor(log, slot, exercise),
		now
	});
}

// --- Fatigue guardrails ---

// Programmed hard sets per muscle over the last 7 days, from sessions actually
// completed. Under WEEKLY_SETS_MIN is under-dosed; over WEEKLY_SETS_MAX is
// mostly buying fatigue.
export function weeklySetsByMuscle(history, days = 7) {
	const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
	const totals = {};
	for (const session of history) {
		if (new Date(session.date).getTime() < cutoff) continue;
		const day = program[session.dayIndex];
		if (!day) continue;
		for (const slot of day.exercises) {
			totals[slot.muscle] = (totals[slot.muscle] ?? 0) + (slot.sets ?? 0);
		}
	}
	return totals;
}

// Are you living at failure? If most sets in each of the last few sessions
// went to RIR 0 while reps stopped moving, that is accumulated fatigue rather
// than a strength problem.
export function rirDrift(log, sessions = RIR_DRIFT_SESSIONS) {
	const byDay = new Map();
	for (const e of log) {
		if (e.rir == null) continue;
		const day = new Date(e.date).toISOString().slice(0, 10);
		if (!byDay.has(day)) byDay.set(day, []);
		byDay.get(day).push(e);
	}
	const days = [...byDay.keys()].sort().slice(-sessions);
	if (days.length < sessions) return false;
	return days.every((d) => {
		const sets = byDay.get(d);
		return sets.filter((s) => s.rir === 0).length / sets.length > 0.5;
	});
}

// Movements stuck in their current bucket (no gain over STALL_SESSIONS).
export function stalledMovements(log) {
	const out = [];
	const seen = new Set();
	for (const entry of log) {
		const movement = entry.movement ?? movementForId(entry.exerciseId);
		const bucket = bucketFor(entry, bandsForEntry(entry));
		if (!movement || !bucket) continue;
		const key = recordKey(movement, bucket);
		if (seen.has(key)) continue;
		seen.add(key);
		const history = historyForMovement(log, movement);
		const sessions = sessionsIn(history, bucket, bandsForEntry(entry));
		if (sessions.length < 3) continue;
		const recent = sessions.slice(-3);
		if (recent.slice(1).every((s) => s.score <= recent[0].score)) {
			out.push({ key, movement, bucket, load: recent[recent.length - 1].weight });
		}
	}
	return out;
}

// --- Analytics helpers ---

export { estimatedOneRepMax };

// Per-record progression: chronological points for charts.
export function exerciseProgress(log, key) {
	return log
		.filter((e) => e.weight != null && entryKey(e) === key)
		.map((e) => ({
			date: e.date,
			weight: e.weight,
			reps: e.reps,
			e1rm: estimatedOneRepMax(e.weight, effectiveReps(e)),
			volume: e.weight * effectiveReps(e)
		}));
}

// Walk the log forward, flagging each set that was a best in its bucket at the
// time it was logged.
function walkPRs(log, onPR) {
	const best = {};
	for (const entry of log) {
		if (entry.weight == null || entry.reps == null) continue;
		const movement = entry.movement ?? movementForId(entry.exerciseId);
		const bucket = bucketFor(entry, bandsForEntry(entry));
		if (!bucket) continue;
		const key = recordKey(movement, bucket);
		const score = scoreFor(bucket, entry.weight, effectiveReps(entry));
		if (best[key] == null || score > best[key]) {
			best[key] = score;
			onPR({ key, entry, score, bucket });
		}
	}
}

export function recentPRs(log, days = 30) {
	const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
	const prs = [];
	walkPRs(log, ({ key, entry, bucket }) => {
		if (new Date(entry.date).getTime() >= cutoff) {
			prs.push({ key, bucket, weight: entry.weight, reps: entry.reps, date: entry.date });
		}
	});
	return prs.reverse();
}

export function countPRsInWindow(log, startDaysAgo, endDaysAgo) {
	const now = Date.now();
	const start = now - startDaysAgo * 24 * 60 * 60 * 1000;
	const end = now - endDaysAgo * 24 * 60 * 60 * 1000;
	let count = 0;
	walkPRs(log, ({ entry }) => {
		const t = new Date(entry.date).getTime();
		if (t >= start && t < end) count++;
	});
	return count;
}

export function sessionsInWindow(history, days) {
	const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
	return history.filter((s) => new Date(s.date).getTime() >= cutoff).length;
}

// Current streak = consecutive distinct days with a completed session.
export function currentStreak(history) {
	if (history.length === 0) return 0;
	const dayKeys = new Set(history.map((s) => new Date(s.date).toISOString().slice(0, 10)));
	let streak = 0;
	const cursor = new Date();
	if (!dayKeys.has(cursor.toISOString().slice(0, 10))) {
		cursor.setDate(cursor.getDate() - 1);
	}
	while (dayKeys.has(cursor.toISOString().slice(0, 10))) {
		streak++;
		cursor.setDate(cursor.getDate() - 1);
	}
	return streak;
}

export function totalVolumeLifted(log) {
	return log.reduce(
		(sum, e) => sum + (e.weight != null && e.reps != null ? e.weight * effectiveReps(e) : 0),
		0
	);
}

// Biggest e1RM gain over the last `days` days.
export function biggestGain(log, days = 60) {
	const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
	const before = {};
	const after = {};
	for (const e of log) {
		if (e.weight == null || e.reps == null) continue;
		const key = entryKey(e);
		const est = estimatedOneRepMax(e.weight, effectiveReps(e));
		const t = new Date(e.date).getTime();
		if (t < cutoff) before[key] = Math.max(before[key] ?? 0, est);
		else after[key] = Math.max(after[key] ?? 0, est);
	}
	let top = null;
	for (const key of Object.keys(after)) {
		const base = before[key];
		if (!base) continue;
		const gain = after[key] - base;
		if (gain > 0 && (!top || gain > top.gain)) {
			top = { key, gain, from: base, to: after[key] };
		}
	}
	return top;
}

// Display name for any logged exercise id (primary, alternative, or custom).
export function exerciseName(id) {
	if (exerciseIndex[id]) return exerciseIndex[id].name;
	const custom = Object.values(get(customVariants))
		.flat()
		.find((v) => v.id === id);
	return custom?.name ?? id;
}

// Display label for a movement::bucket record key.
export function recordLabel(key) {
	const [movement, bucket] = key.split('::');
	const custom = Object.values(get(customVariants))
		.flat()
		.find((v) => v.movement === movement);
	const name = custom?.name ?? movementName(movement);
	return bucket === 'moderate' ? name : `${name} · ${bucketLabel(bucket).toLowerCase()}`;
}

// --- Actions ---

// Log a set. The bucket is derived from the reps actually performed (or 'myo'
// for a myo-rep set), so the set lands in the record it was really competing
// against — not the one the program guessed at before you started.
export function updateRecord(exerciseId, weight, reps, opts = {}) {
	const { rir = null, totalReps = null, readiness = null, movement, structure, bands } = opts;
	const def = exerciseIndex[exerciseId];
	const mv = movement ?? def?.movement ?? movementForId(exerciseId);
	const st = structure ?? def?.structure ?? 'straight';
	const w = parseFloat(weight);
	const r = parseInt(reps);
	if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) return;
	const entry = {
		date: new Date().toISOString(),
		exerciseId,
		movement: mv,
		structure: st,
		weight: w,
		reps: r,
		totalReps: st === 'myorep' && totalReps ? parseInt(totalReps) : null,
		rir,
		readiness
	};
	entry.bucket = bucketFor(entry, bands ?? def?.bands ?? bandConfigFor(mv, def?.repRange).bands);
	workoutLog.update(($log) => [...$log, entry]);
}

// Correct a previously logged set. Matched by reference so duplicate rows stay
// distinct. Editing the reps can move the set into a different band, which is
// correct — the band always reflects what was actually done.
export function editLogEntry(entry, weight, reps, opts = {}) {
	const w = parseFloat(weight);
	const r = parseInt(reps);
	if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) return;
	workoutLog.update(($log) =>
		$log.map((e) => {
			if (e !== entry) return e;
			const next = {
				...e,
				weight: w,
				reps: r,
				totalReps: opts.totalReps != null ? parseInt(opts.totalReps) || null : e.totalReps,
				rir: opts.rir !== undefined ? opts.rir : e.rir
			};
			next.bucket = bucketFor({ ...next, bucket: null }, bandsForEntry(next));
			return next;
		})
	);
}

export function deleteLogEntry(entry) {
	workoutLog.update(($log) => $log.filter((e) => e !== entry));
}

// Tick an exercise as completed (trained, no new record).
export function markCompleted(slotId, exerciseId) {
	completionLog.update(($log) => [...$log, { date: new Date().toISOString(), exerciseId: exerciseId ?? slotId }]);
}

export function startSession(dayIndex, readiness = 'normal') {
	activeSession.set({
		dayIndex,
		startedAt: new Date().toISOString(),
		readiness,
		completedExercises: []
	});
}

export function setReadiness(readiness) {
	activeSession.update(($s) => ($s ? { ...$s, readiness } : $s));
}

export function markExerciseComplete(slotId) {
	activeSession.update(($s) => {
		if (!$s) return $s;
		if ($s.completedExercises.includes(slotId)) return $s;
		return { ...$s, completedExercises: [...$s.completedExercises, slotId] };
	});
}

export function completeSession(dayIndex, prCount, readiness = 'normal') {
	sessionHistory.update(($h) => [
		...$h,
		{
			date: new Date().toISOString(),
			dayIndex,
			exerciseCount: program[dayIndex].exercises.length,
			prCount,
			readiness
		}
	]);
	currentDayIndex.update(($i) => ($i + 1) % program.length);
	activeSession.set(null);
}
