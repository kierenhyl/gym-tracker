<script>
	import { slide } from 'svelte/transition';
	import { bucketLabel } from './bands.js';
	import { KIND_LABELS } from './prescribe.js';

	let {
		slot,
		exercise,
		variants = [],
		bandRecords = [],
		prescription,
		staleDays = 0,
		isActive,
		isCompleted,
		onTap,
		onTick,
		onSelectVariant,
		onAddVariant,
		onRemoveVariant,
		onEditHistory
	} = $props();

	let pickerOpen = $state(false);
	let addingVariant = $state(false);
	let newVariantName = $state('');

	let isMyo = $derived(exercise.structure === 'myorep');
	let band = $derived(prescription?.band ?? exercise.defaultBand);
	let methodLabel = $derived(isMyo ? 'MYO-REP' : bucketLabel(band));
	let methodChip = $derived(
		isMyo
			? 'text-accent bg-accent/10'
			: band === 'heavy'
				? 'text-pr bg-pr/10'
				: band === 'volume'
					? 'text-success bg-success/10'
					: 'text-text-dim bg-bg-input'
	);

	let isStale = $derived(staleDays > 0);

	function pick(variantId) {
		onSelectVariant?.(variantId);
		pickerOpen = false;
		addingVariant = false;
	}

	function submitVariant() {
		const name = newVariantName.trim();
		if (!name) return;
		onAddVariant?.(name);
		newVariantName = '';
		addingVariant = false;
		pickerOpen = false;
	}
</script>

<div
	class="rounded-xl border transition-all {isCompleted
		? 'bg-success/5 border-success/25'
		: isActive
			? 'bg-bg-card border-border'
			: 'bg-bg-card/40 border-border/40'}"
