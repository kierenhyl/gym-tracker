<script>
	import { logSet, workoutLog } from './store.js';
	import { fly, fade } from 'svelte/transition';

	let { exercise, pr, onClose, onExerciseComplete, onPR } = $props();

	let weight = $state(pr?.weight ?? '');
	let reps = $state('');
	let setsLogged = $state([]);
	let showPRFlash = $state(false);
	let isMyoRepPhase = $state(false);
	let myoRepActivationReps = $state(0);
	let myoRepTotalReps = $state(0);
	let exerciseCompleted = $state(false);

	let isMyoRep = $derived(exercise.method === 'myorep');

	function handleLog() {
		const w = parseFloat(weight);
		const r = parseInt(reps);
		if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) return;

		const isActivation = isMyoRep && !isMyoRepPhase && setsLogged.length === 0;

		// Check PR
		let isPR = false;
		if (!isMyoRep || isActivation) {
			if (!pr || w > pr.weight || (w === pr.weight && r > pr.reps)) {
				isPR = true;
			}
		}

		const entry = { weight: w, reps: r, isActivation, isPR };
		setsLogged = [...setsLogged, entry];

		logSet(exercise.id, w, r, isActivation);

		if (isPR) {
			showPRFlash = true;
			onPR();
			setTimeout(() => { showPRFlash = false; }, 1500);
		}

		// Myo-rep logic
		if (isMyoRep) {
			if (isActivation) {
				myoRepActivationReps = r;
				myoRepTotalReps = r;
				isMyoRepPhase = true;
			} else if (isMyoRepPhase) {
				myoRepTotalReps += r;
			}
		}

		reps = '';
	}

	function finishMyoRepSet() {
		isMyoRepPhase = false;
		myoRepTotalReps = 0;
		myoRepActivationReps = 0;
	}

	function handleDone() {
		exerciseCompleted = true;
		onExerciseComplete();
		onClose();
	}

	// Count completed "full sets" (for straight sets) or "myo-rep rounds"
	let straightSetsCount = $derived(
		isMyoRep ? 0 : setsLogged.length
	);
</script>

<!-- Backdrop -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-40 bg-bg/90 backdrop-blur-sm"
	onclick={onClose}
	in:fade={{ duration: 150 }}
	out:fade={{ duration: 100 }}
></div>

<!-- Modal -->
<div
	class="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto"
	in:fly={{ y: 300, duration: 250, opacity: 1 }}
	out:fly={{ y: 300, duration: 200, opacity: 1 }}
