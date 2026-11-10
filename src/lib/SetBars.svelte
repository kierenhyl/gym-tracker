<script>
	// One small bar per set, from zero to the top of the per-set range.
	//   shaded  the target range (lo to hi)
	//   filled  where that set landed last time
	//   ringed  today's target for that set
	//
	// Filling the bars and watching them empty on a weight step is double
	// progression made visible: the rule teaches itself.

	let { lo, hi, from = null, to = null, sets = 3, tone = 'push' } = $props();

	let count = $derived(Math.max(sets, to?.length ?? 0, 1));
	const pct = (n) => `${Math.min(Math.max(Number(n) / hi, 0), 1) * 100}%`;

	let fill = $derived(
		tone === 'back-off' ? 'bg-amber/60' : tone === 'hold' ? 'bg-text-dim/60' : 'bg-accent/55'
	);
	let ring = $derived(
		tone === 'back-off'
			? 'border-amber'
			: tone === 'hold'
				? 'border-text-dim'
				: tone === 'new'
					? 'border-pr'
					: 'border-accent'
	);
</script>

{#if hi > 0}
	<div aria-hidden="true" class="space-y-1.5">
		{#each Array.from({ length: count }) as _, i}
			<div class="relative h-1.5">
				<div class="absolute inset-0 rounded-full bg-border"></div>
				<div class="absolute inset-y-0 right-0 rounded-r-full bg-accent/10" style="left: {pct(lo)}"></div>
				{#if from?.[i] != null}
					<div class="absolute inset-y-0 left-0 rounded-full {fill}" style="width: {pct(from[i])}"></div>
				{/if}
				{#if to?.[i] != null}
					<div class="absolute -top-[3px] w-3 h-3 -ml-1.5 rounded-full border-2 bg-bg-card {ring}" style="left: {pct(to[i])}"></div>
				{/if}
			</div>
		{/each}
		<div class="relative h-3.5">
			<span class="absolute -translate-x-1/2 t-meta text-text-muted tabular-nums" style="left: {pct(lo)}">{lo}</span>
			<span class="absolute right-0 t-meta text-text-muted tabular-nums">{hi}</span>
		</div>
	</div>

	<!-- Screen readers get the same information as the bars. -->
	<span class="sr-only">
		{count} sets of {lo} to {hi} reps.
		{#if from?.length}Last time {from.join(', ')}.{/if}
		{#if to?.length}Today aim for {to.join(', ')}.{/if}
	</span>
{/if}
