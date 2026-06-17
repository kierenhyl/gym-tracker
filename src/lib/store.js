import { writable, derived, get } from 'svelte/store';
import {
	program,
	slotVariants,
	exerciseIndex,
	movementForId,
	movementName
} from './program.js';

// --- Config ---
export const STALE_DAYS = 14; // a record older than this gets a "GO FOR IT" nudge
export const VOLUME_LOAD_PCT = 0.6; // suggested high-volume load = 60% of max

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
export const currentDayIndex = persist(
	'gym_currentDay',
	writable(loadJSON('gym_currentDay', 0))
);

// All logged sets: { date, exerciseId, movement, method, weight, reps }
// Records are grouped by `movement` + `method` (see `records` below).
//
// One-time migration: entries logged before per-movement tracking only carry
// `exerciseId`. We stamp them with their canonical `movement` and treat every
// historical set as `straight` (standard) — the user confirmed they had only
// ever trained these as standard, so myorep and volume bests start empty.
function migrateLog(log) {
	return log.map((entry) => {
		if (entry.movement && entry.method) return entry;
		return {
			...entry,
			movement: entry.movement ?? movementForId(entry.exerciseId),
			method: entry.method ?? 'straight'
		};
	});
}

export const workoutLog = persist(
	'gym_log',
	writable(migrateLog(loadJSON('gym_log', [])))
);

// Completion ticks (trained but no new record): { date, exerciseId }
export const completionLog = persist(
	'gym_completions',
	writable(loadJSON('gym_completions', []))
);

// Which variant is active per slot: { [slotId]: variantId }
export const exerciseSelections = persist(
	'gym_selections',
	writable(loadJSON('gym_selections', {}))
);

// Current session in progress: { dayIndex, startedAt, completedExercises: [slotId] }
export const activeSession = persist(
	'gym_session',
	writable(loadJSON('gym_session', null))
);

// Session history: [{ date, dayIndex, exerciseCount, prCount }]
export const sessionHistory = persist(
	'gym_history',
	writable(loadJSON('gym_history', []))
);

// --- Derived ---

export const currentDay = derived(currentDayIndex, ($i) => program[$i]);

// A record is identified by movement + method, so the same exercise shares one
// best across every day it appears on, while a different method (straight /
// myorep / volume) keeps its own best.
export function recordKey(movement, method) {
	return `${movement}::${method}`;
}

// The movement + method a log entry belongs to (resilient to un-migrated rows).
export function entryKey(entry) {
	const movement = entry.movement ?? movementForId(entry.exerciseId);
	const method = entry.method ?? 'straight';
	return recordKey(movement, method);
}

// Best per movement+method: { 'movement::method': { weight, reps, volume, date } }
// For volume the best is highest total volume; otherwise heaviest weight (more
// reps wins on a tie).
export const records = derived(workoutLog, ($log) => {
	const recs = {};
	for (const entry of $log) {
		if (entry.weight == null || entry.reps == null) continue;
		const method = entry.method ?? 'straight';
		const key = entryKey(entry);
		const volume = entry.weight * entry.reps;
		const current = recs[key];
		const better =
			method === 'volume'
				? !current || volume > current.volume
				: !current ||
					entry.weight > current.weight ||
					(entry.weight === current.weight && entry.reps > current.reps);
		if (better) {
			recs[key] = { weight: entry.weight, reps: entry.reps, volume, date: entry.date };
		}
	}
	return recs;
});

// The record for a given exercise variant (by its movement + method).
export function recordFor(recs, exercise) {
	if (!exercise) return undefined;
	return recs[recordKey(exercise.movement, exercise.method)];
}

