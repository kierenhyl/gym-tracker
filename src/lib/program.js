// Fixed five-day rolling programme. Warm-up sets are not included in `sets`.
//
// Every set stops 1-2 reps short of failure. The last set of an isolation
// exercise may go to failure. Each exercise has a fixed number of sets: the
// programmed `sets`. See docs/training-model.md.
//
// `heavy: true` marks the two heavy slots each day, done first: 4-8 reps,
// stopping 2 short, filed under the Low band. Main lifts appear twice per
// cycle, heavy and light, under the same movement key in different bands, so
// the two keep separate histories.
//
// The slot itself is the recommended (★) variation. `alternatives` are the
// built-in swaps; each has its own movement key and its own history.

const heavy = { role: 'heavy', effort: 'Stop 2 reps short', rest: '2–3 min' };
const compound = { role: 'compound', effort: 'Stop 1-2 reps short', rest: '2–3 min' };
const isolation = {
	role: 'isolation',
	effort: 'Stop 1-2 reps short; the last set may go to failure',
	rest: '60–120 sec'
};

const H = { heavy: true, band: 'heavy', tag: 'heavy', ...heavy };
const light = { tag: 'light' };

export const program = [
	{
		day: 1,
		name: 'Push Heavy',
		subtitle: '',
		exercises: [
			{ id: 'smith-bench', movement: 'smith-bench-press', name: 'Smith Machine Bench Press', sets: 3, repRange: '4-6', ...H, muscle: 'Chest', type: 'upper', notes: 'Elbows about 45°. Use a controlled, pain-free range and stop before technique breaks.',
				alternatives: [{ id: 'machine-chest-press-d1', movement: 'machine-chest-press', name: 'Machine Chest Press' }] },
			{ id: 'hack-squat', movement: 'hack-squat', name: 'Hack Squat', sets: 3, repRange: '5-8', ...H, muscle: 'Quads', type: 'leg', notes: 'Warm up first, then work at a stable, pain-free depth.',
				alternatives: [{ id: 'leg-press-d1', movement: 'leg-press', name: 'Leg Press' }] },
			{ id: 'cable-lateral-raise', movement: 'cable-lateral-raise', name: 'Cable Lateral Raise', sets: 3, repRange: '12-20', ...isolation, muscle: 'Side Delts', type: 'upper', notes: 'Start cross-body, lead with the elbow and keep momentum out of the movement.',
				alternatives: [{ id: 'machine-lateral-raise-d1', movement: 'machine-lateral-raise', name: 'Machine Lateral Raise' }] },
			{ id: 'overhead-cable-tri', movement: 'overhead-cable-triceps', name: 'Overhead Cable Triceps Extension', sets: 3, repRange: '10-15', ...isolation, muscle: 'Triceps', type: 'upper', notes: 'Use a comfortable stretched position and keep the ribs down.',
				alternatives: [{ id: 'overhead-db-tri-d1', movement: 'overhead-db-triceps', name: 'Overhead Dumbbell Triceps Extension' }] },
			{ id: 'cable-crunch', movement: 'cable-crunch', name: 'Cable Crunch', sets: 2, repRange: '10-15', ...isolation, muscle: 'Abs', type: 'abs', notes: 'Bring the ribs toward the hips without pulling the rope with the arms.' }
		]
	},
	{
		day: 2,
		name: 'Pull Heavy',
		subtitle: '',
		exercises: [
			{ id: 'chest-supported-row', movement: 'chest-supported-row', name: 'Chest-Supported Row', sets: 3, repRange: '5-8', ...H, muscle: 'Back', type: 'upper', notes: 'Let the shoulder blades reach at the bottom, then pull the elbows back.',
				alternatives: [{ id: 'machine-row-d2', movement: 'machine-row', name: 'Machine Row' }] },
			{ id: 'neutral-pulldown', movement: 'neutral-pulldown', name: 'Neutral-Grip Lat Pulldown', sets: 3, repRange: '6-10', ...H, muscle: 'Back', type: 'upper', notes: 'Pull the elbows down toward the ribs with a comfortable grip.',
				alternatives: [{ id: 'wide-pulldown-d2', movement: 'wide-pulldown', name: 'Wide-Grip Lat Pulldown' }] },
			{ id: 'seated-ham-curl', movement: 'seated-ham-curl', name: 'Seated Hamstring Curl', sets: 3, repRange: '8-12', ...isolation, muscle: 'Hamstrings', type: 'leg', notes: 'Warm up first, then control every rep through the lengthened position.',
				alternatives: [{ id: 'lying-leg-curl-d2', movement: 'lying-leg-curl', name: 'Lying Leg Curl' }] },
			{ id: 'reverse-pec-deck', movement: 'reverse-pec-deck', name: 'Reverse Pec Deck', sets: 3, repRange: '12-20', ...isolation, muscle: 'Rear Delts', type: 'upper', notes: 'Keep the chest on the pad and avoid shrugging.',
				alternatives: [{ id: 'reverse-cable-crossover-d2', movement: 'reverse-cable-crossover', name: 'Reverse Cable Crossover' }] },
			{ id: 'bayesian-curl', movement: 'bayesian-curl', name: 'Bayesian Cable Curl', sets: 3, repRange: '10-15', ...isolation, muscle: 'Biceps', type: 'upper', notes: 'Keep the arm behind the torso and control the full range.',
				alternatives: [{ id: 'cable-curl-d2', movement: 'cable-curl', name: 'Cable Curl' }] }
		]
	},
	{
		day: 3,
		name: 'Shoulders & Legs',
		subtitle: '',
		exercises: [
			{ id: 'machine-shoulder-press', movement: 'machine-shoulder-press', name: 'Machine Shoulder Press', sets: 3, repRange: '5-8', ...H, muscle: 'Front Delts', type: 'upper', notes: 'Use a pain-free grip and range; keep the ribs down.',
				alternatives: [{ id: 'smith-shoulder-press-d3', movement: 'smith-shoulder-press', name: 'Smith Shoulder Press' }] },
			{ id: 'leg-press-heavy', movement: 'leg-press', name: 'Leg Press', sets: 3, repRange: '5-8', ...H, muscle: 'Quads', type: 'leg', notes: 'Warm up first. Keep the lower back on the pad at the bottom.',
				alternatives: [
					{ id: 'belt-squat-d3', movement: 'belt-squat', name: 'Belt Squat' },
					{ id: 'machine-hip-thrust', movement: 'machine-hip-thrust', name: 'Machine Hip Thrust', muscle: 'Glutes' }
				] },
			{ id: 'machine-incline-press', movement: 'machine-incline-press', name: 'Machine Incline Press', sets: 3, repRange: '8-12', ...compound, muscle: 'Chest', type: 'upper', notes: 'Use a low incline where possible and keep the shoulders controlled.',
				alternatives: [{ id: 'incline-db-press-d3', movement: 'incline-db-press', name: 'Incline Dumbbell Press' }] },
			{ id: 'cable-lateral-raise-d3', movement: 'cable-lateral-raise', name: 'Cable Lateral Raise', sets: 3, repRange: '12-20', ...isolation, muscle: 'Side Delts', type: 'upper', notes: 'Keep every rep strict and smooth.' },
			{ id: 'triceps-pushdown-d3', movement: 'triceps-pushdown', name: 'Rope Triceps Pushdown', sets: 2, repRange: '10-15', ...isolation, muscle: 'Triceps', type: 'upper', notes: 'Keep the elbows pinned and finish each rep under control.' },
			{ id: 'cable-crunch-d3', movement: 'cable-crunch', name: 'Cable Crunch', sets: 2, repRange: '10-15', ...isolation, muscle: 'Abs', type: 'abs', notes: 'Bring the ribs toward the hips without pulling the rope with the arms.' }
		]
	},
	{
		day: 4,
		name: 'Pull Light & Legs',
		subtitle: '',
		exercises: [
			{ id: 'neutral-pulldown-light', movement: 'neutral-pulldown', name: 'Neutral-Grip Lat Pulldown', sets: 3, repRange: '10-15', ...compound, ...light, muscle: 'Back', type: 'upper', notes: 'Same movement as day 2, lighter: smooth reps and a full stretch.' },
			{ id: 'machine-row', movement: 'machine-row', name: 'Machine Row', sets: 3, repRange: '10-15', ...compound, muscle: 'Back', type: 'upper', notes: 'Reach, then pull smoothly without jerking.',
				alternatives: [{ id: 'seated-cable-row-d4', movement: 'seated-cable-row', name: 'Seated Cable Row' }] },
			{ id: 'leg-extension', movement: 'leg-extension', name: 'Leg Extension', sets: 3, repRange: '10-15', ...isolation, muscle: 'Quads', type: 'leg', notes: 'Warm up first, then use a smooth, pain-free range and controlled lowering.' },
			{ id: 'seated-ham-curl-d4', movement: 'seated-ham-curl', name: 'Seated Hamstring Curl', sets: 3, repRange: '10-15', ...isolation, muscle: 'Hamstrings', type: 'leg', notes: 'Control every rep through the lengthened position.' },
			{ id: 'incline-db-curl', movement: 'incline-db-curl', name: 'Incline Dumbbell Curl', sets: 3, repRange: '10-15', ...isolation, muscle: 'Biceps', type: 'upper', notes: 'Control the stretched position and stop if the elbows dislike the range.',
				alternatives: [{ id: 'preacher-curl-d4', movement: 'preacher-curl', name: 'Preacher Curl' }] },
			{ id: 'reverse-cable-crossover', movement: 'reverse-cable-crossover', name: 'Reverse Cable Crossover', sets: 2, repRange: '12-20', ...isolation, muscle: 'Rear Delts', type: 'upper', notes: 'Use a load that keeps the traps from taking over.' }
		]
	},
	{
		day: 5,
		name: 'Push Light',
		subtitle: '',
		exercises: [
			{ id: 'smith-bench-light', movement: 'smith-bench-press', name: 'Smith Machine Bench Press', sets: 3, repRange: '8-12', ...compound, ...light, muscle: 'Chest', type: 'upper', notes: 'Same movement as day 1, lighter: control the lowering.' },
			{ id: 'hack-squat-light', movement: 'hack-squat', name: 'Hack Squat', sets: 2, repRange: '10-15', ...compound, ...light, muscle: 'Quads', type: 'leg', notes: 'Same movement as day 1, lighter: full depth you can control.' },
			{ id: 'pec-deck-d5', movement: 'pec-deck', name: 'Pec Deck', sets: 2, repRange: '12-20', ...isolation, muscle: 'Chest', type: 'upper', notes: 'Use a comfortable stretch with the shoulders controlled against the pad.',
				alternatives: [{ id: 'cable-fly-d5', movement: 'cable-fly', name: 'Cable Fly' }] },
			{ id: 'cable-lateral-raise-d5', movement: 'cable-lateral-raise', name: 'Cable Lateral Raise', sets: 3, repRange: '12-20', ...isolation, muscle: 'Side Delts', type: 'upper', notes: 'Keep strict form through the final side-delt exposure of the cycle.' },
			{ id: 'overhead-cable-tri-d5', movement: 'overhead-cable-triceps', name: 'Overhead Cable Triceps Extension', sets: 2, repRange: '10-15', ...isolation, muscle: 'Triceps', type: 'upper', notes: 'Use a comfortable stretched position and keep the ribs down.' },
			{ id: 'standing-calf-raise', movement: 'standing-calf-raise', name: 'Standing Calf Raise', sets: 3, repRange: '8-15', ...isolation, muscle: 'Calves', type: 'leg', notes: 'Warm up first, then pause in the bottom stretch on every rep.',
				alternatives: [{ id: 'leg-press-calf-d5', movement: 'leg-press-calf', name: 'Leg Press Calf Raise' }] },
			{ id: 'ab-crunch-d5', movement: 'ab-crunch', name: 'Ab Crunch Machine', sets: 2, repRange: '10-15', ...isolation, muscle: 'Abs', type: 'abs', notes: 'Use controlled trunk flexion without swinging.' }
		]
	}
];

