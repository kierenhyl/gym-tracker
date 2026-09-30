// Per-movement training configuration: which bands each movement may be
// trained in, and the total-rep range each band targets. See
// docs/training-model.md for the reasoning.

import { BANDS, BAND_ORDER, classifyBand, nearestEligibleBand } from './bands.js';

// The low-rep band is allowed only where the setup is stable and a
// near-maximal effort does not depend on stabilisers, balance, or spinal
// position. This is a safety rule, not a preference.
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

// One leg exercise per day is a deliberate recovery choice (asserted by
// scripts/verify-program.js). The weekly hard-set guardrail must not report
// these muscles as under-dosed.
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

// Old `method` conflated set structure with rep band. Only rows logged before
// myo-reps were retired carry 'myorep'; everything is straight now.
export function structureFor(method) {
	return method === 'myorep' ? 'myorep' : 'straight';
}

// The band the programme's own range sits in gets that range verbatim — the
// band is declared now, so there is nothing to clamp against. Other bands use
// their default per-set range. Either way the target is a total: sets × range.
export function bandConfigFor(movement, repRange, sets = 3) {
	const range = parseRepRange(repRange);
	const preferred = bandForRange(range);
	const eligible = BAND_ORDER.filter((b) => b !== 'heavy' || HEAVY_ELIGIBLE.has(movement));
	const defaultBand = eligible.includes(preferred)
		? preferred
		: nearestEligibleBand(preferred, eligible);
	const n = Math.max(1, Number(sets) || 1);

	const targetTotals = {};
	for (const band of eligible) {
		const [lo, hi] = band === defaultBand && range ? range : BANDS[band].perSet;
		targetTotals[band] = [lo * n, hi * n];
	}

	return { bands: eligible, defaultBand, targetTotals };
}

// Attach the derived training model to a raw programme slot.
export function withTrainingModel(slot) {
	return { ...slot, ...bandConfigFor(slot.movement, slot.repRange, slot.sets) };
}
