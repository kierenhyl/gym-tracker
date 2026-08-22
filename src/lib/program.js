// Fixed five-workout rolling programme. There is intentionally no exercise
// switching in this release: every slot is the researched primary movement.
// Warm-up sets are not included in `sets`.

const compound = { method: 'straight', rir: '1–3 RIR', rest: '2–3 min' };
const isolation = { method: 'myorep', rir: '0–2 RIR', rest: '60–120 sec' };
const core = { method: 'straight', rir: '1–3 RIR', rest: '60–120 sec' };

export const program = [
	{
		day: 1,
		name: 'Chest & Width',
		subtitle: '',
		exercises: [
			{ id: 'smith-bench', movement: 'smith-bench-press', name: 'Smith Machine Bench Press', sets: 3, repRange: '6-10', ...compound, muscle: 'Chest', type: 'upper', notes: 'Elbows about 45°. Use a controlled, pain-free range and stop before technique breaks.' },
			{ id: 'cable-lateral-raise', movement: 'cable-lateral-raise', name: 'Cable Lateral Raise', sets: 3, repRange: '12-20', ...isolation, muscle: 'Side Delts', type: 'upper', notes: 'Start cross-body, lead with the elbow and keep momentum out of the movement.' },
			{ id: 'overhead-cable-tri', movement: 'overhead-cable-triceps', name: 'Overhead Cable Triceps Extension', sets: 2, repRange: '10-15', ...isolation, muscle: 'Triceps', type: 'upper', notes: 'Use a comfortable stretched position and keep the ribs down.' },
			{ id: 'hack-squat', movement: 'hack-squat', name: 'Hack Squat', sets: 1, repRange: '6-10', ...compound, muscle: 'Quads', type: 'leg', notes: 'Warm up first, then do one hard work set at a stable, pain-free depth.' },
			{ id: 'cable-crunch', movement: 'cable-crunch', name: 'Cable Crunch', sets: 2, repRange: '10-15', ...core, muscle: 'Abs', type: 'abs', notes: 'Bring the ribs toward the hips without pulling the rope with the arms.' }
		]
	},
	{
		day: 2,
		name: 'Back Thickness',
		subtitle: '',
		exercises: [
			{ id: 'chest-supported-row', movement: 'chest-supported-row', name: 'Chest-Supported Row', sets: 4, repRange: '8-12', ...compound, muscle: 'Back', type: 'upper', notes: 'Let the shoulder blades reach at the bottom, then pull the elbows back.' },
			{ id: 'neutral-pulldown', movement: 'neutral-pulldown', name: 'Neutral-Grip Lat Pulldown', sets: 3, repRange: '8-12', ...compound, muscle: 'Back', type: 'upper', notes: 'Pull the elbows down toward the ribs with a comfortable grip.' },
			{ id: 'reverse-pec-deck', movement: 'reverse-pec-deck', name: 'Reverse Pec Deck', sets: 3, repRange: '12-20', ...isolation, muscle: 'Rear Delts', type: 'upper', notes: 'Keep the chest on the pad and avoid shrugging.' },
			{ id: 'bayesian-curl', movement: 'bayesian-curl', name: 'Bayesian Cable Curl', sets: 3, repRange: '10-15', ...isolation, muscle: 'Biceps', type: 'upper', notes: 'Keep the arm behind the torso and control the full range.' },
			{ id: 'seated-ham-curl', movement: 'seated-ham-curl', name: 'Seated Hamstring Curl', sets: 1, repRange: '8-15', ...compound, muscle: 'Hamstrings', type: 'leg', notes: 'Warm up first, then control one hard set through the lengthened position.' }
		]
	},
	{
		day: 3,
		name: 'Shoulders & Upper Chest',
		subtitle: '',
		exercises: [
			{ id: 'machine-shoulder-press', movement: 'machine-shoulder-press', name: 'Machine Shoulder Press', sets: 2, repRange: '6-10', ...compound, muscle: 'Front Delts', type: 'upper', notes: 'Use a pain-free grip and range; keep the ribs down.' },
			{ id: 'machine-incline-press', movement: 'machine-incline-press', name: 'Machine Incline Press', sets: 3, repRange: '8-12', ...compound, muscle: 'Chest', type: 'upper', notes: 'Use a low incline where possible and keep the shoulders controlled.' },
			{ id: 'cable-lateral-raise-d3', movement: 'cable-lateral-raise', name: 'Cable Lateral Raise', sets: 3, repRange: '12-20', ...isolation, muscle: 'Side Delts', type: 'upper', notes: 'Keep every rep strict and smooth.' },
			{ id: 'triceps-pushdown-d3', movement: 'triceps-pushdown', name: 'Rope Triceps Pushdown', sets: 2, repRange: '10-15', ...isolation, muscle: 'Triceps', type: 'upper', notes: 'Keep the elbows pinned and finish each rep under control.' },
			{ id: 'machine-hip-thrust', movement: 'machine-hip-thrust', name: 'Machine Hip Thrust', sets: 1, repRange: '8-12', ...compound, muscle: 'Glutes', type: 'leg', notes: 'Warm up first; finish the work set with ribs down and the pelvis neutral.' },
			{ id: 'pallof-press', movement: 'pallof-press', name: 'Pallof Press', sets: 2, repRange: '10-15 each side', ...core, muscle: 'Core', type: 'abs', notes: 'Resist rotation and keep the pelvis and ribs stacked.' }
		]
	},
	{
		day: 4,
		name: 'Back & Arms',
		subtitle: '',
		exercises: [
			{ id: 'half-kneel-pulldown', movement: 'half-kneel-pulldown', name: 'Half-Kneeling 1-Arm Lat Pulldown', sets: 3, repRange: '8-12 each side', ...compound, muscle: 'Back', type: 'upper', notes: 'Drive the elbow toward the hip without twisting.' },
			{ id: 'machine-row', movement: 'machine-row', name: 'Machine Row', sets: 3, repRange: '10-15', ...compound, muscle: 'Back', type: 'upper', notes: 'Reach, then pull smoothly without jerking.' },
			{ id: 'reverse-cable-crossover', movement: 'reverse-cable-crossover', name: 'Reverse Cable Crossover', sets: 3, repRange: '12-20', ...isolation, muscle: 'Rear Delts', type: 'upper', notes: 'Use a load that keeps the traps from taking over.' },
			{ id: 'incline-db-curl', movement: 'incline-db-curl', name: 'Incline Dumbbell Curl', sets: 3, repRange: '10-15', ...isolation, muscle: 'Biceps', type: 'upper', notes: 'Control the stretched position and stop if the elbows dislike the range.' },
			{ id: 'overhead-db-tri', movement: 'overhead-db-triceps', name: 'Overhead Dumbbell Triceps Extension', sets: 2, repRange: '10-15', ...isolation, muscle: 'Triceps', type: 'upper', notes: 'Use a pain-free depth and keep the ribs down.' },
			{ id: 'leg-extension', movement: 'leg-extension', name: 'Leg Extension', sets: 1, repRange: '10-15', ...compound, muscle: 'Quads', type: 'leg', notes: 'Warm up first, then use a smooth, pain-free range and controlled lowering.' }
		]
	},
	{
		day: 5,
		name: 'Upper Hypertrophy',
		subtitle: '',
		exercises: [
			{ id: 'incline-db-press-d5', movement: 'incline-db-press', name: 'Incline Dumbbell Press', sets: 3, repRange: '10-15', ...compound, muscle: 'Chest', type: 'upper', notes: 'Use a low incline and progress repetitions before load.' },
			{ id: 'cable-lateral-raise-d5', movement: 'cable-lateral-raise', name: 'Cable Lateral Raise', sets: 4, repRange: '12-20', ...isolation, muscle: 'Side Delts', type: 'upper', notes: 'Keep strict form through the final side-delt exposure of the cycle.' },
			{ id: 'pec-deck-d5', movement: 'pec-deck', name: 'Pec Deck', sets: 2, repRange: '12-20', ...isolation, muscle: 'Chest', type: 'upper', notes: 'Use a comfortable stretch with the shoulders controlled against the pad.' },
			{ id: 'hammer-curl', movement: 'hammer-curl', name: 'Hammer Curl', sets: 2, repRange: '10-15', ...isolation, muscle: 'Biceps', type: 'upper', notes: 'Keep a neutral grip and avoid swinging.' },
			{ id: 'triceps-pushdown-d5', movement: 'triceps-pushdown', name: 'Rope Triceps Pushdown', sets: 2, repRange: '10-15', ...isolation, muscle: 'Triceps', type: 'upper', notes: 'Keep the elbows pinned and lock out without losing shoulder position.' },
			{ id: 'standing-calf-raise', movement: 'standing-calf-raise', name: 'Standing Calf Raise', sets: 1, repRange: '8-15', ...compound, muscle: 'Calves', type: 'leg', notes: 'Warm up first, then pause in the bottom stretch during the work set.' },
			{ id: 'ab-crunch-d5', movement: 'ab-crunch', name: 'Ab Crunch Machine', sets: 2, repRange: '10-15', ...core, muscle: 'Abs', type: 'abs', notes: 'Use controlled trunk flexion without swinging.' }
		]
	}
];

// Old ids remain resolvable so imported history keeps its movement grouping.
export const LEGACY_ID_MOVEMENTS = {
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
				index[alt.id] = {
					...alt,
					slotId: slot.id,
					isPrimary: false,
					method: slot.method,
					type: slot.type,
					sets: slot.sets,
					repRange: slot.repRange,
					rir: slot.rir,
					rest: slot.rest
				};
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

export function slotVariants(slot) {
	const primary = { ...slot, isPrimary: true };
	const alts = (slot.alternatives ?? []).map((alt) => ({
		...alt,
		sets: slot.sets,
		repRange: slot.repRange,
		method: slot.method,
		type: slot.type,
		rir: slot.rir,
		rest: slot.rest,
		isPrimary: false
	}));
	return [primary, ...alts];
}
