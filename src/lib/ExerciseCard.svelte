<script>
	import { slide } from 'svelte/transition';

	let {
		slot,
		exercise,
		pr,
		volumePr,
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
	let methodColor = $derived(
		exercise.method === 'myorep'
			? 'text-accent'
			: exercise.method === 'volume'
				? 'text-success'
				: 'text-text-dim'
	);

	let hasAlternatives = $derived((slot?.alternatives?.length ?? 0) > 0);
	let isStale = $derived(staleDays > 0);
	let record = $derived(isVolume ? volumePr : pr);

	function pick(variantId) {
		onSelectVariant?.(variantId);
		pickerOpen = false;
	}
</script>

<div
	class="rounded-xl border transition-all {
		isCompleted
			? 'bg-success/5 border-success/20'
			: isActive
				? 'bg-bg-card border-border'
				: 'bg-bg-card/50 border-border/50 opacity-60'
	}"
>
	<!-- Header row -->
	<div class="flex items-center gap-2 px-4 pt-3">
		<span class="font-mono text-[10px] font-semibold tracking-widest {methodColor}">
			{methodLabel}
		</span>
		<span class="font-mono text-[10px] text-text-muted">
			{exercise.sets} x {exercise.repRange}
		</span>

		{#if exercise.type === 'leg'}
			<span class="font-mono text-[9px] font-semibold tracking-wider text-accent/70 px-1.5 py-0.5 rounded bg-accent/10">LEG</span>
		{:else if exercise.type === 'abs'}
			<span class="font-mono text-[9px] font-semibold tracking-wider text-pr/70 px-1.5 py-0.5 rounded bg-pr/10">CORE</span>
		{/if}

		<div class="ml-auto flex items-center gap-1.5">
			{#if isActive && !isCompleted}
				{#if hasAlternatives}
					<button
						onclick={() => (pickerOpen = !pickerOpen)}
						aria-label="Swap exercise"
						class="w-7 h-7 flex items-center justify-center rounded-lg text-text-dim hover:text-accent hover:bg-accent/10 transition-colors"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
					</button>
				{/if}
				<button
					onclick={onTick}
					aria-label="Mark done"
					class="w-7 h-7 flex items-center justify-center rounded-lg text-text-dim hover:text-success hover:bg-success/10 transition-colors"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
				</button>
			{:else if isCompleted}
				<svg class="w-4 h-4 text-success flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
				</svg>
			{/if}
		</div>
	</div>

	<!-- Main tappable body -->
	<div class="px-4 pb-4 pt-2">
		<div class="flex items-start justify-between gap-3">
			<button
				onclick={onTap}
				disabled={!isActive}
				class="flex-1 min-w-0 text-left {isActive ? 'cursor-pointer active:scale-[0.99]' : ''} transition-transform"
			>
				<h3 class="font-semibold text-[15px] leading-tight mb-1.5 {isCompleted ? 'text-success/80' : ''}">
					{exercise.name}
				</h3>
				<p class="text-xs text-text-muted leading-relaxed line-clamp-2">
					{exercise.notes}
				</p>

				{#if isStale && isActive && !isCompleted}
					<div class="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-pr/15 border border-pr/30">
						<span class="text-xs">🔥</span>
						<span class="font-mono text-[10px] font-bold text-pr tracking-wider">GO FOR IT</span>
						<span class="font-mono text-[10px] text-pr/70">{staleDays}d since record</span>
					</div>
				{/if}
			</button>

			<!-- Record badge — tap to edit/correct logged sets -->
			<button
				onclick={() => onEditHistory?.()}
				aria-label="Edit record history"
				class="flex-shrink-0 text-right rounded-lg -mr-1 px-1 py-0.5 hover:bg-bg-input/50 transition-colors active:scale-95"
			>
				{#if record}
					<div class="font-mono text-[10px] text-text-muted tracking-wider mb-0.5">
						{isVolume ? 'VOL PR' : 'BEST'}
					</div>
					<div class="font-mono text-lg font-bold text-pr leading-none">{record.weight}<span class="text-xs font-normal text-text-muted">kg</span></div>
					<div class="font-mono text-xs text-text-dim">x{record.reps}</div>
					{#if isVolume}
						<div class="font-mono text-[10px] text-success/80 mt-0.5">{record.volume} vol</div>
					{/if}
				{:else}
					<div class="font-mono text-[10px] text-accent/70 tracking-wider">SET FIRST</div>
					<div class="font-mono text-[10px] text-accent/70">RECORD</div>
				{/if}
			</button>
		</div>
	</div>

	<!-- Variant picker -->
	{#if pickerOpen && slot}
		<div class="px-4 pb-4" transition:slide={{ duration: 150 }}>
			<div class="font-mono text-[10px] text-text-muted tracking-wider mb-2">SWAP FOR — {exercise.muscle}</div>
			<div class="space-y-1.5">
				{#each [{ id: slot.id, name: slot.name, isPrimary: true }, ...(slot.alternatives ?? []).map((a) => ({ id: a.id, name: a.name, isPrimary: false }))] as v}
					<button
						onclick={() => pick(v.id)}
						class="w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-colors {
							v.id === exercise.id
								? 'bg-accent/10 border-accent/30 text-accent'
								: 'bg-bg/50 border-border/50 text-text-dim hover:border-border-focus hover:text-text'
						}"
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
