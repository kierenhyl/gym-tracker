<script>
	import { sessionHistory } from './store.js';
	import { program } from './program.js';

	let history = $derived([...$sessionHistory].reverse());

	function formatDate(iso) {
		const d = new Date(iso);
		const day = d.getDate();
		const month = d.toLocaleDateString('en-NZ', { month: 'short' });
		const weekday = d.toLocaleDateString('en-NZ', { weekday: 'short' });
		return `${weekday} ${day} ${month}`;
	}

	function getDayName(dayIndex) {
		const day = program[dayIndex];
		return `Day ${day.day}: ${day.name}`;
	}
</script>

<div>
	<h2 class="text-xl font-bold mb-4">Session History</h2>

	{#if history.length === 0}
		<div class="text-center py-12">
			<div class="text-text-muted font-mono text-sm">No sessions logged yet.</div>
			<div class="text-text-muted font-mono text-xs mt-1">Complete your first workout to see it here.</div>
		</div>
	{:else}
		<div class="space-y-2">
			{#each history as session}
				<div class="flex items-center justify-between px-4 py-3 rounded-xl bg-bg-card border border-border">
					<div>
						<div class="font-semibold text-sm">{getDayName(session.dayIndex)}</div>
						<div class="font-mono text-xs text-text-muted">{formatDate(session.date)}</div>
					</div>
					<div class="text-right">
						<div class="font-mono text-xs text-text-dim">{session.exerciseCount} exercises</div>
						{#if session.prCount > 0}
							<div class="font-mono text-xs text-pr">{session.prCount} PR{session.prCount > 1 ? 's' : ''}</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
