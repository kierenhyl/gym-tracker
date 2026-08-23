<script>
	// One dot per rep across the target range.
	//   filled  where the last session landed
	//   ringed  today's target
	//   empty   the rest
	//
	// Filling the track and watching it reset on a load step is double
	// progression made visible — the rule teaches itself.

	let { lo, hi, from = null, to = null, tone = 'push', compact = false } = $props();

	let reps = $derived.by(() => {
		const a = Number(lo);
		const b = Number(hi);
		if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return [];
		// A very wide range would overflow a phone; cap the dots and let the
		// end labels carry the real numbers.
		const span = Math.min(b - a + 1, 12);
		return Array.from({ length: span }, (_, i) => a + i);
	});

	let filledTo = $derived(from == null ? null : Math.min(Math.max(Number(from), lo - 1), hi));
	let target = $derived(to == null ? null : Math.min(Math.max(Number(to), lo), hi));

	let fill = $derived(
		tone === 'back-off' ? 'bg-amber' : tone === 'hold' ? 'bg-text-dim' : 'bg-accent'
	);
	let ring = $derived(
		tone === 'back-off'
			? 'ring-amber'
			: tone === 'hold'
				? 'ring-text-dim'
				: tone === 'new'
					? 'ring-pr'
					: 'ring-accent'
	);
</script>

{#if reps.length}
	<div class="flex items-center gap-2">
		<span class="t-label text-text-muted tabular-nums">{lo}</span>

		<div class="flex items-center flex-1 justify-between px-1" aria-hidden="true">
			{#each reps as rep}
				{@const isFilled = filledTo != null && rep <= filledTo}
				{@const isTarget = target != null && rep === target}
				<span
					class="rounded-full transition-colors {compact ? 'w-1.5 h-1.5' : 'w-2 h-2'}
						{isFilled ? fill : 'bg-border'}
						{isTarget ? `ring-2 ring-offset-2 ring-offset-bg-card ${ring}` : ''}"
				></span>
			{/each}
		</div>

		<span class="t-label text-text-muted tabular-nums">{hi}</span>
	</div>

	<!-- Screen readers get the same information as the dots. -->
	<span class="sr-only">
		Target range {lo} to {hi} reps.
		{#if filledTo != null}Last session {filledTo} reps.{/if}
		{#if target != null}Today aim for {target}.{/if}
	</span>
{/if}
