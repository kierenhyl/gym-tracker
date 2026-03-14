import { writable, derived } from 'svelte/store';
import { program } from './program.js';

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
		localStorage.setItem(key, JSON.stringify(val));
	});
	return store;
}

// --- Stores ---

// Which day in the 5-day cycle (0-indexed)
export const currentDayIndex = persist(
	'gym_currentDay',
	writable(loadJSON('gym_currentDay', 0))
);

// All logged sets: { date, dayIndex, exerciseId, setNumber, weight, reps, isMyoRepActivation }
export const workoutLog = persist(
	'gym_log',
	writable(loadJSON('gym_log', []))
);

// Current session in progress: { dayIndex, exerciseId, sets: [...] }
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

// PRs per exercise: { exerciseId: { weight, reps, date } }
export const personalRecords = derived(workoutLog, ($log) => {
	const prs = {};
	for (const entry of $log) {
		const current = prs[entry.exerciseId];
		// PR = heaviest weight. If same weight, more reps wins.
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

// Get all sets for a specific exercise from the log
export function getExerciseHistory(exerciseId) {
	return derived(workoutLog, ($log) =>
		$log.filter((e) => e.exerciseId === exerciseId)
	);
}

// --- Actions ---

export function logSet(exerciseId, weight, reps, isMyoRepActivation = false) {
	workoutLog.update(($log) => [
		...$log,
		{
			date: new Date().toISOString(),
			dayIndex: null, // set on session complete
			exerciseId,
			weight: parseFloat(weight),
			reps: parseInt(reps),
			isMyoRepActivation
		}
	]);
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

export function startSession(dayIndex) {
	activeSession.set({
		dayIndex,
		startedAt: new Date().toISOString(),
		completedExercises: []
	});
}

export function markExerciseComplete(exerciseId) {
	activeSession.update(($s) => {
		if (!$s) return $s;
		return {
			...$s,
			completedExercises: [...$s.completedExercises, exerciseId]
		};
	});
}
