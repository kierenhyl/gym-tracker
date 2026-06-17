<script>
	import { slide } from 'svelte/transition';

	let {
		slot,
		exercise,
		record,
		staleDays = 0,
		isActive,
		isCompleted,
		onTap,
		onTick,
		onSelectVariant,
		onEditHistory
	} = $props();

	let pickerOpen = $state(false);

	let isVolume = $derived(exercise.method === 'volume');
	let methodLabel = $derived(
		exercise.method === 'myorep'
			? 'MYO-REP'
			: exercise.method === 'volume'
				? 'HIGH VOLUME'
				: 'STRAIGHT'
	);
	let methodChip = $derived(
		exercise.method === 'myorep'
			? 'text-accent bg-accent/10'
			: exercise.method === 'volume'
				? 'text-success bg-success/10'
				: 'text-text-dim bg-bg-input'
	);

	let hasAlternatives = $derived((slot?.alternatives?.length ?? 0) > 0);
	let isStale = $derived(staleDays > 0);

	function pick(variantId) {
		onSelectVariant?.(variantId);
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
		<span class="font-mono text-[10px] text-text-dim">{exercise.muscle}</span>
		<span class="font-mono text-[10px] text-text-muted">{exercise.sets}×{exercise.repRange}</span>

		<div class="ml-auto flex items-center gap-1">
			{#if isActive && !isCompleted}
				{#if hasAlternatives}
					<button
						onclick={() => (pickerOpen = !pickerOpen)}
						aria-label="Swap exercise"
						class="w-7 h-7 flex items-center justify-center rounded-lg text-text-dim hover:text-accent hover:bg-accent/10 transition-colors {pickerOpen ? 'text-accent bg-accent/10' : ''}"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
					</button>
				{/if}
				<button
					onclick={onTick}
					aria-label="Mark done without a new record"
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

	<!-- Body: name + notes (tap to log) · record badge (tap to edit history) -->
	<div class="flex items-start gap-3 px-4 pb-4 pt-1">
		<button
			onclick={onTap}
			disabled={!isActive}
			class="flex-1 min-w-0 text-left transition-transform {isActive ? 'active:scale-[0.99]' : 'cursor-default'}"
		>
			<h3 class="font-semibold text-[15px] leading-tight {isCompleted ? 'text-success/80' : ''}">
				{exercise.name}
			</h3>
			<p class="text-xs text-text-muted leading-relaxed line-clamp-2 mt-1">
				{exercise.notes}
			</p>

			{#if isStale && isActive && !isCompleted}
				<div class="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-pr/15 border border-pr/30">
					<span class="text-xs">🔥</span>
					<span class="font-mono text-[10px] font-bold text-pr tracking-wider">GO FOR IT</span>
					<span class="font-mono text-[10px] text-pr/70">{staleDays}d since record</span>
				</div>
			{:else if isActive && !isCompleted}
				<div class="mt-2 font-mono text-[10px] text-accent/60 tracking-wider">TAP TO LOG →</div>
			{/if}
		</button>

		<!-- Record badge → opens edit history -->
		<button
			onclick={() => onEditHistory?.()}
			aria-label="View and edit record history"
			class="flex-shrink-0 flex flex-col items-end gap-0.5 rounded-lg border border-border/70 bg-bg/40 px-2.5 py-1.5 hover:border-border-focus hover:bg-bg-input/60 transition-colors active:scale-95"
		>
			<div class="flex items-center gap-1 text-text-muted">
				<span class="font-mono text-[9px] tracking-wider">{isVolume ? 'VOL PR' : 'BEST'}</span>
				<svg xmlns="http://www.w3.org/2000/svg" class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
			</div>
			{#if record}
				<div class="font-mono text-lg font-bold text-pr leading-none">{record.weight}<span class="text-[11px] font-normal text-text-muted">kg</span></div>
				<div class="font-mono text-[11px] text-text-dim">×{record.reps}{isVolume ? ` · ${record.volume}` : ''}</div>
			{:else}
				<div class="font-mono text-lg font-bold text-text-muted leading-none">—</div>
				<div class="font-mono text-[10px] text-accent/70 tracking-wider">SET FIRST</div>
			{/if}
		</button>
	</div>

	<!-- Variant picker -->
	{#if pickerOpen && slot}
		<div class="px-4 pb-4" transition:slide={{ duration: 150 }}>
			<div class="font-mono text-[10px] text-text-muted tracking-wider mb-2">SWAP FOR — {exercise.muscle}</div>
			<div class="space-y-1.5">
				{#each [{ id: slot.id, name: slot.name, isPrimary: true }, ...(slot.alternatives ?? []).map((a) => ({ id: a.id, name: a.name, isPrimary: false }))] as v}
					<button
						onclick={() => pick(v.id)}
						class="w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-colors {v.id === exercise.id
							? 'bg-accent/10 border-accent/30 text-accent'
							: 'bg-bg/50 border-border/50 text-text-dim hover:border-border-focus hover:text-text'}"
					>
						<span class="text-sm font-medium">{v.name}</span>
						{#if v.id === exercise.id}
							<span class="font-mono text-[10px] tracking-wider">ACTIVE</span>
						{:else if v.isPrimary}
							<span class="font-mono text-[10px] text-text-muted tracking-wider">DEFAULT</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>