// Old ids remain resolvable so imported history keeps its movement grouping.
export const LEGACY_ID_MOVEMENTS = {
	// Slots removed in programme version 3.
	'half-kneel-pulldown': 'half-kneel-pulldown',
	'overhead-db-tri': 'overhead-db-triceps',
	'incline-db-press-d5': 'incline-db-press',
	'hammer-curl': 'hammer-curl',
	'triceps-pushdown-d5': 'triceps-pushdown',
	'pallof-press': 'pallof-press',
	'barbell-bench': 'barbell-bench-press',
	'machine-chest-press': 'machine-chest-press',
	'incline-db-press': 'incline-db-press',
	'machine-incline-press-alt': 'machine-incline-press',
	'incline-smith-press': 'incline-smith-press',
	'pec-deck': 'pec-deck',
	'cable-fly': 'cable-fly',
	'db-lateral-raise': 'db-lateral-raise',
	'machine-lateral-raise': 'machine-lateral-raise',
	'triceps-pushdown': 'triceps-pushdown',
	'db-overhead-tri': 'overhead-db-triceps',
	'leg-press': 'leg-press',
	'smith-squat': 'smith-squat',
	'pendulum-squat': 'pendulum-squat',
	'bulgarian-split': 'bulgarian-split-squat',
	'walking-lunge': 'walking-lunge',
	'db-step-up': 'db-step-up',
	'ab-crunch': 'ab-crunch',
	'hanging-leg-raise': 'hanging-leg-raise',
	'bb-row': 'barbell-row',
	'pendlay-row': 'pendlay-row',
	't-bar-row': 't-bar-row',
	'wide-pulldown': 'wide-pulldown',
	'assisted-pullup': 'assisted-pullup',
	'seated-cable-row': 'seated-cable-row',
	'incline-db-curl-alt': 'incline-db-curl',
	'ez-bar-curl': 'ez-bar-curl',
	'face-pulls': 'face-pulls',
	'reverse-pec-deck-alt': 'reverse-pec-deck',
	'rdl': 'rdl',
	'db-rdl': 'db-rdl',
	'lying-leg-curl': 'lying-leg-curl',
	'db-shoulder-press': 'db-shoulder-press',
	'smith-shoulder-press': 'smith-shoulder-press',
	'db-lateral-raise-d3': 'db-lateral-raise',
	'machine-lateral-raise-d3': 'machine-lateral-raise',
	'incline-cable-press': 'incline-cable-press',
	'incline-db-press-d3': 'incline-db-press',
	'leg-press-d3': 'leg-press',
	'hack-squat-d3': 'hack-squat',
	'standing-calf-raise-d3': 'standing-calf-raise',
	'leg-press-calf-d3': 'leg-press-calf',
	'seated-calf-raise-d3': 'seated-calf-raise',
	'cable-crunch-d3': 'cable-crunch',
	'hanging-leg-raise-d3': 'hanging-leg-raise',
	'reverse-pec-deck-condo': 'reverse-pec-deck',
	'bayesian-curl-condo': 'bayesian-curl',
	'preacher-curl': 'preacher-curl',
	'overhead-cable-tri-condo': 'overhead-cable-triceps',
	'skullcrusher': 'skullcrusher',
	'hammer-curl-combo': 'hammer-curl-combo',
	'db-incline-press-vol': 'incline-db-press',
	'machine-incline-press-vol': 'machine-incline-press',
	'one-arm-cable-row': 'one-arm-cable-row',
	'lat-pulldown-vol': 'lat-pulldown',
	'cable-lateral-raise-vol': 'cable-lateral-raise',
	'db-lateral-raise-vol': 'db-lateral-raise',
	'machine-lateral-raise-vol': 'machine-lateral-raise',
	'bayesian-curl-vol': 'bayesian-curl',
	'incline-db-curl-vol': 'incline-db-curl',
	'cable-curl-vol': 'cable-curl',
	'overhead-cable-tri-vol': 'overhead-cable-triceps',
	'triceps-pushdown-vol': 'triceps-pushdown',
	'db-overhead-tri-vol': 'overhead-db-triceps',
	'lying-leg-curl-d5': 'lying-leg-curl',
	'rdl-d5': 'rdl',
	'leg-press-calf': 'leg-press-calf',
	'seated-calf-raise': 'seated-calf-raise',
	'cable-crunch-d5': 'cable-crunch',
	'hanging-leg-raise-d5': 'hanging-leg-raise',
	'reverse-cable-crossover-d3': 'reverse-cable-crossover',
	'cable-lateral-raise-condo': 'cable-lateral-raise',
	'db-lateral-raise-condo': 'db-lateral-raise',
	'machine-lateral-raise-condo': 'machine-lateral-raise'
};

