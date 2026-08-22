<script>
	import { updateRecord } from './store.js';
	import { bucketLabel, classifyBand, nearestEligibleBand, scoreFor, formatScore } from './bands.js';
	import { KIND_LABELS } from './prescribe.js';
	import { fly, fade } from 'svelte/transition';

	// bucketRecords: { [bucket]: record } for this movement — we need every band,
	// because the band you actually land in may not be the one prescribed.
	let { exercise, prescription, bucketRecords = {}, readiness, onClose, onExerciseComplete, onPR } =
		$props();

	let isMyo = $derived(exercise.structure === 'myorep');

	// Prefill from today's instruction, not from an all-time PR.
	let weight = $state(prescription?.targetLoad ?? prescription?.last?.weight ?? '');
	let reps = $state(prescription?.targetReps ?? '');
	let totalReps = $state('');
	let rir = $state(null);
	let showPRFlash = $state(false);

	let w = $derived(parseFloat(weight));
	let r = $derived(parseInt(reps));
	let tr = $derived(parseInt(totalReps));
	let valid = $derived(!isNaN(w) && !isNaN(r) && w > 0 && r > 0);

	// Which band these reps actually land in — shown live, so it is never a
	// surprise which record you are competing against.
	let liveBucket = $derived(
		!valid
			? null
			: isMyo
				? 'myo'
				: nearestEligibleBand(classifyBand(r), exercise.bands)
	);

	let repsForScore = $derived(isMyo && !isNaN(tr) && tr > 0 ? tr : r);
	let liveScore = $derived(valid && liveBucket ? scoreFor(liveBucket, w, repsForScore) : 0);

	// The record shown up front is the one for today's prescribed band.
	let bucketRecord = $derived(bucketRecords[prescription?.bucket ?? exercise.defaultBand]);

	// ...but you are only ever judged against the band you actually landed in.
	let liveRecord = $derived(liveBucket ? bucketRecords[liveBucket] : null);
	let beatsRecord = $derived(
		valid && !!liveBucket && (!liveRecord || liveScore > liveRecord.score)
	);

	let hitTarget = $derived(
		valid && prescription?.targetReps != null && (isMyo ? repsForScore : r) >= prescription.targetReps
	);

	const RIR_OPTIONS = [
		{ value: 2, label: 'HAD 2+ MORE', hint: 'left reps in the tank' },
		{ value: 1, label: 'HAD 1 MORE', hint: 'about right' },
		{ value: 0, label: 'NOTHING LEFT', hint: 'went to failure' }
	];

	function handleSave() {
		if (!valid) return;
		const isPR = beatsRecord;
		updateRecord(exercise.id, w, r, {
			rir,
			totalReps: isMyo ? tr : null,
			readiness,
			movement: exercise.movement,
			structure: exercise.structure,
			bands: exercise.bands
		});

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
		<div class="w-10 h-1 rounded-full bg-border mx-auto mb-5"></div>

		<!-- Exercise Info -->
		<div class="mb-4">
			<div class="flex items-center gap-2 mb-1">
				<span class="font-mono text-[10px] font-semibold tracking-widest {isMyo ? 'text-accent' : prescription?.band === 'heavy' ? 'text-pr' : prescription?.band === 'volume' ? 'text-success' : 'text-text-dim'}">
					{isMyo ? 'MYO-REP' : bucketLabel(prescription?.band)}
				</span>
				<span class="font-mono text-[10px] text-text-muted">
					{exercise.sets} sets · {prescription?.targetLow}-{prescription?.targetHigh} reps
				</span>
			</div>
			<h2 class="text-xl font-bold">{exercise.name}</h2>
		</div>

		<!-- Today's instruction -->
		{#if prescription}
			<div class="mb-4 rounded-xl border border-accent/25 bg-accent/5 p-3.5">
				<div class="flex items-baseline gap-2 mb-1">
					<span class="font-mono text-[9px] font-bold tracking-widest text-accent">
						{KIND_LABELS[prescription.kind] ?? 'TODAY'}
					</span>
					{#if prescription.heavyTest}
						<span class="font-mono text-[9px] font-bold tracking-widest text-pr">HEAVY TEST</span>
					{/if}
				</div>
				<div class="font-mono text-lg font-bold text-text mb-1.5">{prescription.headline}</div>
				<p class="text-xs text-text-muted leading-relaxed">{prescription.reason}</p>
			</div>
		{/if}

		<!-- Band record (only the one you're training today) -->
		{#if bucketRecord}
			<div class="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pr/10 border border-pr/20">
				<span class="font-mono text-xs text-pr/70">{bucketLabel(bucketRecord.bucket)} BEST:</span>
				<span class="font-mono text-sm font-bold text-pr">
					{bucketRecord.weight}kg × {bucketRecord.totalReps ?? bucketRecord.reps}
				</span>
				{#if bucketRecord.legacy}
					<span class="font-mono text-[9px] text-text-muted">(pre-bands)</span>
				{/if}
			</div>
		{/if}

		<!-- Input Row -->
		<div class="flex gap-3 mb-3">
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
					{isMyo ? 'ACTIVATION REPS' : 'REPS'}
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
			{#if isMyo}
				<div class="flex-1">
					<label for="total-input" class="block font-mono text-[10px] text-text-muted tracking-wider mb-1.5">
						TOTAL REPS
					</label>
					<input
						id="total-input"
						type="number"
						inputmode="numeric"
						bind:value={totalReps}
						class="w-full h-14 px-4 rounded-xl bg-bg-input border border-border text-xl font-mono font-bold text-center focus:outline-none focus:border-accent transition-colors"
						placeholder="0"
					/>
				</div>
			{/if}
		</div>

		{#if isMyo}
			<p class="mb-4 font-mono text-[10px] text-text-muted leading-relaxed">
				Activation set to near failure, then mini-sets with 10-20s rest. Total = every rep including
				the activation set.
			</p>
		{/if}

		<!-- Effort -->
		<div class="mb-4">
			<div class="font-mono text-[10px] text-text-muted tracking-wider mb-1.5">
				HOW CLOSE TO FAILURE?
			</div>
			<div class="grid grid-cols-3 gap-2">
				{#each RIR_OPTIONS as opt}
					<button
						onclick={() => (rir = opt.value)}
						class="py-2.5 px-1 rounded-xl border text-center transition-all active:scale-[0.97] {rir === opt.value
							? 'bg-accent/15 border-accent/40 text-accent'
							: 'bg-bg-input border-border text-text-dim hover:border-border-focus'}"
					>
						<div class="font-mono text-[10px] font-bold tracking-wider">{opt.label}</div>
						<div class="font-mono text-[9px] text-text-muted mt-0.5">{opt.hint}</div>
					</button>
				{/each}
			</div>
			{#if rir === null && valid}
				<div class="mt-1.5 font-mono text-[10px] text-text-muted">
					Needed to work out whether to add load next time.
				</div>
			{/if}
		</div>

		<!-- Live feedback: which band, did it hit target, is it a best -->
		{#if valid && liveBucket}
			<div class="mb-4 text-center font-mono text-xs">
				<span class="text-text-dim">
					Lands in <span class="font-bold text-text">{bucketLabel(liveBucket)}</span>
					· {formatScore(liveBucket, liveScore)}
				</span>
				{#if hitTarget}
					<span class="text-success"> · target hit</span>
				{/if}
				{#if beatsRecord}
					<span class="text-pr"> · new best</span>
				{/if}
			</div>
		{/if}

		<button
			onclick={handleSave}
			disabled={!valid}
			class="w-full py-4 rounded-xl bg-pr/15 border border-pr/30 text-pr font-semibold text-base hover:bg-pr/25 transition-all active:scale-[0.98] mb-3 disabled:opacity-40 disabled:active:scale-100"
		>
			Log Set
		</button>

		<button
			onclick={finish}
			class="w-full py-3 rounded-xl bg-bg border border-border text-text-dim font-medium hover:text-text hover:border-border-focus transition-all active:scale-[0.98]"
		>
			Mark done — nothing to log
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
			<div class="font-mono text-sm text-pr/70 mt-2 tracking-widest">
				{bucketLabel(liveBucket)}
			</div>
		</div>
	</div>
{/if}
