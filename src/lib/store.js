import { writable, derived, get } from 'svelte/store';
import { program, slotVariants, exerciseIndex } from './program.js';

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

// All record updates: { date, exerciseId, weight, reps }
// (Older entries may also carry dayIndex / isMyoRepActivation — ignored here.)
export const workoutLog = persist(
	'gym_log',
	writable(loadJSON('gym_log', []))
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

// Strength PRs per exercise: { exerciseId: { weight, reps, date } }
// PR = heaviest weight. If same weight, more reps wins.
export const personalRecords = derived(workoutLog, ($log) => {
	const prs = {};
	for (const entry of $log) {
		if (entry.weight == null || entry.reps == null) continue;
		const current = prs[entry.exerciseId];
		if (
			!current ||
			entry.weight > current.weight ||
			(entry.weight === current.weight && entry.reps > current.reps)
		) {
			prs[entry.exerciseId] = {
				weight: entry.weight,
				reps: entry.reps,
				date: entry.date
			};
		}
	}
	return prs;
});

// Volume PRs per exercise: { exerciseId: { weight, reps, volume, date } }
// PR = highest total volume (weight x reps).
export const volumePRs = derived(workoutLog, ($log) => {
	const prs = {};
	for (const entry of $log) {
		if (entry.weight == null || entry.reps == null) continue;
		const volume = entry.weight * entry.reps;
		const current = prs[entry.exerciseId];
		if (!current || volume > current.volume) {
			prs[entry.exerciseId] = {
				weight: entry.weight,
				reps: entry.reps,
				volume,
				date: entry.date
			};
		}
	}
	return prs;
});

function daysBetween(iso, now = Date.now()) {
	return (now - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

// Records that have gone stale (older than STALE_DAYS). Returns
// { [exerciseId]: daysSince } for any exercise whose record is overdue.
export const staleRecords = derived([personalRecords, volumePRs], ([$prs, $vol]) => {
	const stale = {};
	const now = Date.now();
	const seen = new Set([...Object.keys($prs), ...Object.keys($vol)]);
	for (const id of seen) {
		const date = $prs[id]?.date ?? $vol[id]?.date;
		if (!date) continue;
		const days = daysBetween(date, now);
		if (days >= STALE_DAYS) stale[id] = Math.floor(days);
	}
	return stale;
});

// Get all sets for a specific exercise from the log (chronological)
export function getExerciseHistory(exerciseId) {
	return derived(workoutLog, ($log) =>
		$log.filter((e) => e.exerciseId === exerciseId && e.weight != null)
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

// Per-exercise progression: chronological points of e1RM (and volume) for charts.
export function exerciseProgress(log, exerciseId) {
	return log
		.filter((e) => e.exerciseId === exerciseId && e.weight != null)
		.map((e) => ({
			date: e.date,
			weight: e.weight,
			reps: e.reps,
			e1rm: estimatedOneRepMax(e.weight, e.reps),
			volume: e.weight * e.reps
		}));
}

// PRs achieved within the last `days` days (a record entry that was a best at the
// time it was logged). Returns newest-first list of { exerciseId, weight, reps, date }.
export function recentPRs(log, days = 30) {
	const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
	const best = {}; // running best weight/reps as we walk forward
	const prs = [];
	for (const entry of log) {
		if (entry.weight == null || entry.reps == null) continue;
		const cur = best[entry.exerciseId];
		const isPR =
			!cur ||
			entry.weight > cur.weight ||
			(entry.weight === cur.weight && entry.reps > cur.reps);
		if (isPR) {
			best[entry.exerciseId] = { weight: entry.weight, reps: entry.reps };
			if (new Date(entry.date).getTime() >= cutoff) {
				prs.push({
					exerciseId: entry.exerciseId,
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
		const cur = best[entry.exerciseId];
		const isPR =
			!cur ||
			entry.weight > cur.weight ||
			(entry.weight === cur.weight && entry.reps > cur.reps);
		if (isPR) {
			best[entry.exerciseId] = { weight: entry.weight, reps: entry.reps };
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

// Biggest e1RM gain over the last `days` days: compares each exercise's best
// e1RM now vs its best e1RM before the window. Returns the top mover or null.
export function biggestGain(log, days = 60) {
	const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
	const before = {};
	const after = {};
	for (const e of log) {
		if (e.weight == null || e.reps == null) continue;
		const est = estimatedOneRepMax(e.weight, e.reps);
		const t = new Date(e.date).getTime();
		if (t < cutoff) before[e.exerciseId] = Math.max(before[e.exerciseId] ?? 0, est);
		else after[e.exerciseId] = Math.max(after[e.exerciseId] ?? 0, est);
	}
	let top = null;
	for (const id of Object.keys(after)) {
		const base = before[id];
		if (!base) continue; // need a baseline to measure a gain
		const gain = after[id] - base;
		if (gain > 0 && (!top || gain > top.gain)) {
			top = { exerciseId: id, gain, from: base, to: after[id] };
		}
	}
	return top;
}

// Display name for any logged exercise id (primary, alternative, or legacy).
export function exerciseName(id) {
	return exerciseIndex[id]?.name ?? id;
}

// --- Actions ---

// Set the two numbers for an exercise: a single record entry.
export function updateRecord(exerciseId, weight, reps) {
	workoutLog.update(($log) => [
		...$log,
		{
			date: new Date().toISOString(),
			exerciseId,
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
