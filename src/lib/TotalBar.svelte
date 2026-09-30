<script>
	// A bar from zero to the top of the band's total range.
	//   shaded  the target range (lo to hi)
	//   filled  where the last session landed
	//   ringed  today's target
	//
	// Filling the bar and watching it empty on a weight step is double
	// progression made visible — the rule teaches itself.

	let { lo, hi, from = null, to = null, tone = 'push' } = $props();

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
	<div aria-hidden="true">
		<div class="relative h-2 my-1">
			<div class="absolute inset-0 rounded-full bg-border"></div>
			<div class="absolute inset-y-0 right-0 rounded-r-full bg-accent/10" style="left: {pct(lo)}"></div>
			{#if from != null}
				<div class="absolute inset-y-0 left-0 rounded-full {fill}" style="width: {pct(from)}"></div>
			{/if}
			{#if to != null}
				<div class="absolute -top-1 w-3 h-3 -ml-1.5 rounded-full border-2 bg-bg-card {ring}" style="left: {pct(to)}"></div>
			{/if}
		</div>
		<div class="relative h-3.5">
			<span class="absolute -translate-x-1/2 t-meta text-text-muted tabular-nums" style="left: {pct(lo)}">{lo}</span>
			<span class="absolute right-0 t-meta text-text-muted tabular-nums">{hi}</span>
		</div>
	</div>

	<!-- Screen readers get the same information as the bar. -->
	<span class="sr-only">
		Target range {lo} to {hi} total reps.
		{#if from != null}Last session {from}.{/if}
		{#if to != null}Today aim for {to}.{/if}
	</span>
{/if}
