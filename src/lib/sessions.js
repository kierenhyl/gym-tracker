// One row per exercise performance, whichever way it was logged.
//
// Three shapes are in the log, and none is ever rewritten:
//
//   format 'set'    the current model: a row per set, sharing a setGroupId,
//                   with the band declared. Read as a per-set session
//                   (`perSet: true`, `reps` = reps of each set at the main
//                   weight). Only these drive progression.
//   format 'total'  one row: a weight and the total reps reached under the
//                   old "every set to failure" model.
//   no format       older set-by-set rows. Grouped by setGroupId, or by
//                   movement and day before grouping existed.
//
// The old shapes (`perSet: false`) still count for records and history and
// show as a reference, but their sets went to failure, so a target built on
// them would push back to failure.
//
// Converting old set-by-set rows:
//   total  the reps of every set at the main weight, added up — 9, 8, 7 is 24.
//          Old myo-rep rows already carry the whole effort in `totalReps`.
//   weight the weight most sets used (the heaviest on a tie), so a lighter
//          back-off set does not drag the session down or pad its total.
//   band   the average reps per set, snapped to a band the exercise allows.
//          Old myo-rep sessions go to the exercise's default band: their reps
//          per set say nothing about the band they were aiming at.

import { classifyBand, nearestEligibleBand, repsOf, sessionScore } from './bands.js';

const dayKey = (iso) => String(iso).slice(0, 10);

export function mainWeight(rows) {
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
				reps: null,
				band: entry.band,
				sets: null,
				perSet: false,
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
		if (rows.every((r) => r.format === 'set')) {
			const ordered = [...used].sort((a, b) => (a.setIndex ?? 0) - (b.setIndex ?? 0));
			out.push({
				date: rows[0].date,
				movement,
				exerciseId: rows[0].exerciseId,
				weight,
				total,
				reps: ordered.map((r) => r.reps),
				band: rows[0].band,
				sets: used.length,
				perSet: true,
				converted: false,
				entries: rows
			});
			continue;
		}
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
			reps: myo ? null : used.map((r) => r.reps),
			band,
			sets: myo ? null : used.length,
			perSet: false,
			converted: true,
			entries: rows
		});
	}

	for (const s of out) s.score = sessionScore(s.weight, s.total);
	return out.sort((a, b) => new Date(a.date) - new Date(b.date));
}

// One session as a short line: `80 × 6, 6, 5`, or `80 × 25 total` for an old
// total-rep session.
export function formatSession(s) {
	if (!s) return '';
	return s.reps?.length ? `${s.weight} × ${s.reps.join(', ')}` : `${s.weight} × ${s.total} total`;
}
