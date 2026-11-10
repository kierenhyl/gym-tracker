<script>
	import { logSession } from './store.js';
	import { bandLabel, sessionScore } from './bands.js';
	import { mainWeight } from './sessions.js';
	import { KIND_LABELS, preview, repsLabel } from './prescribe.js';
	import SetBars from './SetBars.svelte';
	import { fade } from 'svelte/transition';
	import Sheet from './Sheet.svelte';

	// sessions: this variant's history, every band, oldest first
	// record:   the best session in today's band, for the new-best flash
	let { exercise, prescription, sessions = [], record = null, readiness, onClose, onExerciseComplete, onPR } = $props();

	// One row per programmed set, pre-filled with today's target: you only
	// touch a number you missed. After topping the range the weight starts
	// empty, because only you know the next step on this machine; the first
	// weight you type fills the rows you haven't changed.
	const count = prescription?.sets ?? exercise.sets ?? 3;
	const startWeight = prescription?.loadUp ? '' : (prescription?.targetLoad ?? prescription?.last?.weight ?? '');
	let rows = $state(
		Array.from({ length: count }, (_, i) => ({
			weight: startWeight,
			reps: prescription?.targetReps?.[i] ?? '',
			weightTouched: false
		}))
	);
	let showPRFlash = $state(false);

	function setWeight(i, value) {
		rows[i].weight = value;
		rows[i].weightTouched = true;
		if (i === 0) {
			for (let j = 1; j < rows.length; j++) if (!rows[j].weightTouched) rows[j].weight = value;
		}
	}

	let done = $derived(
		rows
			.map((r) => ({ weight: parseFloat(r.weight), reps: parseInt(r.reps) }))
			.filter((r) => r.weight > 0 && r.reps > 0)
	);
	let canSave = $derived(done.length > 0);
	let band = $derived(prescription?.band ?? exercise.defaultBand);
	let lo = $derived(prescription?.lo);
	let hi = $derived(prescription?.hi);

	// Scored the way sessions.js will read it back: the sets at the main weight.
	let w = $derived(canSave ? mainWeight(done) : null);
	let atMain = $derived(done.filter((r) => r.weight === w).map((r) => r.reps));
	let score = $derived(canSave ? sessionScore(w, atMain.reduce((a, b) => a + b, 0)) : 0);
	let beatsRecord = $derived(canSave && (!record || score > record.score));

	// What these sets mean for next time, by the same rules that set today's.
	let next = $derived(canSave ? preview({ exercise, sessions, band, weight: w, reps: atMain }) : null);
	const TONE_TEXT = { push: 'text-accent', new: 'text-pr', hold: 'text-text-dim', 'back-off': 'text-amber' };

	// Same hero row and arrow language as the card, so the two screens read
	// identically.
	let dir = $derived(prescription?.direction);
	let tone = $derived(dir?.tone ?? 'push');
	let loadArrow = $derived(dir?.move === 'load' ? (tone === 'back-off' ? '↓' : '↑') : '');
	let repsArrow = $derived(dir?.move === 'reps' ? '↑' : '');
	let toneText = $derived(
		tone === 'back-off' ? 'text-amber' : tone === 'hold' ? 'text-text-dim' : 'text-accent'
	);
	let loadText = $derived(
		prescription?.targetLoad == null
			? '—'
			: `${prescription.loadUp ? '> ' : ''}${prescription.targetLoad}${loadArrow}`
	);

	function handleSave() {
		if (!canSave) return;
		const isPR = beatsRecord && !!record;
		logSession(exercise, { sets: done, band }, { readiness });
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

<Sheet eyebrow="{bandLabel(band)} · {count} × {lo}-{hi}" title={exercise.name} {onClose}>

		{#if prescription}
			<div class="mb-4 rounded-xl border border-accent/25 bg-accent/5 p-3.5">
				<div class="flex items-baseline gap-2.5 mb-3">
					<div>
						<div class="t-display font-mono font-bold tabular-nums {loadArrow ? toneText : 'text-text'}">{loadText}</div>
						<div class="t-label text-text-muted">kg</div>
					</div>
					<span class="t-display font-mono text-text-dim/50">×</span>
					<div>
						<div class="t-display font-mono font-bold tabular-nums {repsArrow ? toneText : 'text-text'}">{repsLabel(prescription)}{repsArrow}</div>
						<div class="t-label text-text-muted">reps · {count} sets</div>
					</div>
					<span class="t-label ml-auto flex-shrink-0 text-right {toneText}">{KIND_LABELS[prescription.kind] ?? 'today'}</span>
				</div>
				<p class="t-meta text-accent">{exercise.effort ?? 'Stop 1-2 reps short'}</p>
				{#if prescription.note}
					<p class="t-meta mt-1 {tone === 'back-off' ? 'text-amber' : 'text-text-muted'}">{prescription.note}</p>
				{/if}
			</div>
		{/if}

		<!-- One row per set, pre-filled. Clear the reps to skip a set. -->
		<div class="mb-4">
			<div class="grid grid-cols-[2.5rem_1fr_1fr] gap-2 mb-1.5">
				<span></span>
				<span class="text-center font-mono t-meta text-text-muted tracking-wider">KG</span>
				<span class="text-center font-mono t-meta text-text-muted tracking-wider">REPS</span>
			</div>
			<div class="space-y-2">
				{#each rows as row, i}
					<div class="grid grid-cols-[2.5rem_1fr_1fr] gap-2 items-center">
						<span class="font-mono t-label text-text-muted text-center">SET {i + 1}</span>
						<input type="number" inputmode="decimal" step="any" aria-label="Set {i + 1} weight"
							value={row.weight} oninput={(e) => setWeight(i, e.currentTarget.value)}
							placeholder={prescription?.loadUp ? `> ${prescription.targetLoad}` : '0'}
							class="w-full h-12 px-2 rounded-xl bg-bg-input border border-border text-xl font-mono font-bold text-center focus:outline-none focus:border-accent" />
						<input type="number" inputmode="numeric" aria-label="Set {i + 1} reps"
							bind:value={row.reps}
							placeholder={String(lo ?? 0)}
							class="w-full h-12 px-2 rounded-xl bg-bg-input border border-border text-xl font-mono font-bold text-center focus:outline-none focus:border-accent" />
					</div>
				{/each}
			</div>
		</div>

		<!-- What these sets mean for next time. -->
		<div class="mb-4 min-h-14">
			<SetBars {lo} {hi} sets={count} from={rows.map((r) => (parseInt(r.reps) > 0 ? parseInt(r.reps) : null))}
				to={prescription?.targetReps ?? null} tone={next?.tone === 'back-off' ? 'back-off' : 'push'} />
			{#if next}
				<p class="t-meta mt-1 {TONE_TEXT[next.tone]}">
					{next.text}{#if beatsRecord && record}<span class="text-pr">{' · new best'}</span>{/if}
				</p>
			{/if}
		</div>

		<button onclick={handleSave} disabled={!canSave}
			class="w-full py-4 rounded-xl bg-accent/15 border border-accent/30 text-accent font-semibold text-base mb-3 disabled:opacity-40 transition-all active:scale-[0.98]">
			Log it
		</button>
		<button onclick={finish} class="w-full py-3 rounded-xl bg-bg border border-border text-text-dim font-medium">
			Mark done — nothing to log
		</button>
</Sheet>

{#if showPRFlash}
	<div class="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none" transition:fade={{ duration: 150 }}>
		<div class="text-center">
			<div class="font-mono text-5xl font-bold text-pr drop-shadow-[0_0_30px_rgba(250,204,21,0.4)]">NEW PR!</div>
			<div class="font-mono text-sm text-pr/70 mt-2 tracking-widest">{bandLabel(band)}</div>
		</div>
	</div>
{/if}
