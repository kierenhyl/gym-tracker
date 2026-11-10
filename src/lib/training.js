// Per-movement training configuration: which bands each movement may be
// trained in, the per-set rep range each band targets, and which muscles a
// movement works indirectly. See docs/training-model.md for the reasoning.

import { BANDS, BAND_ORDER, classifyBand, nearestEligibleBand } from './bands.js';

// The low-rep band is allowed only where the setup is stable and a
// near-maximal effort does not depend on stabilisers, balance, or spinal
// position. This is a safety rule, not a preference. Custom variants are
// never in this list.
export const HEAVY_ELIGIBLE = new Set([
	'smith-bench-press',
	'machine-chest-press',
	'machine-shoulder-press',
	'smith-shoulder-press',
	'machine-incline-press',
	'chest-supported-row',
	'machine-row',
	'neutral-pulldown',
	'wide-pulldown',
	'hack-squat',
	'leg-press',
	'belt-squat',
	'machine-hip-thrust'
]);

// Indirect work, counted at half a set on the Stats tab. Pressing works the
// triceps and front delts; rows and pulldowns work the biceps and rear delts;
// squat patterns work the glutes. A movement never counts indirectly towards
// its own direct muscle.
const PRESS = ['Triceps', 'Front Delts'];
const PULL = ['Biceps', 'Rear Delts'];
const SQUAT = ['Glutes'];
export const INDIRECT_MUSCLES = {
	'smith-bench-press': PRESS,
	'machine-chest-press': PRESS,
	'machine-incline-press': PRESS,
	'incline-db-press': PRESS,
	'machine-shoulder-press': PRESS,
	'smith-shoulder-press': PRESS,
	'chest-supported-row': PULL,
	'machine-row': PULL,
	'seated-cable-row': PULL,
	'neutral-pulldown': PULL,
	'wide-pulldown': PULL,
	'half-kneel-pulldown': PULL,
	'hack-squat': SQUAT,
	'leg-press': SQUAT,
	'belt-squat': SQUAT
};
export const INDIRECT_WEIGHT = 0.5;

export function indirectMusclesFor(movement, directMuscle) {
	return (INDIRECT_MUSCLES[movement] ?? []).filter((m) => m !== directMuscle);
}

// "8-12" / "10-15 each side" -> [8, 12]
export function parseRepRange(repRange) {
	const nums = String(repRange ?? '').match(/\d+/g);
	if (!nums || nums.length === 0) return null;
	const lo = parseInt(nums[0], 10);
	const hi = nums.length > 1 ? parseInt(nums[1], 10) : lo;
	return [lo, hi];
}

// The band a prescribed range naturally sits in, by its midpoint.
function bandForRange(range) {
	if (!range) return 'moderate';
	return classifyBand(Math.round((range[0] + range[1]) / 2)) ?? 'moderate';
}

// Old `method` conflated set structure with rep band. Only rows logged before
// myo-reps were retired carry 'myorep'; everything is straight now.
export function structureFor(method) {
	return method === 'myorep' ? 'myorep' : 'straight';
}

// band: the slot's declared band (heavy slots say 'heavy'). Without one, the
// band the range sits in. The programmed band gets the programmed per-set
// range; other bands, or a fallback when the programmed band is not allowed
// on this movement, use the band's default range.
export function bandConfigFor(movement, repRange, sets = 3, band = null) {
	const range = parseRepRange(repRange);
	const preferred = band ?? bandForRange(range);
	const eligible = BAND_ORDER.filter((b) => b !== 'heavy' || HEAVY_ELIGIBLE.has(movement));
	const defaultBand = eligible.includes(preferred)
		? preferred
		: nearestEligibleBand(preferred, eligible);

	const ranges = {};
	for (const b of eligible) {
		ranges[b] = b === preferred && range ? range : [...BANDS[b].perSet];
	}

	return { bands: eligible, defaultBand, ranges, sets: Math.max(1, Number(sets) || 1) };
}

// Attach the derived training model to a raw programme slot.
export function withTrainingModel(slot) {
	return { ...slot, ...bandConfigFor(slot.movement, slot.repRange, slot.sets, slot.band) };
}
