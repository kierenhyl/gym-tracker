// Per-movement training configuration: which rep bands each movement may be
// trained in, how big its smallest load step is, and which movements can only
// realistically progress on reps. See docs/training-model.md for the reasoning.

import { BANDS, BAND_ORDER, classifyBand, nearestEligibleBand } from './bands.js';

// Heavy work (1-5 reps) is allowed only where the setup is stable and a
// near-maximal effort does not depend on stabilisers, balance, or spinal
// position. This is a safety rule, not a preference.
//
// The programme itself never prescribes heavy work — its lowest range is 6-10 —
// so the heavy band is only ever reached through a deliberate heavy test.
export const HEAVY_ELIGIBLE = new Set([
	'smith-bench-press',
	'machine-shoulder-press',
	'machine-incline-press',
	'chest-supported-row',
	'machine-row',
	'neutral-pulldown',
	'hack-squat',
	'machine-hip-thrust'
]);

const BAR = 2.5;
const DUMBBELL = 2.5;
const PLATE = 5;
const STACK = 5;

export const LOAD_INCREMENTS = {
	'smith-bench-press': BAR,
	'incline-db-press': DUMBBELL,
	'incline-db-curl': DUMBBELL,
	'hammer-curl': DUMBBELL,
	'overhead-db-triceps': DUMBBELL,
	'hack-squat': PLATE,
	'machine-hip-thrust': PLATE,
	'chest-supported-row': PLATE
};

export const DEFAULT_INCREMENT = STACK;

export function incrementFor(movement) {
	return LOAD_INCREMENTS[movement] ?? DEFAULT_INCREMENT;
}

// On these movements the smallest available stack step is 30-50% of the working
// load (5kg on a 10-15kg lateral raise), so single-step load progression is not
// really available. They progress on reps across a deliberately wide range, and
// a load step is treated as an event that resets reps sharply rather than a
// routine +1.
export const REP_PROGRESSION_ONLY = new Set([
	'cable-lateral-raise',
	'reverse-pec-deck',
	'reverse-cable-crossover',
	'pec-deck'
]);

// One leg exercise per day at exactly one set is a deliberate recovery choice
// (asserted by scripts/verify-program.js). The weekly hard-set guardrail must
// not report these muscles as under-dosed.
export const GUARDRAIL_EXEMPT_MUSCLES = new Set(['Quads', 'Hamstrings', 'Glutes', 'Calves']);

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

function clampToBand(range, band) {
	const { min, max } = BANDS[band];
	const lo = Math.max(min, Math.min(range[0], max === Infinity ? range[0] : max));
	const hi = Math.max(lo, Math.min(range[1], max === Infinity ? range[1] : max));
	return [lo, hi];
}

// Old `method` conflated set structure with rep band. Split it: 'myorep' is a
// set structure, everything else is a straight set whose band comes from the
// reps actually performed.
export function structureFor(method) {
	return method === 'myorep' ? 'myorep' : 'straight';
}

// Myo-reps are bucketed on their own track, not by rep band, so their target
// is the programme's range verbatim — clamping it into a band would silently
// rewrite a 12-20 prescription as 16-20.
export function bandConfigFor(movement, repRange, structure = 'straight') {
	const range = parseRepRange(repRange);

	if (structure === 'myorep') {
		return {
			bands: ['myo'],
			defaultBand: 'myo',
			targetReps: { myo: range ?? BANDS.volume.defaultTarget },
			increment: incrementFor(movement),
			repProgressionOnly: REP_PROGRESSION_ONLY.has(movement)
		};
	}

	const preferred = bandForRange(range);
	const eligible = BAND_ORDER.filter((b) => b !== 'heavy' || HEAVY_ELIGIBLE.has(movement));
	const defaultBand = eligible.includes(preferred)
		? preferred
		: nearestEligibleBand(preferred, eligible);

	const targetReps = {};
	for (const band of eligible) {
		targetReps[band] =
			band === defaultBand && range ? clampToBand(range, band) : BANDS[band].defaultTarget;
	}

	return {
		bands: eligible,
		defaultBand,
		targetReps,
		increment: incrementFor(movement),
		repProgressionOnly: REP_PROGRESSION_ONLY.has(movement)
	};
}

// Attach the derived training model to a raw programme slot.
export function withTrainingModel(slot) {
	const structure = structureFor(slot.method);
	return {
		...slot,
		structure,
		...bandConfigFor(slot.movement, slot.repRange, structure)
	};
}
