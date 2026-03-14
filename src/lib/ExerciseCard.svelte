<script>
	let { exercise, pr, isActive, isCompleted, onTap } = $props();

	let methodLabel = $derived(exercise.method === 'myorep' ? 'MYO-REP' : 'STRAIGHT');
	let methodColor = $derived(exercise.method === 'myorep' ? 'text-accent' : 'text-text-dim');
</script>

<button
	onclick={onTap}
	disabled={!isActive}
	class="w-full text-left rounded-xl p-4 border transition-all active:scale-[0.98] {
		isCompleted
			? 'bg-success/5 border-success/20'
			: isActive
				? 'bg-bg-card border-border hover:border-border-focus cursor-pointer'
				: 'bg-bg-card/50 border-border/50 opacity-60'
	}"
>
	<div class="flex items-start justify-between gap-3">
		<div class="flex-1 min-w-0">
			<div class="flex items-center gap-2 mb-1">
				<span class="font-mono text-[10px] font-semibold tracking-widest {methodColor}">
					{methodLabel}
				</span>
				<span class="font-mono text-[10px] text-text-muted">
					{exercise.sets} x {exercise.repRange}
				</span>
				{#if isCompleted}
					<svg class="w-4 h-4 text-success ml-auto flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
					</svg>
				{/if}
			</div>
			<h3 class="font-semibold text-[15px] leading-tight mb-1.5 {isCompleted ? 'text-success/80' : ''}">
				{exercise.name}
			</h3>
			<p class="text-xs text-text-muted leading-relaxed line-clamp-2">
				{exercise.notes}
			</p>
		</div>

		<!-- PR Badge -->
		{#if pr}
			<div class="flex-shrink-0 text-right">
				<div class="font-mono text-[10px] text-text-muted tracking-wider mb-0.5">BEST</div>
				<div class="font-mono text-lg font-bold text-pr leading-none">{pr.weight}<span class="text-xs font-normal text-text-muted">kg</span></div>
				<div class="font-mono text-xs text-text-dim">x{pr.reps}</div>
			</div>
		{:else}
			<div class="flex-shrink-0 text-right">
				<div class="font-mono text-[10px] text-text-muted tracking-wider">NO PR</div>
				<div class="font-mono text-xs text-text-muted mt-1">yet</div>
			</div>
		{/if}
	</div>
</button>