const LEGACY_MOVEMENT_NAMES = {
	'half-kneel-pulldown': 'Half-Kneeling 1-Arm Lat Pulldown',
	'pallof-press': 'Pallof Press',
	'hammer-curl': 'Hammer Curl',
	'barbell-row': 'Barbell Bent-Over Row',
	rdl: 'Romanian Deadlift',
	'leg-press': 'Leg Press',
	'hammer-curl-combo': 'Hammer Curl to Curl Combo',
	'face-pulls': 'Face Pulls',
	'lying-leg-curl': 'Lying Leg Curl',
	'leg-press-calf': 'Leg Press Calf Raise',
	'seated-calf-raise': 'Seated Calf Raise'
};

export const exerciseIndex = (() => {
	const index = {};
	for (const day of program) {
		for (const slot of day.exercises) {
			index[slot.id] = { ...slot, slotId: slot.id, isPrimary: true };
			for (const alt of slot.alternatives ?? []) {
				index[alt.id] = { ...alternativeOf(slot, alt), slotId: slot.id };
			}
		}
	}
	return index;
})();

export const movementNames = (() => {
	const names = {};
	for (const id in exerciseIndex) {
		const { movement, name } = exerciseIndex[id];
		if (movement && !names[movement]) names[movement] = name;
	}
	return names;
})();

export function movementForId(id) {
	return exerciseIndex[id]?.movement ?? LEGACY_ID_MOVEMENTS[id] ?? id;
}

export function movementName(movement) {
	return movementNames[movement] ?? LEGACY_MOVEMENT_NAMES[movement] ?? movement;
}

// An alternative trains like its slot: same sets, range, band and effort. Only
// the station, and so the movement key and its history, differ.
export function alternativeOf(slot, alt) {
	const { alternatives: _ignored, ...base } = slot;
	return { ...base, ...alt, muscle: alt.muscle ?? slot.muscle, isPrimary: false };
}

// The recommended pick first, then the built-in alternatives.
export function slotVariants(slot) {
	return [{ ...slot, isPrimary: true }, ...(slot.alternatives ?? []).map((alt) => alternativeOf(slot, alt))];
}
