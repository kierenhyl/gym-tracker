<script>
	import { updateRecord, VOLUME_LOAD_PCT } from './store.js';
	import { fly, fade } from 'svelte/transition';

	let { exercise, record, onClose, onExerciseComplete, onPR } = $props();

	let isVolume = $derived(exercise.method === 'volume');

	let weight = $state(record?.weight ?? '');
	let reps = $state(record?.reps ?? '');
	let showPRFlash = $state(false);

	// For volume exercises, suggest a working load at ~60% of the best weight.
	let suggestedLoad = $derived(
		isVolume && record?.weight
			? Math.round(record.weight * VOLUME_LOAD_PCT * 2) / 2
			: null
	);

	// Would the entered numbers beat the current record?
	let beatsRecord = $derived.by(() => {
		const w = parseFloat(weight);
		const r = parseInt(reps);
		if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) return false;
		if (!record) return true;
		if (isVolume) return w * r > record.volume;
		return w > record.weight || (w === record.weight && r > record.reps);
	});

	function handleSave() {
		const w = parseFloat(weight);
		const r = parseInt(reps);
		if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) return;

		const isPR = beatsRecord;
		updateRecord(exercise.id, w, r);

		if (isPR) {
			showPRFlash = true;
			onPR();
			setTimeout(() => {
				showPRFlash = false;
				finish();
			}, 1200);
		} else {
			finish();
		}
	}

	function handleMarkDone() {
		finish();
	}

	function finish() {
		onExerciseComplete();
		onClose();
	}
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
				<span class="font-mono text-[10px] font-semibold tracking-widest {isVolume ? 'text-success' : exercise.method === 'myorep' ? 'text-accent' : 'text-text-dim'}">
					{isVolume ? 'HIGH VOLUME' : exercise.method === 'myorep' ? 'MYO-REP' : 'STRAIGHT'}
				</span>
				<span class="font-mono text-[10px] text-text-muted">
					{exercise.sets} x {exercise.repRange}
				</span>
			</div>
			<h2 class="text-xl font-bold">{exercise.name}</h2>

			{#if record}
				<div class="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pr/10 border border-pr/20">
					<span class="font-mono text-xs text-pr/70">{isVolume ? 'BEAT VOLUME:' : 'BEAT:'}</span>
					<span class="font-mono text-sm font-bold text-pr">
						{record.weight}kg x {record.reps}{isVolume ? ` = ${record.volume}` : ''}
					</span>
				</div>
			{:else}
				<div class="mt-2 font-mono text-xs text-accent/70">No record yet — set your first one.</div>
			{/if}

			{#if isVolume && suggestedLoad}
				<div class="mt-2 font-mono text-[11px] text-success/80">
					Suggested load ≈ {suggestedLoad}kg ({Math.round(VOLUME_LOAD_PCT * 100)}% of max), chase total reps.
				</div>
			{/if}
		</div>

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
					{isVolume ? 'TOTAL REPS' : 'REPS'}
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

		<!-- Live volume / beat indicator -->
		{#if isVolume && parseFloat(weight) > 0 && parseInt(reps) > 0}
			<div class="mb-4 text-center font-mono text-xs {beatsRecord ? 'text-success' : 'text-text-dim'}">
				Total volume: {parseFloat(weight) * parseInt(reps)}{beatsRecord ? ' — new best!' : ''}
			</div>
		{:else if !isVolume && beatsRecord && record}
			<div class="mb-4 text-center font-mono text-xs text-success">New record!</div>
		{/if}

		<!-- Save Record -->
		<button
			onclick={handleSave}
			class="w-full py-4 rounded-xl bg-pr/15 border border-pr/30 text-pr font-semibold text-base hover:bg-pr/25 transition-all active:scale-[0.98] mb-3"
		>
			Save Record
		</button>

		<!-- Mark Done (no new record) -->
		<button
			onclick={handleMarkDone}
			class="w-full py-3 rounded-xl bg-bg border border-border text-text-dim font-medium hover:text-text hover:border-border-focus transition-all active:scale-[0.98]"
		>
			Mark Done — didn't beat it
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
		<div class="text-center" in:fly={{ y: 20, duration: 200 }}>
			<div class="font-mono text-5xl font-bold text-pr drop-shadow-[0_0_30px_rgba(250,204,21,0.4)]">
				NEW PR!
			</div>
		</div>
	</div>
{/if}
