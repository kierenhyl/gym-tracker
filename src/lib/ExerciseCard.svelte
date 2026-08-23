<script>
	import { slide } from 'svelte/transition';
	import { bucketLabel } from './bands.js';
	import { KIND_LABELS } from './prescribe.js';
	import RangeTrack from './RangeTrack.svelte';

	let {
		slot, exercise, variants = [], bandRecord = null, prescription,
		staleDays = 0, isActive, isCompleted, isCurrent = false, loggedToday = null,
		onTap, onTick, onFocus, onSelectVariant, onAddVariant, onRemoveVariant, onEditHistory
	} = $props();

	let pickerOpen = $state(false);
	let notesOpen = $state(false);
	let adding = $state(false);
	let newName = $state('');

	// Only the exercise being worked on shows its full detail. Everything else
	// collapses to one line, so heights stay uniform and the day stays scannable.
	let expanded = $derived(isActive && isCurrent && !isCompleted);

	let dir = $derived(prescription?.direction);
	let tone = $derived(dir?.tone ?? 'push');

	// The arrow sits on whichever quantity should move.
	let loadArrow = $derived(dir?.move === 'load' ? (tone === 'back-off' ? '↓' : '↑') : '');
	let repsArrow = $derived(dir?.move === 'reps' ? '↑' : '');

	let accent = $derived(
		tone === 'back-off' ? 'text-amber' : tone === 'hold' ? 'text-text-dim' : 'text-accent'
	);
	let rail = $derived(
		isCompleted ? 'border-success' : expanded ? 'border-accent' : 'border-transparent'
	);

	function pick(id) { onSelectVariant?.(id); pickerOpen = false; adding = false; }
	function submitVariant() {
		const n = newName.trim();
		if (!n) return;
		onAddVariant?.(n);
		newName = ''; adding = false; pickerOpen = false;
	}
</script>

