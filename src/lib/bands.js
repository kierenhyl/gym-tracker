// Rep bands and how a session is scored.
//
// A session is a fixed number of sets (the programmed `sets`), each stopping
// 1-2 reps short of failure. Each set has a per-set rep range, and the band
// says which range: Low for the two heavy lifts a day, Normal or High for
// everything else.
//
// The band is *declared*, not derived: the band picked on the card (or the
// slot's own) is the band the session is filed under, so a heavy day and a
// light day of the same movement keep separate histories.
//
// Keys stay 'heavy' / 'moderate' / 'volume' because every stored entry already
// carries them. Only the labels changed.

// `perSet` is the default per-set range, used when a band is not the one the
// programme wrote a range for. `min`/`max` only classify old rows logged
// before bands were declared. `step` is kept for old total-rep rows.
export const BANDS = {
	heavy: { key: 'heavy', label: 'LOW', min: 1, max: 5, perSet: [4, 8], step: 1 },
	moderate: { key: 'moderate', label: 'NORMAL', min: 6, max: 15, perSet: [8, 12], step: 2 },
	volume: { key: 'volume', label: 'HIGH', min: 16, max: Infinity, perSet: [16, 20], step: 3 }
};

export const BAND_ORDER = ['heavy', 'moderate', 'volume'];

// Which band a number of reps per set falls into. Only used to file sessions
// logged before bands were declared, from their average reps per set.
export function classifyBand(reps) {
	const r = Number(reps);
	if (!r || r < 1) return null;
	if (r <= BANDS.heavy.max) return 'heavy';
	if (r <= BANDS.moderate.max) return 'moderate';
	return 'volume';
}

export function bandLabel(band) {
	return BANDS[band]?.label ?? String(band ?? '').toUpperCase();
}

// Snap a band to the nearest one the exercise is actually allowed to train.
export function nearestEligibleBand(band, eligible) {
	if (!eligible || eligible.length === 0 || eligible.includes(band)) return band;
	const i = BAND_ORDER.indexOf(band);
	if (i === -1) return eligible[0];
	let best = eligible[0];
	let bestDist = Infinity;
	for (const b of eligible) {
		const d = Math.abs(BAND_ORDER.indexOf(b) - i);
		if (d < bestDist) {
			bestDist = d;
			best = b;
		}
	}
	return best;
}

// Per-set bucket, kept for rows stored before sessions were totals. The
// migration in store.js still stamps it; nothing ranks on it any more.
export function bucketFor(entry, eligible) {
	if (!entry) return null;
	if (entry.bucket) return entry.bucket;
	if (entry.structure === 'myorep') return 'myo';
	const band = classifyBand(entry.reps);
	return band ? nearestEligibleBand(band, eligible) : null;
}

// --- Scoring ---

// A session ranks by weight × total reps within its band (for a set-by-set
// session, the reps of every set at its main weight). At the same weight
// more reps wins; at the same total a heavier weight wins.
export function sessionScore(weight, total) {
	return (Number(weight) || 0) * (Number(total) || 0);
}

// The reps a stored row contributes. Old myo-rep rows kept the activation set
// in `reps` and the whole effort in `totalReps`.
export function repsOf(entry) {
	return entry?.totalReps ?? entry?.reps ?? 0;
}
