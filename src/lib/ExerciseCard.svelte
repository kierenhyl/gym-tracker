<script>
	import { slide } from 'svelte/transition';
	import { KIND_LABELS } from './prescribe.js';
	import { MAX_SETS } from './bands.js';
	import TotalBar from './TotalBar.svelte';

	let {
		slot, exercise, variants = [], choices = [], prescription,
		isActive, isCompleted, isCurrent = false, loggedToday = null,
		suggestions = [],
		onTap, onTick, onUndoTick, onFocus, onSelectBand, onSelectVariant, onAddVariant, onRemoveVariant, onEditHistory
	} = $props();

	let pickerOpen = $state(false);
	let notesOpen = $state(false);
	let adding = $state(false);
	let newName = $state('');

	// Only the exercise being worked on shows its full detail. Everything else
	// collapses to one line, so heights stay uniform and the day stays scannable.
	let expanded = $derived(isActive && isCurrent);

	let dir = $derived(prescription?.direction);
	let tone = $derived(dir?.tone ?? 'push');

	// The arrow sits on whichever quantity should move.
	let loadArrow = $derived(dir?.move === 'load' ? (tone === 'back-off' ? '↓' : '↑') : '');
	let repsArrow = $derived(dir?.move === 'reps' ? '↑' : '');

	// Weight and total — the two things worth reading at a glance. Nothing else
	// on the card gets this size. After topping the range the app cannot know the
	// next weight on this machine, so it asks for more than last time.
	let loadText = $derived.by(() => {
		if (prescription?.targetLoad == null) return '—';
		return `${prescription.loadUp ? '> ' : ''}${prescription.targetLoad}${loadArrow}`;
	});
	let repsText = $derived(
		prescription?.targetReps == null
			? `${prescription?.targetLow}-${prescription?.targetHigh}`
			: `${prescription.targetReps}${repsArrow}`
	);

	let loggedText = $derived(loggedToday ? `${loggedToday.weight}kg × ${loggedToday.total}` : '');
	let lastText = $derived(
		prescription?.last ? `last ${prescription.last.weight} × ${prescription.last.total}` : null
	);

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
		<button onclick={() => onFocus?.()}
			class="w-full flex items-center gap-3 px-3.5 py-3 text-left">
			{#if isCompleted}
				<svg class="w-3.5 h-3.5 text-success flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
			{/if}
			<span class="t-title truncate {isCompleted ? 'text-text-dim' : 'text-text'}">{exercise.name}</span>
			<span class="t-label ml-auto flex-shrink-0 {isCompleted ? 'text-success/70' : 'text-text-muted'}">
				{loggedText}
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

			{#if isCompleted}
				<!-- Done. Show the work back, so an accidental tick is obvious and
				     one tap from being undone. -->
				<div class="flex items-baseline gap-2.5 mb-3">
					{#if loggedToday}
						<div>
							<div class="t-display font-mono font-bold tabular-nums text-success">{loggedToday.weight}</div>
							<div class="t-label text-text-muted">kg</div>
						</div>
						<span class="t-display font-mono text-text-dim/50">×</span>
						<div>
							<div class="t-display font-mono font-bold tabular-nums text-success">{loggedToday.total}</div>
							<div class="t-label text-text-muted">total reps</div>
						</div>
					{:else}
						<div class="t-display font-mono font-bold text-text-dim">—</div>
						<span class="t-body text-text-muted">marked done, nothing logged</span>
					{/if}
					<span class="t-label ml-auto flex-shrink-0 text-success">DONE</span>
				</div>

				<div class="flex gap-1.5">
					<button onclick={() => onUndoTick?.()}
						class="flex-1 py-2.5 rounded-lg bg-bg border border-border text-text-dim t-label hover:text-text">
						Undo complete
					</button>
					<button onclick={() => onEditHistory?.()}
						class="flex-1 py-2.5 rounded-lg bg-bg border border-border text-text-muted t-label hover:text-text-dim">
						Edit history
					</button>
				</div>
			{:else}
			<!-- Each band keeps its own weight and its own total. -->
			{#if choices.length > 1}
				<div class="grid gap-1.5 mb-3.5" style="grid-template-columns: repeat({choices.length}, minmax(0, 1fr))">
					{#each choices as c (c.band)}
						{@const on = c.band === prescription?.band}
						<button onclick={() => onSelectBand?.(c.band)} aria-pressed={on}
							class="py-2 px-1 rounded-lg border text-center transition-colors {on ? 'bg-accent/10 border-accent/40' : 'bg-bg border-border'}">
							<div class="t-label {on ? 'text-accent' : 'text-text-dim'}">{c.label}</div>
							<div class="t-meta mt-0.5 tabular-nums {on ? 'text-text' : 'text-text-muted'}">
								{c.lastWeight != null ? `${c.lastWeight}kg · ` : ''}{c.lo}-{c.hi}
							</div>
						</button>
					{/each}
				</div>
			{/if}

			<!-- The instruction: weight × total. Nothing else at this size. -->
			<button onclick={onTap} class="w-full text-left">
				<div class="flex items-baseline gap-2.5 mb-3">
					<div>
						<div class="t-display font-mono font-bold tabular-nums {loadArrow ? accent : 'text-text'}">{loadText}</div>
						<div class="t-label text-text-muted">kg</div>
					</div>
					<span class="t-display font-mono text-text-dim/50">×</span>
					<div>
						<div class="t-display font-mono font-bold tabular-nums {repsArrow ? accent : 'text-text'}">{repsText}</div>
						<div class="t-label text-text-muted">total reps</div>
					</div>
					<span class="t-label ml-auto flex-shrink-0 text-right {accent}">
						{KIND_LABELS[prescription?.kind] ?? ''}
					</span>
				</div>

				{#if dir}
					<TotalBar lo={dir.total.lo} hi={dir.total.hi} from={dir.total.from} to={dir.total.to} {tone} />
				{/if}

				<!-- Only where a bare number would be confusing on its own. -->
				{#if prescription?.note}
					<p class="t-meta mt-2 {tone === 'back-off' ? 'text-amber' : 'text-text-muted'}">{prescription.note}</p>
				{/if}
			</button>

			<!-- The one rule that goes with a total. -->
			<p class="mt-3 px-2.5 py-2 rounded-lg bg-accent/5 border border-accent/25 t-meta text-accent">
				No more than {MAX_SETS} sets to reach this
			</p>

			{/if}

			<!-- Reference, deliberately quiet -->
			<div class="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-border/50">
				{#if lastText}
					<span class="t-label text-text-muted">{lastText}</span>
				{/if}
				<button onclick={() => onEditHistory?.()}
					class="t-label ml-auto text-text-muted hover:text-text-dim">
					history
				</button>
			</div>

			<!-- How to do it, not why we picked it: the numbers are the instruction,
			     and an explanation of them was just something else to read. -->
			{#if exercise.notes || exercise.effort || exercise.rest}
				<button onclick={() => (notesOpen = !notesOpen)} class="t-label text-text-muted mt-2 hover:text-text-dim">
					{notesOpen ? '− how to do it' : '+ how to do it'}
				</button>
			{/if}
			{#if notesOpen}
				<div class="mt-1.5 space-y-1.5" transition:slide={{ duration: 120 }}>
					{#if exercise.notes}
						<p class="t-body text-text-muted">{exercise.notes}</p>
					{/if}
					<!-- The programme's own prescription: not on the face, but it is the
					     only place rest and effort are written down. -->
					{#if exercise.effort || exercise.rest}
						<p class="t-label text-text-muted">
							{[exercise.effort, exercise.rest && `${exercise.rest} rest`].filter(Boolean).join(' · ')}
						</p>
					{/if}
				</div>
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

				{#if suggestions.length && !adding}
					<div class="mt-3 t-label text-text-muted mb-1.5">Suggestions — tap to add</div>
					<div class="flex flex-wrap gap-1.5">
						{#each suggestions as name}
							<button onclick={() => onAddVariant?.(name)}
								class="px-2.5 py-1.5 rounded-lg border border-dashed border-border text-text-dim t-body hover:border-accent/40 hover:text-accent">
								+ {name}
							</button>
						{/each}
					</div>
				{/if}

				{#if adding}
					<div class="mt-2 flex gap-1.5" transition:slide={{ duration: 120 }}>
						<!-- svelte-ignore a11y_autofocus -->
						<input autofocus bind:value={newName} onkeydown={(e) => e.key === 'Enter' && submitVariant()}
							placeholder="e.g. Cable machine by pilates room"
							class="flex-1 min-w-0 h-10 px-3 rounded-lg bg-bg-input border border-border t-body focus:outline-none focus:border-accent" />
						<button onclick={submitVariant} class="px-3 h-10 rounded-lg bg-accent/15 border border-accent/30 text-accent t-label font-bold">Add</button>
					</div>
					<p class="mt-1.5 t-meta text-text-muted">Gets its own records — a different station isn't the same load.</p>
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