<div class="rounded-xl border-l-[3px] {rail} border-y border-r transition-colors
	{isCompleted ? 'bg-success/5 border-y-success/20 border-r-success/20'
		: expanded ? 'bg-bg-card border-y-border border-r-border'
		: 'bg-bg-card/40 border-y-border/40 border-r-border/40'}">

	{#if !expanded}
		<!-- Collapsed: one line, always the same height -->
		<button onclick={() => (isCompleted ? onEditHistory?.() : onFocus?.())}
			class="w-full flex items-center gap-3 px-3.5 py-3 text-left">
			{#if isCompleted}
				<svg class="w-3.5 h-3.5 text-success flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
			{:else}
				<span class="w-1.5 h-1.5 rounded-full bg-border flex-shrink-0"></span>
			{/if}
			<span class="t-title truncate {isCompleted ? 'text-text-dim' : 'text-text'}">{exercise.name}</span>
			<span class="t-label ml-auto flex-shrink-0 {isCompleted ? 'text-success/70' : 'text-text-muted'}">
				{loggedToday ?? ''}
			</span>
		</button>
	{:else}
		<!-- Current exercise -->
		<div class="px-3.5 pt-3 pb-3.5">
			<div class="flex items-start gap-2 mb-3">
				<h3 class="t-title font-semibold flex-1 min-w-0">
					{exercise.name}
					{#if exercise.isCustom}<span class="t-label text-accent/70 ml-1">mine</span>{/if}
				</h3>
				<button onclick={() => (pickerOpen = !pickerOpen)} aria-label="Which station"
					class="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg text-text-muted hover:text-accent {pickerOpen ? 'text-accent' : ''}">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
				</button>
				<button onclick={onTick} aria-label="Mark done without logging"
					class="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg text-text-muted hover:text-success">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
				</button>
			</div>

			<!-- The instruction: the one thing that matters -->
			<button onclick={onTap} class="w-full text-left">
				<div class="flex items-baseline gap-2 mb-2.5">
					{#if prescription?.targetLoad != null}
						<span class="t-display font-mono font-bold tabular-nums">
							<span class={loadArrow ? accent : 'text-text'}>{prescription.targetLoad}{loadArrow}</span><span class="t-label text-text-muted">kg</span>
							<span class="text-text-dim font-normal"> × </span><span class={repsArrow ? accent : 'text-text'}>{prescription.targetReps}{repsArrow}</span>
						</span>
					{:else}
						<span class="t-display font-mono font-bold text-text-dim">{prescription?.targetLow}–{prescription?.targetHigh} reps</span>
					{/if}
					<span class="t-label ml-auto flex-shrink-0 {accent}">
						{KIND_LABELS[prescription?.kind] ?? ''}
					</span>
				</div>

				{#if dir}
					<RangeTrack lo={dir.reps.lo} hi={dir.reps.hi} from={dir.reps.from} to={dir.reps.to} {tone} />
				{/if}

				<p class="t-body text-text-muted mt-2.5 line-clamp-2">{prescription?.reason}</p>
			</button>

			<!-- Reference, deliberately quiet -->
			<div class="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-border/50">
				<span class="t-label text-text-muted">
					{exercise.sets} sets{exercise.rir ? ` · ${exercise.rir}` : ''}
				</span>
				{#if prescription?.heavyTest}
					<span class="t-label text-pr">heavy test</span>
				{/if}
				{#if staleDays > 0}
					<span class="t-label text-amber">{staleDays}d since best</span>
				{/if}
				<button onclick={() => onEditHistory?.()}
					class="t-label ml-auto text-text-muted hover:text-text-dim">
					{#if bandRecord}
						{bucketLabel(bandRecord.bucket).slice(0, 3).toLowerCase()} best {bandRecord.weight}×{bandRecord.totalReps ?? bandRecord.reps}
					{:else}
						no record yet
					{/if}
				</button>
			</div>

			{#if exercise.notes}
				<button onclick={() => (notesOpen = !notesOpen)} class="t-label text-text-muted mt-2 hover:text-text-dim">
					{notesOpen ? '− how to do it' : '+ how to do it'}
				</button>
				{#if notesOpen}
					<p class="t-body text-text-muted mt-1.5" transition:slide={{ duration: 120 }}>{exercise.notes}</p>
				{/if}
			{/if}
		</div>

		{#if pickerOpen && slot}
			<div class="px-3.5 pb-3.5" transition:slide={{ duration: 150 }}>
				<div class="t-label text-text-muted mb-2">Which station</div>
				<div class="space-y-1.5">
					{#each variants as v}
						<div class="flex items-center gap-1.5">
							<button onclick={() => pick(v.id)}
								class="flex-1 flex items-center justify-between px-3 py-2 rounded-lg border text-left {v.id === exercise.id ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-bg/50 border-border/50 text-text-dim'}">
								<span class="t-body font-medium">{v.name}</span>
								{#if v.id === exercise.id}<span class="t-label">active</span>
								{:else if v.isCustom}<span class="t-label text-accent/60">mine</span>{/if}
							</button>
							{#if v.isCustom}
								<button onclick={() => onRemoveVariant?.(v.id)} aria-label="Delete this variation"
									class="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-text-muted hover:text-danger">
									<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" /></svg>
								</button>
							{/if}
						</div>
					{/each}
				</div>

				{#if adding}
					<div class="mt-2 flex gap-1.5" transition:slide={{ duration: 120 }}>
						<!-- svelte-ignore a11y_autofocus -->
						<input autofocus bind:value={newName} onkeydown={(e) => e.key === 'Enter' && submitVariant()}
							placeholder="e.g. Cable machine by pilates room"
							class="flex-1 min-w-0 h-10 px-3 rounded-lg bg-bg-input border border-border t-body focus:outline-none focus:border-accent" />
						<button onclick={submitVariant} class="px-3 h-10 rounded-lg bg-accent/15 border border-accent/30 text-accent t-label font-bold">Add</button>
					</div>
					<p class="mt-1.5 t-label text-text-muted normal-case tracking-normal">Gets its own records — a different station isn't the same load.</p>
				{:else}
					<button onclick={() => (adding = true)}
						class="mt-2 w-full px-3 py-2 rounded-lg border border-dashed border-border text-text-muted t-body hover:border-accent/40 hover:text-accent">
						+ Add my own variation
					</button>
				{/if}
			</div>
		{/if}
	{/if}
</div>
