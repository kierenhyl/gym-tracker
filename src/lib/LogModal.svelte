<script>
	import { updateRecords } from './store.js';
	import { bucketLabel, classifyBand, nearestEligibleBand, scoreFor, formatScore } from './bands.js';
	import { KIND_LABELS } from './prescribe.js';
	import RangeTrack from './RangeTrack.svelte';
	import { fly, fade, slide } from 'svelte/transition';

	let { exercise, prescription, bucketRecords = {}, readiness, onClose, onExerciseComplete, onPR } = $props();

	let isMyo = $derived(exercise.structure === 'myorep');
	let plannedSets = $derived(Math.max(1, exercise.sets ?? 1));

	// One row per programmed set, matching how the app already logs. Collapsing
	// to a single row stays one tap away for a rushed session.
	let singleSet = $state(false);
	let rows = $state([]);
	let rir = $state(null);
	let totalReps = $state('');
	let showPRFlash = $state(false);
	let flashBucket = $state(null);

	$effect(() => {
		const n = isMyo || singleSet ? 1 : plannedSets;
		if (rows.length === n) return;
		const load = prescription?.targetLoad ?? prescription?.last?.weight ?? '';
		const reps = prescription?.targetReps ?? '';
		rows = Array.from({ length: n }, (_, i) => rows[i] ?? { weight: load, reps: i === 0 ? reps : '' });
	});

	function parsed(row) {
		const w = parseFloat(row.weight);
		const r = parseInt(row.reps);
		return w > 0 && r > 0 ? { weight: w, reps: r } : null;
	}

	let valid = $derived(rows.map(parsed).filter(Boolean));
	let canSave = $derived(valid.length > 0);
	let tr = $derived(parseInt(totalReps));

	function bucketOf(reps) {
		return isMyo ? 'myo' : nearestEligibleBand(classifyBand(reps), exercise.bands);
	}

	// Best set of the group, judged against the record for the band it landed in.
	let bestOfEntry = $derived.by(() => {
		let best = null;
		for (const set of valid) {
			const bucket = bucketOf(set.reps);
			const reps = isMyo && tr > 0 ? tr : set.reps;
			const score = scoreFor(bucket, set.weight, reps);
			if (!best || score > best.score) best = { ...set, bucket, score };
		}
		return best;
	});

	let beatsRecord = $derived.by(() => {
		if (!bestOfEntry) return false;
		const rec = bucketRecords[bestOfEntry.bucket];
		return !rec || bestOfEntry.score > rec.score;
	});

	let shownRecord = $derived(bucketRecords[prescription?.bucket ?? exercise.defaultBand]);

	// Same arrow language as the card, so the two screens read identically.
	let dir = $derived(prescription?.direction);
	let tone = $derived(dir?.tone ?? 'push');
	let loadArrow = $derived(dir?.move === 'load' ? (tone === 'back-off' ? '↓' : '↑') : '');
	let repsArrow = $derived(dir?.move === 'reps' ? '↑' : '');
	let toneText = $derived(
		tone === 'back-off' ? 'text-amber' : tone === 'hold' ? 'text-text-dim' : 'text-accent'
	);

	const RIR_OPTIONS = [
		{ value: 2, label: 'HAD 2+ MORE', hint: 'left reps in the tank' },
		{ value: 1, label: 'HAD 1 MORE', hint: 'about right' },
		{ value: 0, label: 'NOTHING LEFT', hint: 'went to failure' }
	];

	function handleSave() {
		if (!canSave) return;
		const isPR = beatsRecord;
		flashBucket = bestOfEntry?.bucket ?? null;
		// One effort rating for the exercise, stamped on every set in the group:
		// whichever set later counts as the performance then carries it.
		updateRecords(
			exercise.id,
			valid.map((s) => ({ ...s, rir, totalReps: isMyo ? tr : null })),
			{
				readiness,
				movement: exercise.movement,
				structure: exercise.structure,
				bands: exercise.bands,
				targetRepRange: exercise.repRange
			}
		);
		if (isPR) {
			showPRFlash = true;
			onPR();
			setTimeout(() => { showPRFlash = false; finish(); }, 1200);
		} else {
			finish();
		}
	}

	function finish() { onExerciseComplete(); onClose(); }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="fixed inset-0 z-40 bg-bg/90 backdrop-blur-sm" onclick={onClose} transition:fade={{ duration: 150 }}></div>

