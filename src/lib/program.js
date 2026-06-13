// The 5-day rolling workout program.
//
// Each exercise is a "slot". The top-level fields are the *primary* variant;
// `alternatives` holds equivalent movements for the same muscle that can be
// toggled in at the gym. Each variant has its own `id`, so each one tracks its
// own record independently.
//
// Fields:
//   id        unique id (records are keyed by this)
//   name      display name
//   sets      target number of working sets (guideline only)
//   repRange  target rep range (guideline only)
//   method    'straight' | 'myorep' | 'volume'
//             - straight/myorep: track heaviest weight x reps (strength record)
//             - volume: track best total volume (weight x reps); suggested load
//               is ~60% of the lift's max (see VOLUME_LOAD_PCT in store.js)
//   muscle    primary muscle worked (for analytics grouping)
//   type      'upper' | 'leg' | 'abs' (for card styling)
//   notes     form / execution cue
//   alternatives  [{ id, name, notes, muscle }] same-muscle swaps

export const program = [
	{
		day: 1,
		name: 'Push',
		subtitle: 'Chest Emphasis',
		exercises: [
			{
				id: 'smith-bench',
				name: 'Smith Machine Bench Press',
				sets: 3,
				repRange: '6-8',
				method: 'straight',
				muscle: 'Chest',
				type: 'upper',
				notes: 'Elbows ~45 degrees. Full ROM, control the eccentric.',
				alternatives: [
					{ id: 'barbell-bench', name: 'Barbell Bench Press', muscle: 'Chest', notes: 'Free-weight version. Touch lower chest, drive through the floor.' },
					{ id: 'machine-chest-press', name: 'Machine Chest Press', muscle: 'Chest', notes: 'Fixed path. Squeeze hard at lockout, control the stretch.' }
				]
			},
			{
				id: 'incline-db-press',
				name: 'Incline Dumbbell Press',
				sets: 3,
				repRange: '8-10',
				method: 'straight',
				muscle: 'Chest',
				type: 'upper',
				notes: 'Deep stretch at the bottom. Let the dumbbells go wide. 30-45 degree incline.',
				alternatives: [
					{ id: 'machine-incline-press-alt', name: 'Machine Incline Press', muscle: 'Chest', notes: 'Same upper-chest angle, fixed path for the free machine.' },
					{ id: 'incline-smith-press', name: 'Incline Smith Press', muscle: 'Chest', notes: 'Smith bar on an incline bench. Touch the upper chest.' }
				]
			},
			{
				id: 'pec-deck',
				name: 'Pec Deck Machine',
				sets: 3,
				repRange: '12-15',
				method: 'myorep',
				muscle: 'Chest',
				type: 'upper',
				notes: 'Full stretch at the start, let the handles go as far back as comfortable. Constant tension throughout.',
				alternatives: [
					{ id: 'cable-fly', name: 'Cable Fly', muscle: 'Chest', notes: 'High-to-low or mid cables. Long stretch, squeeze at the midline.' }
				]
			},
			{
				id: 'cable-lateral-raise',
				name: 'Cable Lateral Raise',
				sets: 3,
				repRange: '15-20',
				method: 'myorep',
				muscle: 'Side Delts',
				type: 'upper',
				notes: 'Cable set at hand height. Cross-body start position for full stretch.',
				alternatives: [
					{ id: 'db-lateral-raise', name: 'Dumbbell Lateral Raise', muscle: 'Side Delts', notes: 'Slight forward lean. Lead with the elbows, control the descent.' },
					{ id: 'machine-lateral-raise', name: 'Machine Lateral Raise', muscle: 'Side Delts', notes: 'Pads on the forearms. Constant tension, no momentum.' }
				]
			},
			{
				id: 'overhead-cable-tri',
				name: 'Overhead Cable Triceps Extension',
				sets: 3,
				repRange: '12-15',
				method: 'myorep',
				muscle: 'Triceps',
				type: 'upper',
				notes: 'Face away from the stack. Full overhead stretch on the long head.',
				alternatives: [
					{ id: 'triceps-pushdown', name: 'Triceps Pushdown', muscle: 'Triceps', notes: 'Rope or bar. Keep elbows pinned, full lockout.' },
					{ id: 'db-overhead-tri', name: 'Overhead Dumbbell Extension', muscle: 'Triceps', notes: 'Both hands on one dumbbell. Deep overhead stretch.' }
				]
			},
			{
				id: 'hack-squat',
				name: 'Hack Squat',
				sets: 4,
				repRange: '6-8',
				method: 'straight',
				muscle: 'Quads',
				type: 'leg',
				notes: 'Feet mid-platform. Full depth, control the eccentric, drive through the heels.',
				alternatives: [
					{ id: 'leg-press', name: 'Leg Press', muscle: 'Quads', notes: 'Feet lower/narrower for quad bias. Full ROM, no lockout rest.' },
					{ id: 'smith-squat', name: 'Smith Machine Squat', muscle: 'Quads', notes: 'Feet slightly forward for extra quad stretch. Full depth.' },
					{ id: 'pendulum-squat', name: 'Pendulum Squat', muscle: 'Quads', notes: 'Deep stretch under load. Stay smooth through the bottom.' }
				]
			},
			{
				id: 'ab-crunch',
				name: 'Ab Crunch Machine',
				sets: 3,
				repRange: '12-15',
				method: 'straight',
				muscle: 'Abs',
				type: 'abs',
				notes: 'Crunch through the abs, not the hip flexors. Control the return, no swinging.',
				alternatives: [
					{ id: 'cable-crunch', name: 'Cable Crunch', muscle: 'Abs', notes: 'Kneel under the rope. Round the spine, crunch the ribs to the hips.' },
					{ id: 'hanging-leg-raise', name: 'Hanging Leg Raise', muscle: 'Abs', notes: 'Posterior pelvic tilt at the top. No swinging.' }
				]
			}
		]
	},
	{
		day: 2,
		name: 'Pull',
		subtitle: 'Back Emphasis',
		exercises: [
			{
				id: 'bb-row',
				name: 'Barbell Bent-Over Row',
				sets: 3,
				repRange: '6-8',
				method: 'straight',
				muscle: 'Back',
				type: 'upper',
				notes: 'Slight torso lean (~45 degrees). Pull to lower chest. 1-2 RIR.',
				alternatives: [
					{ id: 'pendlay-row', name: 'Pendlay Row', muscle: 'Back', notes: 'Dead-stop each rep from the floor. Explosive pull, flat back.' },
					{ id: 't-bar-row', name: 'T-Bar Row', muscle: 'Back', notes: 'Chest up, drive elbows back. Full stretch at the bottom.' }
				]
			},
			{
				id: 'neutral-pulldown',
				name: 'Neutral-Grip Lat Pulldown',
				sets: 3,
				repRange: '8-10',
				method: 'straight',
				muscle: 'Back',
				type: 'upper',
				notes: 'Pull elbows straight down, not back. Full stretch at the top.',
				alternatives: [
					{ id: 'wide-pulldown', name: 'Wide-Grip Lat Pulldown', muscle: 'Back', notes: 'Pull to the upper chest. Drive elbows down and in.' },
					{ id: 'assisted-pullup', name: 'Assisted Pull-Up', muscle: 'Back', notes: 'Full hang to chin over bar. Minimal assistance.' }
				]
			},
			{
				id: 'chest-supported-row',
				name: 'Chest-Supported Row',
				sets: 3,
				repRange: '10-12',
				method: 'straight',
				muscle: 'Back',
				type: 'upper',
				notes: 'Let the scapulae protract fully at the bottom. Squeeze at the top.',
				alternatives: [
					{ id: 'seated-cable-row', name: 'Seated Cable Row', muscle: 'Back', notes: 'Tall chest. Stretch forward, pull to the navel.' },
					{ id: 'machine-row', name: 'Machine Row', muscle: 'Back', notes: 'Chest on the pad. Full stretch, squeeze the mid-back.' }
				]
			},
			{
				id: 'bayesian-curl',
				name: 'Bayesian Cable Curl',
				sets: 3,
				repRange: '10-12',
				method: 'myorep',
				muscle: 'Biceps',
				type: 'upper',
				notes: 'Stand facing away from the cable. Arm starts behind the torso for maximum bicep stretch.',
				alternatives: [
					{ id: 'incline-db-curl-alt', name: 'Incline Dumbbell Curl', muscle: 'Biceps', notes: 'Arms hang behind the torso for a long-head stretch.' },
					{ id: 'ez-bar-curl', name: 'EZ-Bar Curl', muscle: 'Biceps', notes: 'No swinging. Full stretch at the bottom, squeeze at the top.' }
				]
			},
			{
				id: 'face-pulls',
				name: 'Face Pulls',
				sets: 3,
				repRange: '15-20',
				method: 'myorep',
				muscle: 'Rear Delts',
				type: 'upper',
				notes: 'External rotation at the top. Rear delt and rotator cuff health.',
				alternatives: [
					{ id: 'reverse-pec-deck-alt', name: 'Reverse Pec Deck', muscle: 'Rear Delts', notes: 'Arms wide, lead with the elbows. Squeeze the rear delts.' }
				]
			},
			{
				id: 'rdl',
				name: 'Romanian Deadlift',
				sets: 3,
				repRange: '8-10',
				method: 'straight',
				muscle: 'Hamstrings',
				type: 'leg',
				notes: 'Slow eccentric (3 sec down). Feel the hamstring stretch. 1-2 RIR.',
				alternatives: [
					{ id: 'db-rdl', name: 'Dumbbell RDL', muscle: 'Hamstrings', notes: 'Dumbbells track close to the legs. Hinge at the hips.' },
					{ id: 'lying-leg-curl', name: 'Lying Leg Curl', muscle: 'Hamstrings', notes: 'Full ROM, squeeze at the top, control the negative.' }
				]
			}
		]
	},
	{
		day: 3,
		name: 'Push',
		subtitle: 'Shoulder Emphasis',
		exercises: [
			{
				id: 'machine-shoulder-press',
				name: 'Machine Shoulder Press',
				sets: 3,
				repRange: '8-10',
				method: 'straight',
				muscle: 'Front Delts',
				type: 'upper',
				notes: 'Press without shrugging. Full lockout, control back to ear height.',
				alternatives: [
					{ id: 'db-shoulder-press', name: 'Dumbbell Shoulder Press', muscle: 'Front Delts', notes: 'Seated, back supported. Press in a slight arc.' },
					{ id: 'smith-shoulder-press', name: 'Smith Machine Shoulder Press', muscle: 'Front Delts', notes: 'Bar to chin height. Fixed path, steady tempo.' }
				]
			},
			{
				id: 'cable-lateral-raise-d3',
				name: 'Cable Lateral Raise',
				sets: 3,
				repRange: '15-20',
				method: 'myorep',
				muscle: 'Side Delts',
				type: 'upper',
				notes: 'Cross-body start for full stretch. Lead with the elbow.',
				alternatives: [
					{ id: 'db-lateral-raise-d3', name: 'Dumbbell Lateral Raise', muscle: 'Side Delts', notes: 'Slight forward lean. Control the descent.' },
					{ id: 'machine-lateral-raise-d3', name: 'Machine Lateral Raise', muscle: 'Side Delts', notes: 'Constant tension, no momentum.' }
				]
			},
			{
				id: 'machine-incline-press',
				name: 'Machine Incline Press',
				sets: 3,
				repRange: '10-12',
				method: 'straight',
				muscle: 'Chest',
				type: 'upper',
				notes: 'Upper-chest angle. Full stretch, squeeze at lockout.',
				alternatives: [
					{ id: 'incline-cable-press', name: 'Incline Cable Press', muscle: 'Chest', notes: 'Low-to-high press. Long stretch, meet at the top.' },
					{ id: 'incline-db-press-d3', name: 'Incline Dumbbell Press', muscle: 'Chest', notes: 'Let the dumbbells go wide for a deep stretch.' }
				]
			},
			{
				id: 'reverse-pec-deck',
				name: 'Reverse Pec Deck',
				sets: 3,
				repRange: '15-20',
				method: 'myorep',
				muscle: 'Rear Delts',
				type: 'upper',
				notes: 'Arms wide, lead with the elbows. Squeeze the rear delts, no traps.',
				alternatives: [
					{ id: 'reverse-cable-crossover-d3', name: 'Reverse Cable Crossover', muscle: 'Rear Delts', notes: 'High cables, cross over for a full rear-delt stretch.' }
				]
			},
			{
				id: 'leg-press-d3',
				name: 'Leg Press',
				sets: 4,
				repRange: '10-12',
				method: 'straight',
				muscle: 'Quads',
				type: 'leg',
				notes: 'Feet lower/narrower for quad bias. Full ROM, no lockout rest.',
				alternatives: [
					{ id: 'hack-squat-d3', name: 'Hack Squat', muscle: 'Quads', notes: 'Feet mid-platform. Full depth, drive through the heels.' },
					{ id: 'leg-extension', name: 'Leg Extension', muscle: 'Quads', notes: 'Pause and squeeze at the top. Control the negative.' }
				]
			},
			{
				id: 'standing-calf-raise-d3',
				name: 'Standing Calf Raise',
				sets: 3,
				repRange: '12-15',
				method: 'myorep',
				muscle: 'Calves',
				type: 'leg',
				notes: 'Full stretch at the bottom, pause 1 sec. Straight knee.',
				alternatives: [
					{ id: 'leg-press-calf-d3', name: 'Leg Press Calf Raise', muscle: 'Calves', notes: 'Push through the balls of the feet. Full stretch and squeeze.' },
					{ id: 'seated-calf-raise-d3', name: 'Seated Calf Raise', muscle: 'Calves', notes: 'Bent knee targets the soleus. Slow, full ROM.' }
				]
			},
			{
				id: 'ab-crunch-d3',
				name: 'Ab Crunch Machine',
				sets: 3,
				repRange: '12-15',
				method: 'straight',
				muscle: 'Abs',
				type: 'abs',
				notes: 'Crunch through the abs, not the hip flexors. Control the return.',
				alternatives: [
					{ id: 'cable-crunch-d3', name: 'Cable Crunch', muscle: 'Abs', notes: 'Round the spine, crunch the ribs to the hips.' },
					{ id: 'hanging-leg-raise-d3', name: 'Hanging Leg Raise', muscle: 'Abs', notes: 'Posterior pelvic tilt at the top. No swinging.' }
				]
			}
		]
	},
	{
		day: 4,
		name: 'Shoulders & Arms',
		subtitle: '',
		exercises: [
			{
				id: 'cable-lateral-raise-condo',
				name: 'Cable Lateral Raise',
				sets: 4,
				repRange: '15-20',
				method: 'myorep',
				muscle: 'Side Delts',
				type: 'upper',
				notes: 'Cross-body start for full stretch. #1 priority exercise for the V-shape.',
				alternatives: [
					{ id: 'db-lateral-raise-condo', name: 'Dumbbell Lateral Raise', muscle: 'Side Delts', notes: 'Slight forward lean. Lead with the elbows.' },
					{ id: 'machine-lateral-raise-condo', name: 'Machine Lateral Raise', muscle: 'Side Delts', notes: 'Constant tension, no momentum.' }
				]
			},
			{
				id: 'reverse-cable-crossover',
				name: 'Reverse Cable Crossover',
				sets: 3,
				repRange: '15-20',
				method: 'myorep',
				muscle: 'Rear Delts',
				type: 'upper',
				notes: 'High cable, cross the arms over for full rear delt stretch.',
				alternatives: [
					{ id: 'reverse-pec-deck-condo', name: 'Reverse Pec Deck', muscle: 'Rear Delts', notes: 'Arms wide, lead with the elbows. Squeeze the rear delts.' }
				]
			},
			{
				id: 'incline-db-curl',
				name: 'Incline Dumbbell Curl',
				sets: 3,
				repRange: '10-12',
				method: 'myorep',
				muscle: 'Biceps',
				type: 'upper',
				notes: 'Bench at ~45 degrees. Arms hang behind the torso, stretching the long head.',
				alternatives: [
					{ id: 'bayesian-curl-condo', name: 'Bayesian Cable Curl', muscle: 'Biceps', notes: 'Arm starts behind the torso for maximum stretch.' },
					{ id: 'preacher-curl', name: 'Preacher Curl', muscle: 'Biceps', notes: 'Full stretch at the bottom. No bouncing off the pad.' }
				]
			},
			{
				id: 'overhead-db-tri',
				name: 'Overhead Dumbbell Triceps Extension',
				sets: 3,
				repRange: '12-15',
				method: 'myorep',
				muscle: 'Triceps',
				type: 'upper',
				notes: 'Both hands on one dumbbell. Full stretch overhead.',
				alternatives: [
					{ id: 'overhead-cable-tri-condo', name: 'Overhead Cable Extension', muscle: 'Triceps', notes: 'Face away from the stack. Full overhead stretch.' },
					{ id: 'skullcrusher', name: 'EZ-Bar Skullcrusher', muscle: 'Triceps', notes: 'Lower to the forehead/behind the head. Elbows tucked.' }
				]
			},
			{
				id: 'hammer-curl-combo',
				name: 'Hammer Curl to Curl Combo',
				sets: 3,
				repRange: '10-12',
				method: 'straight',
				muscle: 'Biceps',
				type: 'upper',
				notes: 'Hammer up, supinate down. Use slightly heavier weight than normal curls.',
				alternatives: [
					{ id: 'hammer-curl', name: 'Hammer Curl', muscle: 'Biceps', notes: 'Neutral grip throughout. Targets the brachialis.' }
				]
			},
			{
				id: 'bulgarian-split',
				name: 'Bulgarian Split Squat',
				sets: 3,
				repRange: '10-12 each',
				method: 'straight',
				muscle: 'Quads',
				type: 'leg',
				notes: 'Dumbbells. Long stride for glute stretch, stay upright for quad bias.',
				alternatives: [
					{ id: 'walking-lunge', name: 'Walking Lunge', muscle: 'Quads', notes: 'Long strides. Control the knee, drive through the front heel.' },
					{ id: 'db-step-up', name: 'Dumbbell Step-Up', muscle: 'Quads', notes: 'Tall box. Drive through the working leg, minimal push-off.' }
				]
			}
		]
	},
	{
		day: 5,
		name: 'Upper Hypertrophy',
		subtitle: '',
		exercises: [
			{
				id: 'db-incline-press-vol',
				name: 'Dumbbell Incline Press',
				sets: 3,
				repRange: '12-15',
				method: 'volume',
				muscle: 'Chest',
				type: 'upper',
				notes: 'Lighter than Day 1 (~60% of max). Chase total reps, not load. Focus on the stretch and squeeze.',
				alternatives: [
					{ id: 'machine-incline-press-vol', name: 'Machine Incline Press', muscle: 'Chest', notes: 'High-rep volume. Constant tension, full stretch.' }
				]
			},
			{
				id: 'half-kneel-pulldown',
				name: 'Half-Kneeling 1-Arm Lat Pulldown',
				sets: 3,
				repRange: '10-12 each',
				method: 'straight',
				muscle: 'Back',
				type: 'upper',
				notes: 'Deep stretch at the top. Pull elbow down to hip.',
				alternatives: [
					{ id: 'one-arm-cable-row', name: '1-Arm Cable Row', muscle: 'Back', notes: 'Full stretch and rotation. Pull to the hip.' },
					{ id: 'lat-pulldown-vol', name: 'Lat Pulldown', muscle: 'Back', notes: 'Two-arm version. Full stretch, drive elbows down.' }
				]
			},
			{
				id: 'cable-lateral-raise-vol',
				name: 'Cable Lateral Raise',
				sets: 3,
				repRange: '15-20',
				method: 'volume',
				muscle: 'Side Delts',
				type: 'upper',
				notes: 'Third lateral session of the cycle. High-rep volume (~60% of max). Frequency drives growth.',
				alternatives: [
					{ id: 'db-lateral-raise-vol', name: 'Dumbbell Lateral Raise', muscle: 'Side Delts', notes: 'High-rep volume. Slight lean, lead with the elbows.' },
					{ id: 'machine-lateral-raise-vol', name: 'Machine Lateral Raise', muscle: 'Side Delts', notes: 'Constant tension, no momentum.' }
				]
			},
			{
				id: 'bayesian-curl-vol',
				name: 'Bayesian Cable Curl',
				sets: 3,
				repRange: '12-15',
				method: 'volume',
				muscle: 'Biceps',
				type: 'upper',
				notes: 'High-rep volume (~60% of max). Same stretch-focused position as Day 2.',
				alternatives: [
					{ id: 'incline-db-curl-vol', name: 'Incline Dumbbell Curl', muscle: 'Biceps', notes: 'High-rep volume. Arms hang behind the torso.' },
					{ id: 'cable-curl-vol', name: 'Cable Curl', muscle: 'Biceps', notes: 'Constant tension. Squeeze at the top.' }
				]
			},
			{
				id: 'overhead-cable-tri-vol',
				name: 'Overhead Cable Triceps Extension',
				sets: 3,
				repRange: '12-15',
				method: 'volume',
				muscle: 'Triceps',
				type: 'upper',
				notes: 'High-rep volume (~60% of max). Long head emphasis again.',
				alternatives: [
					{ id: 'triceps-pushdown-vol', name: 'Triceps Pushdown', muscle: 'Triceps', notes: 'High-rep volume. Elbows pinned, full lockout.' },
					{ id: 'db-overhead-tri-vol', name: 'Overhead Dumbbell Extension', muscle: 'Triceps', notes: 'Deep overhead stretch, high reps.' }
				]
			},
			{
				id: 'seated-ham-curl',
				name: 'Seated Hamstring Curl',
				sets: 3,
				repRange: '12-15',
				method: 'straight',
				muscle: 'Hamstrings',
				type: 'leg',
				notes: 'Seated position pre-stretches the hamstrings. Better than lying curls.',
				alternatives: [
					{ id: 'lying-leg-curl-d5', name: 'Lying Leg Curl', muscle: 'Hamstrings', notes: 'Full ROM, squeeze at the top, control the negative.' },
					{ id: 'rdl-d5', name: 'Romanian Deadlift', muscle: 'Hamstrings', notes: 'Slow eccentric, feel the hamstring stretch.' }
				]
			},
			{
				id: 'standing-calf-raise',
				name: 'Standing Calf Raises',
				sets: 3,
				repRange: '12-15',
				method: 'myorep',
				muscle: 'Calves',
				type: 'leg',
				notes: 'Full stretch at the bottom, pause 1 sec. Straight knee.',
				alternatives: [
					{ id: 'leg-press-calf', name: 'Leg Press Calf Raise', muscle: 'Calves', notes: 'Push through the balls of the feet. Full stretch and squeeze.' },
					{ id: 'seated-calf-raise', name: 'Seated Calf Raise', muscle: 'Calves', notes: 'Bent knee targets the soleus. Slow, full ROM.' }
				]
			},
			{
				id: 'ab-crunch-d5',
				name: 'Ab Crunch Machine',
				sets: 3,
				repRange: '12-15',
				method: 'straight',
				muscle: 'Abs',
				type: 'abs',
				notes: 'Crunch through the abs, not the hip flexors. Control the return.',
				alternatives: [
					{ id: 'cable-crunch-d5', name: 'Cable Crunch', muscle: 'Abs', notes: 'Round the spine, crunch the ribs to the hips.' },
					{ id: 'hanging-leg-raise-d5', name: 'Hanging Leg Raise', muscle: 'Abs', notes: 'Posterior pelvic tilt at the top. No swinging.' }
				]
			}
		]
	}
];

// Flat lookup of every variant (primary + alternatives) keyed by id, with the
// owning slot's id. Useful for analytics and resolving records to display names.
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
					repRange: slot.repRange
				};
			}
		}
	}
	return index;
})();

// All variants for a slot (primary first), each normalised to a full exercise.
export function slotVariants(slot) {
	const primary = {
		id: slot.id,
		name: slot.name,
		notes: slot.notes,
		muscle: slot.muscle,
		sets: slot.sets,
		repRange: slot.repRange,
		method: slot.method,
		type: slot.type,
		isPrimary: true
	};
	const alts = (slot.alternatives ?? []).map((alt) => ({
		id: alt.id,
		name: alt.name,
		notes: alt.notes,
		muscle: alt.muscle ?? slot.muscle,
		sets: slot.sets,
		repRange: slot.repRange,
		method: slot.method,
		type: slot.type,
		isPrimary: false
	}));
	return [primary, ...alts];
}