>
	<div class="max-w-md mx-auto bg-bg-card rounded-t-2xl border-t border-x border-border p-5 pb-8">
		<!-- Handle bar -->
		<div class="w-10 h-1 rounded-full bg-border mx-auto mb-5"></div>

		<!-- Exercise Info -->
		<div class="mb-5">
			<div class="flex items-center gap-2 mb-1">
				<span class="font-mono text-[10px] font-semibold tracking-widest {isMyoRep ? 'text-accent' : 'text-text-dim'}">
					{isMyoRep ? 'MYO-REP MATCH' : 'STRAIGHT SETS'}
				</span>
				<span class="font-mono text-[10px] text-text-muted">
					{exercise.sets} x {exercise.repRange}
				</span>
			</div>
			<h2 class="text-xl font-bold">{exercise.name}</h2>

			{#if pr}
				<div class="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pr/10 border border-pr/20">
					<span class="font-mono text-xs text-pr/70">BEAT:</span>
					<span class="font-mono text-sm font-bold text-pr">{pr.weight}kg x {pr.reps}</span>
				</div>
			{/if}
		</div>

		<!-- Myo-Rep Progress -->
		{#if isMyoRep && isMyoRepPhase}
			<div class="mb-4 p-3 rounded-lg bg-accent/5 border border-accent/20">
				<div class="flex items-center justify-between mb-1">
					<span class="font-mono text-xs text-accent">MYO-REP PROGRESS</span>
					<button
						onclick={finishMyoRepSet}
						class="font-mono text-[10px] text-text-muted hover:text-accent"
					>
						FINISH SET
					</button>
				</div>
				<div class="flex items-baseline gap-1">
					<span class="font-mono text-2xl font-bold text-accent">{myoRepTotalReps}</span>
					<span class="font-mono text-sm text-text-muted">/ {myoRepActivationReps} target</span>
				</div>
				{#if myoRepTotalReps >= myoRepActivationReps}
					<div class="font-mono text-xs text-success mt-1">Target matched! Tap "Finish Set" to complete.</div>
				{/if}
			</div>
		{/if}

		<!-- Input Row -->
		<div class="flex gap-3 mb-4">
			<div class="flex-1">
				<label for="weight-input" class="block font-mono text-[10px] text-text-muted tracking-wider mb-1.5">
					WEIGHT (KG)
				</label>
				<input
					id="weight-input"
					type="number"
					inputmode="decimal"
					step="0.5"
					bind:value={weight}
					class="w-full h-14 px-4 rounded-xl bg-bg-input border border-border text-xl font-mono font-bold text-center focus:outline-none focus:border-accent transition-colors"
					placeholder="0"
				/>
			</div>
			<div class="flex-1">
				<label for="reps-input" class="block font-mono text-[10px] text-text-muted tracking-wider mb-1.5">
					{isMyoRep && isMyoRepPhase ? 'MINI-SET REPS' : 'REPS'}
				</label>
				<input
					id="reps-input"
					type="number"
					inputmode="numeric"
					bind:value={reps}
					class="w-full h-14 px-4 rounded-xl bg-bg-input border border-border text-xl font-mono font-bold text-center focus:outline-none focus:border-accent transition-colors"
					placeholder="0"
				/>
			</div>
		</div>

		<!-- Log Button -->
		<button
			onclick={handleLog}
			class="w-full py-4 rounded-xl bg-accent/15 border border-accent/30 text-accent font-semibold text-base hover:bg-accent/25 transition-all active:scale-[0.98] mb-4"
		>
			{#if isMyoRep && !isMyoRepPhase && setsLogged.length === 0}
				Log Activation Set
			{:else if isMyoRep && isMyoRepPhase}
				Log Mini-Set
			{:else}
				Log Set
			{/if}
		</button>

		<!-- Sets Logged -->
		{#if setsLogged.length > 0}
			<div class="mb-4">
				<div class="font-mono text-[10px] text-text-muted tracking-wider mb-2">SETS LOGGED</div>
				<div class="space-y-1.5">
					{#each setsLogged as set, i}
						<div
							class="flex items-center justify-between px-3 py-2 rounded-lg {set.isPR ? 'bg-pr/10 border border-pr/20' : 'bg-bg/50 border border-border/50'}"
							in:fly={{ y: 10, duration: 150 }}
						>
							<div class="flex items-center gap-2">
								<span class="font-mono text-[10px] text-text-muted w-5">
									{set.isActivation ? 'A' : i + 1}
								</span>
								<span class="font-mono text-sm font-semibold">
									{set.weight}kg
								</span>
								<span class="font-mono text-sm text-text-dim">
									x {set.reps}
								</span>
							</div>
							{#if set.isPR}
								<span class="font-mono text-[10px] font-bold text-pr tracking-wider">NEW PR</span>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Done Button -->
		<button
			onclick={handleDone}
			class="w-full py-3 rounded-xl bg-bg border border-border text-text-dim font-medium hover:text-text hover:border-border-focus transition-all active:scale-[0.98]"
		>
			Done with {exercise.name.split(' ').slice(0, 2).join(' ')}
		</button>
	</div>
</div>

<!-- PR Flash -->
{#if showPRFlash}
	<div
		class="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
		in:fade={{ duration: 100 }}
		out:fade={{ duration: 500 }}
	>
		<div
			class="text-center"
			in:fly={{ y: 20, duration: 200 }}
		>
			<div class="font-mono text-5xl font-bold text-pr drop-shadow-[0_0_30px_rgba(250,204,21,0.4)]">
				NEW PR!
			</div>
		</div>
	</div>
{/if}
