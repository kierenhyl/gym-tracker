// The 5-day rolling workout program
export const program = [
	{
		day: 1,
		name: 'Push',
		subtitle: 'Chest Emphasis',
		location: 'Main Gym',
		exercises: [
			{
				id: 'smith-bench',
				name: 'Smith Machine Bench Press',
				sets: 3,
				repRange: '6-8',
				method: 'straight',
				notes: 'Elbows ~45 degrees. Full ROM, control the eccentric.'
			},
			{
				id: 'incline-db-press',
				name: 'Incline Dumbbell Press',
				sets: 3,
				repRange: '8-10',
				method: 'straight',
				notes: 'Deep stretch at the bottom. Let the dumbbells go wide. 30-45 degree incline.'
			},
			{
				id: 'pec-deck',
				name: 'Pec Deck Machine',
				sets: 3,
				repRange: '12-15',
				method: 'myorep',
				notes: 'Full stretch at the start, let the handles go as far back as comfortable. Constant tension throughout.'
			},
			{
				id: 'cable-lateral-raise',
				name: 'Cable Lateral Raise',
				sets: 3,
				repRange: '15-20',
				method: 'myorep',
				notes: 'Cable set at hand height. Cross-body start position for full stretch.'
			},
			{
				id: 'overhead-cable-tri',
				name: 'Overhead Cable Triceps Extension',
				sets: 3,
				repRange: '12-15',
				method: 'myorep',
				notes: 'Face away from the stack. Full overhead stretch on the long head.'
			}
		]
	},
	{
		day: 2,
		name: 'Pull',
		subtitle: 'Back Emphasis',
		location: 'Main Gym',
		exercises: [
			{
				id: 'bb-row',
				name: 'Barbell Bent-Over Row',
				sets: 3,
				repRange: '6-8',
				method: 'straight',
				notes: 'Slight torso lean (~45 degrees). Pull to lower chest. 1-2 RIR.'
			},
			{
				id: 'neutral-pulldown',
				name: 'Neutral-Grip Lat Pulldown',
				sets: 3,
				repRange: '8-10',
				method: 'straight',
				notes: 'Pull elbows straight down, not back. Full stretch at the top.'
			},
			{
				id: 'chest-supported-row',
				name: 'Chest-Supported Row',
				sets: 3,
				repRange: '10-12',
				method: 'straight',
				notes: 'Let the scapulae protract fully at the bottom. Squeeze at the top.'
			},
			{
				id: 'bayesian-curl',
				name: 'Bayesian Cable Curl',
				sets: 3,
				repRange: '10-12',
				method: 'myorep',
				notes: 'Stand facing away from the cable. Arm starts behind the torso for maximum bicep stretch.'
			},
			{
				id: 'face-pulls',
				name: 'Face Pulls',
				sets: 3,
				repRange: '15-20',
				method: 'myorep',
				notes: 'External rotation at the top. Rear delt and rotator cuff health.'
			}
		]
	},
	{
		day: 3,
		name: 'Legs',
		subtitle: '',
		location: 'Main Gym',
		exercises: [
			{
				id: 'smith-squat',
				name: 'Smith Machine / Hack Squat',
				sets: 4,
				repRange: '6-8',
				method: 'straight',
				notes: 'Feet slightly forward on Smith for extra quad stretch. Full depth.'
			},
			{
				id: 'rdl',
				name: 'Romanian Deadlift',
				sets: 3,
				repRange: '8-10',
				method: 'straight',
				notes: 'Slow eccentric (3 sec down). Feel the hamstring stretch. 1-2 RIR.'
			},
			{
				id: 'bulgarian-split',
				name: 'Bulgarian Split Squat',
				sets: 3,
				repRange: '10-12 each',
				method: 'straight',
				notes: 'Dumbbells or Smith machine. Long stride for glute stretch.'
			},
			{
				id: 'seated-ham-curl',
				name: 'Seated Hamstring Curl',
				sets: 3,
				repRange: '12-15',
				method: 'myorep',
				notes: 'Seated position pre-stretches the hamstrings. Better than lying curls.'
			},
			{
				id: 'standing-calf-raise',
				name: 'Standing Calf Raises',
				sets: 3,
				repRange: '12-15',
				method: 'myorep',
				notes: 'Full stretch at the bottom, pause 1 sec. Straight knee.'
			}
		]
	},
	{
		day: 4,
		name: 'Shoulders & Arms',
		subtitle: '',
		location: 'Condo Gym',
		exercises: [
			{
				id: 'cable-lateral-raise-condo',
				name: 'Cable Lateral Raise',
				sets: 4,
				repRange: '15-20',
				method: 'myorep',
				notes: 'Cross-body start for full stretch. #1 priority exercise for the V-shape.'
			},
			{
				id: 'reverse-cable-crossover',
				name: 'Reverse Cable Crossover',
				sets: 3,
				repRange: '15-20',
				method: 'myorep',
				notes: 'High cable, cross the arms over for full rear delt stretch.'
			},
			{
				id: 'incline-db-curl',
				name: 'Incline Dumbbell Curl',
				sets: 3,
				repRange: '10-12',
				method: 'myorep',
				notes: 'Bench at ~45 degrees. Arms hang behind the torso, stretching the long head.'
			},
			{
				id: 'overhead-db-tri',
				name: 'Overhead Dumbbell Triceps Extension',
				sets: 3,
				repRange: '12-15',
				method: 'myorep',
				notes: 'Both hands on one dumbbell. Full stretch overhead.'
			},
			{
				id: 'hammer-curl-combo',
				name: 'Hammer Curl to Curl Combo',
				sets: 3,
				repRange: '10-12',
				method: 'straight',
				notes: 'Hammer up, supinate down. Use slightly heavier weight than normal curls.'
			}
		]
	},
	{
		day: 5,
		name: 'Upper Hypertrophy',
		subtitle: '',
		location: 'Main Gym',
		exercises: [
			{
				id: 'db-incline-press-vol',
				name: 'Dumbbell Incline Press',
				sets: 3,
				repRange: '12-15',
				method: 'straight',
				notes: 'Lighter than Day 1. Focus on the stretch and squeeze.'
			},
			{
				id: 'half-kneel-pulldown',
				name: 'Half-Kneeling 1-Arm Lat Pulldown',
				sets: 3,
				repRange: '10-12 each',
				method: 'straight',
				notes: 'Deep stretch at the top. Pull elbow down to hip.'
			},
			{
				id: 'cable-lateral-raise-vol',
				name: 'Cable Lateral Raise',
				sets: 3,
				repRange: '15-20',
				method: 'myorep',
				notes: 'Third lateral delt session of the cycle. Frequency drives growth.'
			},
			{
				id: 'bayesian-curl-vol',
				name: 'Bayesian Cable Curl',
				sets: 3,
				repRange: '12-15',
				method: 'myorep',
				notes: 'Same stretch-focused position as Day 2.'
			},
			{
				id: 'overhead-cable-tri-vol',
				name: 'Overhead Cable Triceps Extension',
				sets: 3,
				repRange: '12-15',
				method: 'myorep',
				notes: 'Long head emphasis again.'
			}
		]
	}
];
