<script>
	import { sessions, editLogEntry, deleteLogEntry } from './store.js';
	import { bandLabel } from './bands.js';
	import { slide } from 'svelte/transition';
	import Sheet from './Sheet.svelte';

	let { exercise, onClose } = $props();

	// Every session for this exact variant.
	let mine = $derived($sessions.filter((s) => s.movement === exercise.movement));

	// Every stored row, newest first, each tagged with the session it belongs
	// to. Old sessions are still a row per set, and a wrong set is fixed where it
	// was typed. References point straight at the store objects so edit/delete
	// can match them.
	let rows = $derived(
		mine.flatMap((s) => s.entries.map((entry) => ({ entry, session: s }))).reverse()
	);

	// The session that holds each band's best, so we can flag it — and so a bad
	// number is obvious and one tap from being fixed.
	let bestByBand = $derived.by(() => {
		const best = {};
		for (const s of mine) if (!best[s.band] || s.score > best[s.band].score) best[s.band] = s;
		return best;
	});

	let editing = $state(null);
	let editWeight = $state('');
	let editReps = $state('');
	let confirmingDelete = $state(null);

	// A row that is a whole session: logged as a total, or an old myo-rep row
	// that already carried one.
	function isTotal(entry) {
		return entry.format === 'total' || entry.totalReps != null;
	}

	function startEdit(entry) {
		editing = entry;
		editWeight = entry.weight;
		editReps = entry.totalReps ?? entry.reps;
		confirmingDelete = null;
	}

	function cancelEdit() {
		editing = null;
	}

	function saveEdit(entry) {
		editLogEntry(entry, editWeight, editReps);
		editing = null;
	}

	function removeEntry(entry) {
		deleteLogEntry(entry);
		if (editing === entry) editing = null;
		confirmingDelete = null;
	}

	function formatDate(iso) {
		const d = new Date(iso);
		if (isNaN(d)) return '';
		return d.toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' });
	}
</script>

<Sheet eyebrow="Records & history" title={exercise.name} {onClose}>
		<div class="mb-4">
			<p class="font-mono t-meta text-text-dim leading-relaxed">
				Records are worked out from these rows, so fixing a wrong number here fixes the record.
				Sessions logged set by set count as the total of their sets.
			</p>
		</div>

		<!-- Current bests -->
		{#if Object.keys(bestByBand).length}
			<div class="mb-4 flex flex-wrap gap-1.5">
				{#each Object.entries(bestByBand) as [band, best]}
					<div class="px-2.5 py-1.5 rounded-lg bg-pr/10 border border-pr/20">
						<div class="font-mono t-meta text-pr/70 tracking-wider">{bandLabel(band)}</div>
						<div class="font-mono text-sm font-bold text-pr">{best.weight}kg × {best.total}</div>
					</div>
				{/each}
			</div>
		{/if}

		{#if rows.length === 0}
			<div class="text-center py-10">
				<div class="font-mono text-sm text-text-muted">Nothing logged yet.</div>
			</div>
		{:else}
			<div class="space-y-2">
				{#each rows as { entry, session } (entry)}
					{@const isBest = bestByBand[session.band] === session}
					<div class="rounded-xl border px-3 py-2.5 {isBest ? 'bg-pr/10 border-pr/30' : 'bg-bg border-border'}">
						{#if editing === entry}
							<div transition:slide={{ duration: 120 }}>
								<div class="flex items-end gap-2 mb-2">
									<div class="flex-1">
										<label class="block font-mono t-meta text-text-muted tracking-wider mb-1" for="edit-w-{entry.date}">WEIGHT (KG)</label>
										<input
											id="edit-w-{entry.date}"
											type="number"
											inputmode="decimal"
											step="0.5"
											bind:value={editWeight}
											class="w-full h-11 px-3 rounded-lg bg-bg-input border border-border text-base font-mono font-bold text-center focus:outline-none focus:border-accent transition-colors"
										/>
									</div>
									<div class="flex-1">
										<label class="block font-mono t-meta text-text-muted tracking-wider mb-1" for="edit-r-{entry.date}">{isTotal(entry) ? 'TOTAL REPS' : 'REPS'}</label>
										<input
											id="edit-r-{entry.date}"
											type="number"
											inputmode="numeric"
											bind:value={editReps}
											class="w-full h-11 px-3 rounded-lg bg-bg-input border border-border text-base font-mono font-bold text-center focus:outline-none focus:border-accent transition-colors"
										/>
									</div>
									<button
										onclick={() => saveEdit(entry)}
										aria-label="Save changes"
										class="h-11 w-11 flex items-center justify-center rounded-lg bg-success/15 border border-success/30 text-success hover:bg-success/25 transition-colors"
									>
										<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
									</button>
									<button
										onclick={cancelEdit}
										aria-label="Cancel"
										class="h-11 w-11 flex items-center justify-center rounded-lg bg-bg border border-border text-text-dim hover:text-text transition-colors"
									>
										<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
									</button>
								</div>
							</div>
						{:else}
							<div class="flex items-center justify-between gap-3">
								<div class="min-w-0">
									<div class="font-mono text-base font-bold">
										{entry.weight}<span class="text-xs font-normal text-text-muted">kg</span>
										<span class="text-text-dim font-normal"> × </span>{isTotal(entry) ? `${entry.totalReps ?? entry.reps} total` : entry.reps}
									</div>
									<div class="flex items-center gap-2 flex-wrap">
										<span class="font-mono t-meta tracking-wider text-text-dim">{bandLabel(session.band)}</span>
										<span class="font-mono t-meta text-text-muted">{formatDate(entry.date)}</span>
										{#if !isTotal(entry)}
											<span class="font-mono t-meta text-text-muted">ONE SET OF {session.weight} × {session.total}</span>
										{/if}
										{#if isBest}
											<span class="font-mono t-meta font-bold tracking-wider text-pr">BEST</span>
										{/if}
									</div>
								</div>

								<div class="flex items-center gap-1.5 flex-shrink-0">
									{#if confirmingDelete === entry}
										<span class="font-mono t-meta text-text-dim">Delete?</span>
										<button
											onclick={() => removeEntry(entry)}
											class="px-2.5 h-8 flex items-center rounded-lg bg-danger/15 border border-danger/30 text-danger font-mono t-meta font-semibold hover:bg-danger/25 transition-colors"
										>
											Yes
										</button>
										<button
											onclick={() => (confirmingDelete = null)}
											class="px-2.5 h-8 flex items-center rounded-lg bg-bg border border-border text-text-dim font-mono t-meta hover:text-text transition-colors"
										>
											No
										</button>
									{:else}
										<button
											onclick={() => startEdit(entry)}
											aria-label="Edit"
											class="w-8 h-8 flex items-center justify-center rounded-lg text-text-dim hover:text-accent hover:bg-accent/10 transition-colors"
										>
											<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
										</button>
										<button
											onclick={() => (confirmingDelete = entry)}
											aria-label="Delete"
											class="w-8 h-8 flex items-center justify-center rounded-lg text-text-dim hover:text-danger hover:bg-danger/10 transition-colors"
										>
											<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
										</button>
									{/if}
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

</Sheet>