>
	<!-- Meta row -->
	<div class="flex items-center gap-2 px-4 pt-3 pb-1.5">
		<span class="font-mono text-[9px] font-semibold tracking-widest px-1.5 py-0.5 rounded {methodChip}">
			{methodLabel}
		</span>
		{#if prescription?.heavyTest}
			<span class="font-mono text-[9px] font-bold tracking-widest text-pr">TEST</span>
		{/if}
		<span class="font-mono text-[10px] text-text-dim">{exercise.muscle}</span>
		<span class="font-mono text-[10px] text-text-muted">
			{exercise.sets}×{prescription?.targetLow ?? ''}-{prescription?.targetHigh ?? ''}
		</span>

		<div class="ml-auto flex items-center gap-1">
			{#if isActive && !isCompleted}
				<button
					onclick={() => (pickerOpen = !pickerOpen)}
					aria-label="Swap exercise or add a variation"
					class="w-7 h-7 flex items-center justify-center rounded-lg text-text-dim hover:text-accent hover:bg-accent/10 transition-colors {pickerOpen ? 'text-accent bg-accent/10' : ''}"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
				</button>
				<button
					onclick={onTick}
					aria-label="Mark done without logging"
					class="w-7 h-7 flex items-center justify-center rounded-lg text-text-dim hover:text-success hover:bg-success/10 transition-colors"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
				</button>
			{:else if isCompleted}
				<span class="font-mono text-[9px] font-semibold tracking-widest text-success">DONE</span>
				<svg class="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
				</svg>
			{/if}
		</div>
	</div>

	<!-- Body -->
	<div class="flex items-start gap-3 px-4 pb-3 pt-1">
		<button
			onclick={onTap}
			disabled={!isActive}
			class="flex-1 min-w-0 text-left transition-transform {isActive ? 'active:scale-[0.99]' : 'cursor-default'}"
		>
			<h3 class="font-semibold text-[15px] leading-tight {isCompleted ? 'text-success/80' : ''}">
				{exercise.name}
				{#if exercise.isCustom}
					<span class="font-mono text-[9px] text-accent/70 tracking-wider align-middle ml-1">MINE</span>
				{/if}
			</h3>
			<p class="text-xs text-text-muted leading-relaxed line-clamp-2 mt-1">
				{exercise.notes}
			</p>

			{#if isStale && isActive && !isCompleted}
				<div class="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-pr/15 border border-pr/30">
					<span class="text-xs">🔥</span>
					<span class="font-mono text-[10px] font-bold text-pr tracking-wider">GO FOR IT</span>
					<span class="font-mono text-[10px] text-pr/70">{staleDays}d since your best {bucketLabel(band).toLowerCase()} set</span>
				</div>
			{/if}
		</button>

		<!-- Band bests → opens edit history -->
		<button
			onclick={() => onEditHistory?.()}
			aria-label="View and edit records"
			class="flex-shrink-0 flex flex-col items-end gap-1 rounded-lg border border-border/70 bg-bg/40 px-2.5 py-1.5 hover:border-border-focus hover:bg-bg-input/60 transition-colors active:scale-95"
		>
			<div class="flex items-center gap-1 text-text-muted">
				<span class="font-mono text-[9px] tracking-wider">BESTS</span>
				<svg xmlns="http://www.w3.org/2000/svg" class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
			</div>
			{#if bandRecords.length}
				{#each bandRecords as { bucket, record }}
					<div class="flex items-center gap-1.5 {bucket === (prescription?.bucket ?? band) ? '' : 'opacity-45'}">
						<span class="font-mono text-[8px] tracking-wider text-text-muted w-8 text-right">
							{bucketLabel(bucket).slice(0, 3)}
						</span>
						<span class="font-mono text-[11px] font-bold text-pr leading-none">
							{record.weight}<span class="text-[9px] font-normal text-text-muted">kg</span>
							<span class="text-text-dim font-normal">×{record.totalReps ?? record.reps}</span>
						</span>
					</div>
				{/each}
			{:else}
				<div class="font-mono text-lg font-bold text-text-muted leading-none">—</div>
				<div class="font-mono text-[10px] text-accent/70 tracking-wider">SET FIRST</div>
			{/if}
		</button>
	</div>

	<!-- Today's instruction -->
	{#if isActive && !isCompleted && prescription}
		<button onclick={onTap} class="w-full text-left px-4 pb-4">
			<div class="rounded-lg border border-accent/25 bg-accent/5 px-3 py-2">
				<div class="flex items-baseline gap-2">
					<span class="font-mono text-[9px] font-bold tracking-widest text-accent">
						{KIND_LABELS[prescription.kind] ?? 'TODAY'}
					</span>
					<span class="font-mono text-sm font-bold text-text">{prescription.headline}</span>
				</div>
				<p class="text-[11px] text-text-muted leading-snug mt-1 line-clamp-2">
					{prescription.reason}
				</p>
			</div>
		</button>
	{/if}

	<!-- Variant picker -->
	{#if pickerOpen && slot}
		<div class="px-4 pb-4" transition:slide={{ duration: 150 }}>
			<div class="font-mono text-[10px] text-text-muted tracking-wider mb-2">
				SWAP FOR — {exercise.muscle}
			</div>
			<div class="space-y-1.5">
				{#each variants as v}
					<div class="flex items-center gap-1.5">
						<button
							onclick={() => pick(v.id)}
							class="flex-1 flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-colors {v.id === exercise.id
								? 'bg-accent/10 border-accent/30 text-accent'
								: 'bg-bg/50 border-border/50 text-text-dim hover:border-border-focus hover:text-text'}"
						>
							<span class="text-sm font-medium">{v.name}</span>
							{#if v.id === exercise.id}
								<span class="font-mono text-[10px] tracking-wider">ACTIVE</span>
							{:else if v.isPrimary}
								<span class="font-mono text-[10px] text-text-muted tracking-wider">DEFAULT</span>
							{:else if v.isCustom}
								<span class="font-mono text-[10px] text-accent/60 tracking-wider">MINE</span>
							{/if}
						</button>
						{#if v.isCustom}
							<button
								onclick={() => onRemoveVariant?.(v.id)}
								aria-label="Delete this variation"
								class="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-text-muted hover:text-pr hover:bg-pr/10 transition-colors"
							>
								<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" /></svg>
							</button>
						{/if}
					</div>
				{/each}
			</div>

			<!-- Add your own station -->
			{#if addingVariant}
				<div class="mt-2 flex gap-1.5" transition:slide={{ duration: 120 }}>
					<!-- svelte-ignore a11y_autofocus -->
					<input
						autofocus
						bind:value={newVariantName}
						onkeydown={(e) => e.key === 'Enter' && submitVariant()}
						placeholder="e.g. Cable machine by pilates room"
						class="flex-1 min-w-0 h-10 px-3 rounded-lg bg-bg-input border border-border text-sm focus:outline-none focus:border-accent transition-colors"
					/>
					<button
						onclick={submitVariant}
						class="px-3 h-10 rounded-lg bg-accent/15 border border-accent/30 text-accent font-mono text-[10px] font-bold tracking-wider active:scale-95 transition-transform"
					>
						ADD
					</button>
				</div>
				<p class="mt-1.5 font-mono text-[10px] text-text-muted leading-relaxed">
					Gets its own records — a different station isn't the same load.
				</p>
			{:else}
				<button
					onclick={() => (addingVariant = true)}
					class="mt-2 w-full px-3 py-2 rounded-lg border border-dashed border-border text-text-muted text-sm hover:border-accent/40 hover:text-accent transition-colors"
				>
					+ Add my own variation
				</button>
			{/if}
		</div>
	{/if}
</div>
