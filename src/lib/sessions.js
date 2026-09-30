// One row per exercise performance, whichever way it was logged.
//
// New sessions are stored as a single row: the weight and the total reps
// reached. Everything logged before that is a row per set. Rather than rewrite
// stored data, both are read through here, so the log itself is never touched
// and a backup taken before this change restores cleanly.
//
// Converting a set-by-set session:
//   total  the reps of every set at the main weight, added up — 9, 8, 7 is 24.
//          Old myo-rep rows already carry the whole effort in `totalReps`.
//   weight the weight most sets used (the heaviest on a tie), so a lighter
//          back-off set does not drag the session down or pad its total.
//   band   the average reps per set, snapped to a band the exercise allows.
//          Old myo-rep sessions go to the exercise's default band: their reps
//          per set say nothing about the band they were aiming at.

import { classifyBand, nearestEligibleBand, repsOf, sessionScore } from './bands.js';

const dayKey = (iso) => String(iso).slice(0, 10);

function mainWeight(rows) {
	const counts = new Map();
	for (const r of rows) counts.set(r.weight, (counts.get(r.weight) ?? 0) + 1);
	let best = null;
	for (const [w, n] of counts) {
		if (best == null || n > counts.get(best) || (n === counts.get(best) && w > best)) best = w;
	}
	return best;
}

// log:      raw workoutLog entries
// movementOf(entry) -> movement key
// configOf(entry)   -> { bands, defaultBand } for the entry's exercise
export function toSessions(log, movementOf, configOf) {
	const out = [];
	const groups = new Map();

	for (const entry of log) {
		if (entry.weight == null || entry.reps == null) continue;
		const movement = movementOf(entry);
		if (entry.format === 'total') {
			out.push({
				date: entry.date,
				movement,
				exerciseId: entry.exerciseId,
				weight: entry.weight,
				total: entry.reps,
				band: entry.band,
				sets: null,
				converted: false,
				entries: [entry]
			});
			continue;
		}
		const id = entry.setGroupId ?? `${movement}::${dayKey(entry.date)}`;
		const key = `${movement}::${id}`;
		if (!groups.has(key)) groups.set(key, { movement, rows: [] });
		groups.get(key).rows.push(entry);
	}

	for (const { movement, rows } of groups.values()) {
		const weight = mainWeight(rows);
		const used = rows.filter((r) => r.weight === weight);
		const total = used.reduce((sum, r) => sum + repsOf(r), 0);
		if (!total) continue;
		const { bands, defaultBand } = configOf(rows[0]);
		const myo = used.some((r) => r.structure === 'myorep' || r.totalReps != null);
		const band = myo
			? defaultBand
			: nearestEligibleBand(classifyBand(Math.round(total / used.length)), bands);
		out.push({
			date: rows[0].date,
			movement,
			exerciseId: rows[0].exerciseId,
			weight,
			total,
			band,
			sets: myo ? null : used.length,
			converted: true,
			entries: rows
		});
	}

	for (const s of out) s.score = sessionScore(s.weight, s.total);
	return out.sort((a, b) => new Date(a.date) - new Date(b.date));
}
