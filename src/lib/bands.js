// Rep bands, set structures, and how a set is scored.
//
// The core idea: a set's *band* is derived from the reps you actually did, not
// declared up front. That means a hard 10 x 90kg day lands in the moderate
// band and is compared against your best moderate work — it is never judged
// against a heavy single-digit PR it was never trying to beat.
//
// Two independent axes:
//   band       derived from reps  — heavy / moderate / volume
//   structure  declared           — straight / myorep
//
// Records bucket by movement + bucket, where bucket is the band for straight
// sets and 'myo' for myo-reps (a myo-rep set is a different animal and must
// never be compared to a straight set).

// Boundaries are tuned to the actual programme, not the other way round.
// With a 6-12 moderate band, 18 of the programme's 26 movements had a
// prescribed rep range straddling a boundary (10-15 and 8-15 are everywhere).
// Moving the line to 15 leaves 4 straddlers, all of them myo-rep movements,
// which are bucketed separately anyway — so in practice nothing straddles.
export const BANDS = {
	heavy: { key: 'heavy', label: 'HEAVY', min: 1, max: 5, defaultTarget: [3, 5] },
	moderate: { key: 'moderate', label: 'MODERATE', min: 6, max: 15, defaultTarget: [8, 12] },
	volume: { key: 'volume', label: 'VOLUME', min: 16, max: Infinity, defaultTarget: [16, 20] }
};

export const BAND_ORDER = ['heavy', 'moderate', 'volume'];

// Which band a set falls into, based purely on reps performed.
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
// A 5-rep set on an exercise with no heavy band is a heavy-ish moderate set —
// it must not vanish into a bucket that exercise never uses.
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

// The record bucket a set belongs to. Myo-reps get their own track per
// movement regardless of rep count. `eligible` is the exercise's allowed bands.
export function bucketFor(entry, eligible) {
	if (!entry) return null;
	if (entry.bucket) return entry.bucket;
	if (entry.structure === 'myorep') return 'myo';
	const band = classifyBand(entry.reps);
	return band ? nearestEligibleBand(band, eligible) : null;
}

export const BUCKET_LABELS = {
	heavy: 'HEAVY',
	moderate: 'MODERATE',
	volume: 'VOLUME',
	myo: 'MYO-REP'
};

export function bucketLabel(bucket) {
	return BUCKET_LABELS[bucket] ?? String(bucket ?? '').toUpperCase();
}

// --- Scoring ---

// Epley estimated 1RM. It inflates badly at high rep counts, so reps are
// clamped at 12 for the estimate. The moderate band now runs to 15, and a set
// of 15 must not score as a bigger 1RM than it really represents.
export const E1RM_REP_CAP = 12;

export function estimatedOneRepMax(weight, reps) {
	const w = Number(weight);
	const r = Math.min(Number(reps) || 0, E1RM_REP_CAP);
	if (!w || !r) return 0;
	return w * (1 + r / 30);
}

export function tonnage(weight, reps) {
	return (Number(weight) || 0) * (Number(reps) || 0);
}

// How a set is ranked within its bucket.
//   heavy / moderate -> estimated 1RM (so 10 x 90 correctly beats 4 x 100)
//   volume / myo     -> total tonnage (load x reps done)
export function scoreFor(bucket, weight, reps) {
	if (bucket === 'volume' || bucket === 'myo') return tonnage(weight, reps);
	return estimatedOneRepMax(weight, reps);
}

export function scoreLabel(bucket) {
	return bucket === 'volume' || bucket === 'myo' ? 'total load' : 'est. 1RM';
}

// Format a score for display (kg for e1RM, raw tonnage otherwise).
export function formatScore(bucket, score) {
	if (!score) return '—';
	if (bucket === 'volume' || bucket === 'myo') return `${Math.round(score)}`;
	return `${Math.round(score * 10) / 10}kg`;
}

// The reps a set contributes for progression purposes. Myo-reps progress on
// total effective reps (activation set plus every mini-set).
export function effectiveReps(entry) {
	if (entry?.structure === 'myorep' && entry.totalReps != null) return entry.totalReps;
	return entry?.reps ?? 0;
}