<div class="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto" transition:fly={{ y: 300, duration: 250 }}>
	<div class="max-w-md mx-auto bg-bg-card rounded-t-2xl border-t border-x border-border p-5 pb-8">
		<div class="w-10 h-1 rounded-full bg-border mx-auto mb-5"></div>

		<div class="mb-4">
			<div class="flex items-center gap-2 mb-1">
				<span class="font-mono t-meta font-semibold tracking-widest {isMyo ? 'text-accent' : prescription?.band === 'heavy' ? 'text-pr' : 'text-text-dim'}">
					{bucketLabel(prescription?.bucket ?? exercise.defaultBand)}
				</span>
				<span class="font-mono t-meta text-text-muted">
					{exercise.sets} sets · {exercise.repRange}{exercise.rir ? ` · ${exercise.rir}` : ''}
				</span>
			</div>
			<h2 class="text-xl font-bold">{exercise.name}</h2>
		</div>

		{#if prescription}
			<div class="mb-4 rounded-xl border border-accent/25 bg-accent/5 p-3.5">
				<div class="flex items-baseline gap-2 mb-2">
					{#if prescription.targetLoad != null}
						<span class="t-display font-mono font-bold tabular-nums">
							<span class={loadArrow ? toneText : 'text-text'}>{prescription.targetLoad}{loadArrow}</span><span class="t-label text-text-muted">kg</span>
							<span class="text-text-dim font-normal"> × </span><span class={repsArrow ? toneText : 'text-text'}>{prescription.targetReps}{repsArrow}</span>
						</span>
					{:else}
						<span class="t-display font-mono font-bold text-text-dim">{prescription.targetLow}–{prescription.targetHigh} reps</span>
					{/if}
					<span class="t-label ml-auto flex-shrink-0 {toneText}">{KIND_LABELS[prescription.kind] ?? 'today'}</span>
				</div>
				{#if dir}
					<div class="mb-2.5">
						<RangeTrack lo={dir.reps.lo} hi={dir.reps.hi} from={dir.reps.from} to={dir.reps.to} {tone} />
					</div>
				{/if}
				{#if prescription.heavyTest}
					<div class="t-label text-pr mb-1.5">Heavy test</div>
				{/if}
				<p class="t-body text-text-muted">{prescription.reason}</p>
			</div>
		{/if}

		{#if shownRecord}
			<!-- A resting record is reference, not an achievement. Gold is reserved
			     for the moment one is actually set. -->
			<div class="mb-4 t-meta text-text-muted">
				{bucketLabel(shownRecord.bucket).toLowerCase()} best
				<span class="text-text-dim">{shownRecord.weight}kg × {shownRecord.totalReps ?? shownRecord.reps}</span>
				{#if shownRecord.legacy}<span> · pre-bands</span>{/if}
			</div>
		{/if}

		<!-- Sets -->
		<div class="space-y-2 mb-3">
			<div class="flex items-center gap-2 font-mono t-meta text-text-muted tracking-wider">
				<span class="w-6"></span>
				<span class="flex-1 text-center">WEIGHT (KG)</span>
				<span class="flex-1 text-center">{isMyo ? 'ACTIVATION' : 'REPS'}</span>
			</div>
			{#each rows as row, i}
				<div class="flex items-center gap-2" transition:slide={{ duration: 120 }}>
					<span class="w-6 font-mono t-meta text-text-muted text-right">{isMyo ? '·' : i + 1}</span>
					<input type="number" inputmode="decimal" step="0.5" bind:value={row.weight} placeholder="0"
						class="flex-1 min-w-0 h-12 px-3 rounded-xl bg-bg-input border border-border text-lg font-mono font-bold text-center focus:outline-none focus:border-accent" />
					<input type="number" inputmode="numeric" bind:value={row.reps} placeholder="0"
						class="flex-1 min-w-0 h-12 px-3 rounded-xl bg-bg-input border border-border text-lg font-mono font-bold text-center focus:outline-none focus:border-accent" />
				</div>
			{/each}
			{#if isMyo}
				<div class="flex items-center gap-2">
					<span class="w-6"></span>
					<span class="flex-1 font-mono t-meta text-text-muted text-right pr-2">TOTAL REPS</span>
					<input type="number" inputmode="numeric" bind:value={totalReps} placeholder="0"
						class="flex-1 min-w-0 h-12 px-3 rounded-xl bg-bg-input border border-border text-lg font-mono font-bold text-center focus:outline-none focus:border-accent" />
				</div>
				<p class="font-mono t-meta text-text-muted leading-relaxed pl-8">
					Activation set to near failure, then mini-sets with 10-20s rest. Total counts every rep.
				</p>
			{/if}
		</div>

		{#if !isMyo && plannedSets > 1}
			<button onclick={() => (singleSet = !singleSet)}
				class="mb-4 font-mono t-meta tracking-wider text-text-muted underline underline-offset-2">
				{singleSet ? `show all ${plannedSets} sets` : 'just log one set'}
			</button>
		{/if}

		<!-- Effort -->
		<div class="mb-4">
			<div class="font-mono t-meta text-text-muted tracking-wider mb-1.5">HOW CLOSE TO FAILURE ON YOUR HARDEST SET?</div>
			<div class="grid grid-cols-3 gap-2">
				{#each RIR_OPTIONS as opt}
					<button onclick={() => (rir = opt.value)}
						class="py-2.5 px-1 rounded-xl border text-center transition-all active:scale-[0.97] {rir === opt.value ? 'bg-accent/15 border-accent/40 text-accent' : 'bg-bg-input border-border text-text-dim hover:border-border-focus'}">
						<div class="font-mono t-meta font-bold tracking-wider">{opt.label}</div>
						<div class="font-mono t-meta text-text-muted mt-0.5">{opt.hint}</div>
					</button>
				{/each}
			</div>
			{#if rir === null && canSave}
				<div class="mt-1.5 font-mono t-meta text-text-muted">Needed to work out whether to add load next time.</div>
			{/if}
		</div>

		{#if bestOfEntry}
			<div class="mb-4 text-center font-mono text-xs">
				<span class="text-text-dim">
					Best set lands in <span class="font-bold text-text">{bucketLabel(bestOfEntry.bucket)}</span>
					· {formatScore(bestOfEntry.bucket, bestOfEntry.score)}
				</span>
				{#if beatsRecord}<span class="text-pr"> · new best</span>{/if}
			</div>
		{/if}

		<button onclick={handleSave} disabled={!canSave}
			class="w-full py-4 rounded-xl bg-accent/15 border border-accent/30 text-accent font-semibold text-base mb-3 disabled:opacity-40 transition-all active:scale-[0.98]">
			Log {valid.length > 1 ? `${valid.length} sets` : 'set'}
		</button>
		<button onclick={finish} class="w-full py-3 rounded-xl bg-bg border border-border text-text-dim font-medium">
			Mark done — nothing to log
		</button>
	</div>
</div>

{#if showPRFlash}
	<div class="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none" transition:fade={{ duration: 150 }}>
		<div class="text-center">
			<div class="font-mono text-5xl font-bold text-pr drop-shadow-[0_0_30px_rgba(250,204,21,0.4)]">NEW PR!</div>
			<div class="font-mono text-sm text-pr/70 mt-2 tracking-widest">{bucketLabel(flashBucket)}</div>
		</div>
	</div>
{/if}