function daysBetween(iso, now = Date.now()) {
	return (now - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

// Records that have gone stale (older than STALE_DAYS). Returns
// { ['movement::method']: daysSince } for any record that is overdue.
export const staleRecords = derived(records, ($recs) => {
	const stale = {};
	const now = Date.now();
	for (const [key, rec] of Object.entries($recs)) {
		const days = daysBetween(rec.date, now);
		if (days >= STALE_DAYS) stale[key] = Math.floor(days);
	}
	return stale;
});

// Stale days for a given exercise variant (0 if fresh / no record).
export function staleDaysFor(stale, exercise) {
	if (!exercise) return 0;
	return stale[recordKey(exercise.movement, exercise.method)] ?? 0;
}

// Get all sets for a specific movement+method from the log (chronological)
export function getExerciseHistory(movement, method) {
	const key = recordKey(movement, method);
	return derived(workoutLog, ($log) =>
		$log.filter((e) => e.weight != null && entryKey(e) === key)
	);
}

// --- Selection helpers ---

// Resolve the active variant (full exercise object) for a program slot.
export function getActiveVariant(slot, selections) {
	const variants = slotVariants(slot);
	const selectedId = selections?.[slot.id];
	return variants.find((v) => v.id === selectedId) ?? variants[0];
}

export function selectVariant(slotId, variantId) {
	exerciseSelections.update(($s) => ({ ...$s, [slotId]: variantId }));
}

// --- Analytics helpers ---

// Epley estimated 1RM
export function estimatedOneRepMax(weight, reps) {
	if (!weight || !reps) return 0;
	return weight * (1 + reps / 30);
}

// Per-record progression: chronological points of e1RM (and volume) for charts.
// `key` is a movement::method key (see recordKey).
export function exerciseProgress(log, key) {
	return log
		.filter((e) => e.weight != null && entryKey(e) === key)
		.map((e) => ({
			date: e.date,
			weight: e.weight,
			reps: e.reps,
			e1rm: estimatedOneRepMax(e.weight, e.reps),
			volume: e.weight * e.reps
		}));
}

// PRs achieved within the last `days` days (a record entry that was a best at the
// time it was logged). Returns newest-first list of { key, weight, reps, date }.
export function recentPRs(log, days = 30) {
	const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
	const best = {}; // running best weight/reps as we walk forward
	const prs = [];
	for (const entry of log) {
		if (entry.weight == null || entry.reps == null) continue;
		const key = entryKey(entry);
		const cur = best[key];
		const isPR =
			!cur ||
			entry.weight > cur.weight ||
			(entry.weight === cur.weight && entry.reps > cur.reps);
		if (isPR) {
			best[key] = { weight: entry.weight, reps: entry.reps };
			if (new Date(entry.date).getTime() >= cutoff) {
				prs.push({
					key,
					weight: entry.weight,
					reps: entry.reps,
					date: entry.date
				});
			}
		}
	}
	return prs.reverse();
}

// Count PRs in the [start, end) day window relative to now.
export function countPRsInWindow(log, startDaysAgo, endDaysAgo) {
	const now = Date.now();
	const start = now - startDaysAgo * 24 * 60 * 60 * 1000;
	const end = now - endDaysAgo * 24 * 60 * 60 * 1000;
	const best = {};
	let count = 0;
	for (const entry of log) {
		if (entry.weight == null || entry.reps == null) continue;
		const key = entryKey(entry);
		const cur = best[key];
		const isPR =
			!cur ||
			entry.weight > cur.weight ||
			(entry.weight === cur.weight && entry.reps > cur.reps);
		if (isPR) {
			best[key] = { weight: entry.weight, reps: entry.reps };
			const t = new Date(entry.date).getTime();
			if (t >= start && t < end) count++;
		}
	}
	return count;
}

// Sessions completed within the last `days` days.
export function sessionsInWindow(history, days) {
	const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
	return history.filter((s) => new Date(s.date).getTime() >= cutoff).length;
}

// Current streak = consecutive distinct days with a completed session, counting
// back from today (or yesterday).
export function currentStreak(history) {
	if (history.length === 0) return 0;
	const dayKeys = new Set(
		history.map((s) => new Date(s.date).toISOString().slice(0, 10))
	);
	let streak = 0;
	const cursor = new Date();
	// allow the streak to be "alive" if they haven't trained yet today
	if (!dayKeys.has(cursor.toISOString().slice(0, 10))) {
		cursor.setDate(cursor.getDate() - 1);
	}
	while (dayKeys.has(cursor.toISOString().slice(0, 10))) {
		streak++;
		cursor.setDate(cursor.getDate() - 1);
	}
	return streak;
}

// Total estimated weight moved across all logged record sets (fun lifetime stat).
export function totalVolumeLifted(log) {
	return log.reduce(
		(sum, e) => sum + (e.weight != null && e.reps != null ? e.weight * e.reps : 0),
		0
	);
}

// Biggest e1RM gain over the last `days` days: compares each record's best
// e1RM now vs its best e1RM before the window. Returns the top mover or null.
export function biggestGain(log, days = 60) {
	const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
	const before = {};
	const after = {};
	for (const e of log) {
		if (e.weight == null || e.reps == null) continue;
		const key = entryKey(e);
		const est = estimatedOneRepMax(e.weight, e.reps);
		const t = new Date(e.date).getTime();
		if (t < cutoff) before[key] = Math.max(before[key] ?? 0, est);
		else after[key] = Math.max(after[key] ?? 0, est);
	}
	let top = null;
	for (const key of Object.keys(after)) {
		const base = before[key];
		if (!base) continue; // need a baseline to measure a gain
		const gain = after[key] - base;
		if (gain > 0 && (!top || gain > top.gain)) {
			top = { key, gain, from: base, to: after[key] };
		}
	}
	return top;
}

// Display name for any logged exercise id (primary, alternative, or legacy).
export function exerciseName(id) {
	return exerciseIndex[id]?.name ?? id;
}

// Display label for a movement::method record key, e.g. "Cable Lateral Raise"
// or "Cable Lateral Raise · volume".
export function recordLabel(key) {
	const [movement, method] = key.split('::');
	const name = movementName(movement);
	if (method === 'volume') return `${name} · volume`;
	if (method === 'myorep') return `${name} · myorep`;
	return name;
}

// --- Actions ---

// Log a single set for an exercise. The movement + method come from the
// exercise definition so the set lands in the right shared record bucket.
export function updateRecord(exerciseId, weight, reps) {
	const movement = movementForId(exerciseId);
	const method = exerciseIndex[exerciseId]?.method ?? 'straight';
	workoutLog.update(($log) => [
		...$log,
		{
			date: new Date().toISOString(),
			exerciseId,
			movement,
			method,
			weight: parseFloat(weight),
			reps: parseInt(reps)
		}
	]);
}

// Correct a previously logged set. `entry` must be the same object instance
// held in the log (pass entries straight from the store, e.g. via
// getExerciseHistory). Matched by reference so duplicate weight/rep/date rows
// stay distinct.
export function editLogEntry(entry, weight, reps) {
	const w = parseFloat(weight);
	const r = parseInt(reps);
	if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) return;
	workoutLog.update(($log) =>
		$log.map((e) => (e === entry ? { ...e, weight: w, reps: r } : e))
	);
}

// Remove a logged set (e.g. one entered by mistake). Matched by reference, see
// editLogEntry.
export function deleteLogEntry(entry) {
	workoutLog.update(($log) => $log.filter((e) => e !== entry));
}

// Tick an exercise as completed (trained, no new record). Tracked by slot id.
export function markCompleted(slotId, exerciseId) {
	completionLog.update(($log) => [
		...$log,
		{ date: new Date().toISOString(), exerciseId: exerciseId ?? slotId }
	]);
}

export function startSession(dayIndex) {
	activeSession.set({
		dayIndex,
		startedAt: new Date().toISOString(),
		completedExercises: []
	});
}

export function markExerciseComplete(slotId) {
	activeSession.update(($s) => {
		if (!$s) return $s;
		if ($s.completedExercises.includes(slotId)) return $s;
		return {
			...$s,
			completedExercises: [...$s.completedExercises, slotId]
		};
	});
}

export function completeSession(dayIndex, prCount) {
	sessionHistory.update(($h) => [
		...$h,
		{
			date: new Date().toISOString(),
			dayIndex,
			exerciseCount: program[dayIndex].exercises.length,
			prCount
		}
	]);

	// Advance to next day
	currentDayIndex.update(($i) => ($i + 1) % program.length);

	// Clear active session
	activeSession.set(null);
}
