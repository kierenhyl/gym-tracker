<script>
	import { updateRecords } from './store.js';
	import { bucketLabel, classifyBand, nearestEligibleBand, scoreFor, formatScore } from './bands.js';
	import { KIND_LABELS } from './prescribe.js';
	import RangeTrack from './RangeTrack.svelte';
	import { fade, slide } from 'svelte/transition';
	import Sheet from './Sheet.svelte';

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

	// Same hero row and arrow language as the card, so the two screens read
	// identically.
	let dir = $derived(prescription?.direction);
	let tone = $derived(dir?.tone ?? 'push');
	let loadArrow = $derived(dir?.move === 'load' ? (tone === 'back-off' ? '↓' : '↑') : '');
	let repsArrow = $derived(dir?.move === 'reps' ? '↑' : '');
	let toneText = $derived(
		tone === 'back-off' ? 'text-amber' : tone === 'hold' ? 'text-text-dim' : 'text-accent'
	);

	let hasLoad = $derived(prescription?.targetLoad != null);
	let loadText = $derived(hasLoad ? `${prescription.targetLoad}${loadArrow}` : '—');
	let repsText = $derived(
		!hasLoad
			? `${prescription?.targetLow}-${prescription?.targetHigh}`
			: `${prescription.targetReps}${isMyo ? '+' : ''}${repsArrow}`
	);

	// Effort only changes what happens next when the reps land at an edge of the
	// range: under it (drop the load, or push harder?) or at the top of it (add
	// load, or own it first?). Mid-range the engine never reads it — see the
	// branches in prescribe.js — so we do not ask.
	//
	// Tested across every set, not just the best one: sets in a group can land in
	// different bands, and each band keeps its own history. A set that is
	// mid-range here may be top-of-range for the band it actually lands in.
	let needsEffort = $derived(
		valid.length > 0 &&
			(prescription == null ||
				valid.some((s) => s.reps < prescription.targetLow || s.reps >= prescription.targetHigh))
	);

	const RIR_OPTIONS = [
		{ value: 2, label: 'HAD 2+ MORE' },
		{ value: 1, label: 'HAD 1 MORE' },
		{ value: 0, label: 'NOTHING LEFT' }
	];

	function handleSave() {
		if (!canSave) return;
		const isPR = beatsRecord;
		flashBucket = bestOfEntry?.bucket ?? null;
		// One effort rating for the exercise, stamped on every set in the group:
		// whichever set later counts as the performance then carries it.
		updateRecords(
			exercise.id,
			valid.map((s) => ({ ...s, rir: needsEffort ? rir : null, totalReps: isMyo ? tr : null })),
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

<Sheet
	eyebrow="{bucketLabel(prescription?.bucket ?? exercise.defaultBand)} · {exercise.repRange}"
	title={exercise.name}
	{onClose}
>

		{#if prescription}
			<div class="mb-4 rounded-xl border border-accent/25 bg-accent/5 p-3.5">
				<div class="flex items-baseline gap-2.5 mb-3">
					<div>
						<div class="t-display font-mono font-bold tabular-nums {loadArrow ? toneText : 'text-text'}">{loadText}</div>
						<div class="t-label text-text-muted">kg</div>
					</div>
					<span class="t-display font-mono text-text-dim/50">×</span>
					<div>
						<div class="t-display font-mono font-bold tabular-nums {repsArrow ? toneText : 'text-text'}">{repsText}</div>
						<div class="t-label text-text-muted">{isMyo ? 'myo' : 'reps'}</div>
					</div>
					<span class="t-display font-mono text-text-dim/50">×</span>
					<div>
						<div class="t-display font-mono font-bold tabular-nums text-text-dim">{plannedSets}</div>
						<div class="t-label text-text-muted">{plannedSets === 1 ? 'set' : 'sets'}</div>
					</div>
					<span class="t-label ml-auto flex-shrink-0 text-right {toneText}">{KIND_LABELS[prescription.kind] ?? 'today'}</span>
				</div>
				{#if dir}
					<RangeTrack lo={dir.reps.lo} hi={dir.reps.hi} from={dir.reps.from} to={dir.reps.to} {tone} myo={isMyo} />
				{/if}
				{#if prescription.heavyTest}
					<div class="t-label text-pr mt-2">Heavy test</div>
				{/if}
				{#if prescription.note}
					<p class="t-meta mt-2 {tone === 'back-off' ? 'text-amber' : 'text-text-muted'}">{prescription.note}</p>
				{/if}
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
			{/if}
		</div>

		{#if !isMyo && plannedSets > 1}
			<button onclick={() => (singleSet = !singleSet)}
				class="mb-4 font-mono t-meta tracking-wider text-text-muted underline underline-offset-2">
				{singleSet ? `show all ${plannedSets} sets` : 'just log one set'}
			</button>
		{/if}

		<!-- Effort. Shown only when the answer changes the next prescription; its
		     appearing at all is the signal that this one matters. -->
		{#if needsEffort}
			<div class="mb-4" transition:slide={{ duration: 150 }}>
				<div class="font-mono t-meta text-text-muted tracking-wider mb-1.5">HOW CLOSE TO FAILURE?</div>
				<div class="grid grid-cols-3 gap-2">
					{#each RIR_OPTIONS as opt}
						<button onclick={() => (rir = opt.value)}
							class="py-3 px-1 rounded-xl border text-center transition-all active:scale-[0.97] {rir === opt.value ? 'bg-accent/15 border-accent/40 text-accent' : 'bg-bg-input border-border text-text-dim hover:border-border-focus'}">
							<div class="font-mono t-meta font-bold tracking-wider">{opt.label}</div>
						</button>
					{/each}
				</div>
			</div>
		{/if}

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
</Sheet>

{#if showPRFlash}
	<div class="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none" transition:fade={{ duration: 150 }}>
		<div class="text-center">
			<div class="font-mono text-5xl font-bold text-pr drop-shadow-[0_0_30px_rgba(250,204,21,0.4)]">NEW PR!</div>
			<div class="font-mono text-sm text-pr/70 mt-2 tracking-widest">{bucketLabel(flashBucket)}</div>
		</div>
	</div>
{/if}
