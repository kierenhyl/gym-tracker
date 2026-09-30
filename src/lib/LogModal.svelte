<script>
	import { logSession } from './store.js';
	import { bandLabel, sessionScore, MAX_SETS } from './bands.js';
	import { KIND_LABELS, preview } from './prescribe.js';
	import TotalBar from './TotalBar.svelte';
	import { fade } from 'svelte/transition';
	import Sheet from './Sheet.svelte';

	// sessions: this variant's history, every band, oldest first
	// record:   the best session in today's band, for the new-best flash
	let { exercise, prescription, sessions = [], record = null, readiness, onClose, onExerciseComplete, onPR } = $props();

	// Two numbers, typed. The weight starts at today's target; after topping the
	// range it starts empty, because only you know the next step on this machine.
	let weight = $state(prescription?.loadUp ? '' : (prescription?.targetLoad ?? prescription?.last?.weight ?? ''));
	let total = $state('');
	let showPRFlash = $state(false);

	let w = $derived(parseFloat(weight));
	let t = $derived(parseInt(total));
	let canSave = $derived(w > 0 && t > 0);
	let band = $derived(prescription?.band ?? exercise.defaultBand);
	let lo = $derived(prescription?.targetLow);
	let hi = $derived(prescription?.targetHigh);

	let beatsRecord = $derived(canSave && (!record || sessionScore(w, t) > record.score));

	// What this total means for next time, by the same rules that set today's.
	let next = $derived(canSave ? preview({ exercise, sessions, band, weight: w, total: t }) : null);
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
	let repsText = $derived(
		prescription?.targetReps == null ? `${lo}-${hi}` : `${prescription.targetReps}${repsArrow}`
	);

	function handleSave() {
		if (!canSave) return;
		const isPR = beatsRecord && !!record;
		logSession(exercise, { weight: w, total: t, band }, { readiness });
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

<Sheet eyebrow="{bandLabel(band)} · {lo}-{hi} total" title={exercise.name} {onClose}>

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
						<div class="t-label text-text-muted">total reps</div>
					</div>
					<span class="t-label ml-auto flex-shrink-0 text-right {toneText}">{KIND_LABELS[prescription.kind] ?? 'today'}</span>
				</div>
				<p class="t-meta text-accent">No more than {MAX_SETS} sets to reach this</p>
				{#if prescription.note}
					<p class="t-meta mt-1 {tone === 'back-off' ? 'text-amber' : 'text-text-muted'}">{prescription.note}</p>
				{/if}
			</div>
		{/if}

		<!-- Two numbers. Nothing per set. -->
		<div class="grid grid-cols-2 gap-2.5 mb-4">
			<label class="block">
				<span class="block text-center font-mono t-meta text-text-muted tracking-wider mb-1.5">WEIGHT (KG)</span>
				<input type="number" inputmode="decimal" step="any" bind:value={weight}
					placeholder={prescription?.loadUp ? `> ${prescription.targetLoad}` : '0'}
					class="w-full h-16 px-3 rounded-xl bg-bg-input border border-border text-2xl font-mono font-bold text-center focus:outline-none focus:border-accent" />
			</label>
			<label class="block">
				<span class="block text-center font-mono t-meta text-text-muted tracking-wider mb-1.5">TOTAL REPS</span>
				<!-- svelte-ignore a11y_autofocus -->
				<input type="number" inputmode="numeric" bind:value={total} autofocus={!prescription?.loadUp}
					placeholder={String(prescription?.targetReps ?? lo ?? 0)}
					class="w-full h-16 px-3 rounded-xl bg-bg-input border border-border text-2xl font-mono font-bold text-center focus:outline-none focus:border-accent" />
			</label>
		</div>

		<!-- What that total means for next time. -->
		<div class="mb-4 min-h-14">
			<TotalBar {lo} {hi} from={t > 0 ? t : null} to={prescription?.targetReps ?? null} tone={next?.tone === 'back-off' ? 'back-off' : 'push'} />
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
