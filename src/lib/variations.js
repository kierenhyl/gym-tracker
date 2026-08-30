// Alternate stations for when the one you want is taken.
//
// These are suggestions only — nothing is created until you tap one, so your
// picker holds what you actually use rather than a catalogue. Tapping goes
// through `addCustomVariant`, which gives each one its own movement key, so a
// different machine keeps its own records. That is the point: two cable
// stations wired differently are not the same load.
//
// Deliberately not in `program.js`: `verify-program.js` asserts every exercise
// has zero `alternatives`, and the programme should stay a statement of what
// you train, not what you might substitute.
//
// Nothing here is heavy-eligible. A custom variant's movement key never
// appears in `HEAVY_ELIGIBLE` (training.js), which is correct — heavy work is
// restricted to stable, supported setups, and a substitution you made on the
// fly because the gym was busy is not the place to test a near-maximal single.

export const SUGGESTED_VARIATIONS = {
	// Chest
	'smith-bench-press': ['Machine chest press', 'Flat barbell bench'],
	'machine-incline-press': ['Incline smith press', 'Incline dumbbell press'],
	'incline-db-press': ['Incline machine press', 'Incline smith press'],
	'pec-deck': ['Cable fly', 'Machine chest press'],

	// Back
	'chest-supported-row': ['Seated cable row', 'Machine row'],
	'machine-row': ['Seated cable row', 'Chest-supported row'],
	'neutral-pulldown': ['Wide-grip pulldown', 'Assisted pull-up'],
	'half-kneel-pulldown': ['Single-arm cable pulldown', 'Straight-arm pulldown'],

	// Shoulders
	'machine-shoulder-press': ['Smith shoulder press', 'Seated dumbbell press'],
	'cable-lateral-raise': ['Dumbbell lateral raise', 'Machine lateral raise'],
	'reverse-pec-deck': ['Reverse cable crossover', 'Dumbbell rear delt fly'],
	'reverse-cable-crossover': ['Reverse pec deck', 'Dumbbell rear delt fly'],

	// Arms
	'overhead-cable-triceps': ['Overhead dumbbell extension', 'Cable pushdown'],
	'overhead-db-triceps': ['Overhead cable extension', 'Cable pushdown'],
	'triceps-pushdown': ['Rope pushdown', 'Overhead cable extension'],
	'bayesian-curl': ['Incline dumbbell curl', 'Cable curl'],
	'incline-db-curl': ['Bayesian cable curl', 'Preacher curl'],
	'hammer-curl': ['Rope hammer curl', 'Cable hammer curl'],

	// Legs
	'hack-squat': ['Leg press', 'Smith machine squat'],
	'leg-extension': ['Sissy squat', 'Leg press (quad bias)'],
	'seated-ham-curl': ['Lying ham curl', 'Romanian deadlift'],
	'machine-hip-thrust': ['Barbell hip thrust', 'Cable pull-through'],
	'standing-calf-raise': ['Seated calf raise', 'Leg press calf raise'],

	// Core
	'cable-crunch': ['Machine crunch', 'Hanging knee raise'],
	'ab-crunch': ['Cable crunch', 'Hanging knee raise'],
	'pallof-press': ['Cable anti-rotation hold', 'Suitcase carry']
};

// Suggestions for a slot, minus anything already in the picker — comparing on
// name so a suggestion you added by hand does not come back as a suggestion.
export function suggestionsFor(movement, existingVariants = []) {
	const taken = new Set(existingVariants.map((v) => v.name?.trim().toLowerCase()));
	return (SUGGESTED_VARIATIONS[movement] ?? []).filter((name) => !taken.has(name.toLowerCase()));
}
