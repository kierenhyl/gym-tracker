// Rep bands and how a session is scored.
//
// A session is one number per exercise: the weight, and the total reps you
// reached at it across as many sets as you needed (no more than MAX_SETS).
// Every set is taken to failure, so the set count follows from fatigue rather
// than being chosen up front.
//
// The band is *declared*, not derived. When sets were fixed at three, reps per
// set told you the band. With a free set count they do not: 25 reps as five
// sets of five would read as heavy work. So the band you pick on the card is
// the band the session is filed under.
//
// Keys stay 'heavy' / 'moderate' / 'volume' because every stored entry already
// carries them. Only the labels changed.

export const MAX_SETS = 5;

// `perSet` is the rep range a band's default target is built from: the total
// range is programme sets × perSet. `step` is how many total reps a session
// adds while inside the range — bigger totals move in bigger steps.
export const BANDS = {
	heavy: { key: 'heavy', label: 'LOW', min: 1, max: 5, perSet: [3, 5], step: 1 },
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

// A session ranks by weight × total reps within its band. At the same weight
// more reps wins; at the same total a heavier weight wins.
export function sessionScore(weight, total) {
	return (Number(weight) || 0) * (Number(total) || 0);
}

// The reps a stored row contributes. Old myo-rep rows kept the activation set
// in `reps` and the whole effort in `totalReps`.
export function repsOf(entry) {
	return entry?.totalReps ?? entry?.reps ?? 0;
}
