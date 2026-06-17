<script>
	import { workoutLog, editLogEntry, deleteLogEntry } from './store.js';
	import { fly, fade, slide } from 'svelte/transition';

	let { exercise, onClose } = $props();

	let isVolume = $derived(exercise.method === 'volume');

	// All logged sets for this exercise, newest first. References point straight
	// at the store objects so edit/delete can match them.
	let entries = $derived(
		$workoutLog.filter((e) => e.exerciseId === exercise.id && e.weight != null).reverse()
	);

	// The entry that currently counts as the record, so we can flag it.
	let bestEntry = $derived.by(() => {
		let best = null;
		for (const e of entries) {
			if (!best) {
				best = e;
				continue;
			}
			if (isVolume) {
				if (e.weight * e.reps > best.weight * best.reps) best = e;
			} else if (e.weight > best.weight || (e.weight === best.weight && e.reps > best.reps)) {
				best = e;
			}
		}
		return best;
	});

	let editing = $state(null); // the entry object being edited
	let editWeight = $state('');
	let editReps = $state('');
	let confirmingDelete = $state(null); // the entry pending delete confirmation

	function startEdit(entry) {
		editing = entry;
		editWeight = entry.weight;
		editReps = entry.reps;
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

<!-- Backdrop -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-40 bg-bg/90 backdrop-blur-sm"
	onclick={onClose}
	in:fade={{ duration: 150 }}
	out:fade={{ duration: 100 }}
></div>

<!-- Modal -->
<div
	class="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto"
	in:fly={{ y: 300, duration: 250, opacity: 1 }}
	out:fly={{ y: 300, duration: 200, opacity: 1 }}
>
	<div class="max-w-md mx-auto bg-bg-card rounded-t-2xl border-t border-x border-border p-5 pb-8">
		<!-- Handle bar -->
		<div class="w-10 h-1 rounded-full bg-border mx-auto mb-5"></div>

		<div class="mb-4">
			<div class="font-mono text-[10px] text-text-muted tracking-widest mb-1">EDIT HISTORY</div>
			<h2 class="text-xl font-bold">{exercise.name}</h2>
			<p class="font-mono text-[11px] text-text-dim mt-1">
				The {isVolume ? 'volume PR' : 'best'} updates automatically from these sets.
			</p>
		</div>

		{#if entries.length === 0}
			<div class="text-center py-10">
				<div class="font-mono text-sm text-text-muted">No sets logged yet.</div>
			</div>
		{:else}
			<div class="space-y-2">
				{#each entries as entry (entry)}
					<div
						class="rounded-xl border px-3 py-2.5 {
							entry === bestEntry
								? 'bg-pr/10 border-pr/30'
								: 'bg-bg border-border'
						}"
					>
						{#if editing === entry}
							<!-- Inline editor -->
							<div class="flex items-end gap-2" transition:slide={{ duration: 120 }}>
								<div class="flex-1">
									<label class="block font-mono text-[9px] text-text-muted tracking-wider mb-1" for="edit-w-{entry.date}">WEIGHT (KG)</label>
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
									<label class="block font-mono text-[9px] text-text-muted tracking-wider mb-1" for="edit-r-{entry.date}">REPS</label>
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
						{:else}
							<!-- Read-only row -->
							<div class="flex items-center justify-between gap-3">
								<div class="min-w-0">
									<div class="font-mono text-base font-bold">
										{entry.weight}<span class="text-xs font-normal text-text-muted">kg</span>
										<span class="text-text-dim font-normal"> x </span>{entry.reps}
										{#if isVolume}
											<span class="font-mono text-[11px] text-success/80 ml-1">= {entry.weight * entry.reps}</span>
										{/if}
									</div>
									<div class="flex items-center gap-2">
										<span class="font-mono text-[10px] text-text-muted">{formatDate(entry.date)}</span>
										{#if entry === bestEntry}
											<span class="font-mono text-[9px] font-bold tracking-wider text-pr">{isVolume ? 'VOL PR' : 'BEST'}</span>
										{/if}
									</div>
								</div>

								<div class="flex items-center gap-1.5 flex-shrink-0">
									{#if confirmingDelete === entry}
										<span class="font-mono text-[10px] text-text-dim">Delete?</span>
										<button
											onclick={() => removeEntry(entry)}
											class="px-2.5 h-8 flex items-center rounded-lg bg-danger/15 border border-danger/30 text-danger font-mono text-[11px] font-semibold hover:bg-danger/25 transition-colors"
										>
											Yes
										</button>
										<button
											onclick={() => (confirmingDelete = null)}
											class="px-2.5 h-8 flex items-center rounded-lg bg-bg border border-border text-text-dim font-mono text-[11px] hover:text-text transition-colors"
										>
											No
										</button>
									{:else}
										<button
											onclick={() => startEdit(entry)}
											aria-label="Edit set"
											class="w-8 h-8 flex items-center justify-center rounded-lg text-text-dim hover:text-accent hover:bg-accent/10 transition-colors"
										>
											<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
										</button>
										<button
											onclick={() => (confirmingDelete = entry)}
											aria-label="Delete set"
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

		<button
			onclick={onClose}
			class="w-full mt-5 py-3 rounded-xl bg-bg border border-border text-text-dim font-medium hover:text-text hover:border-border-focus transition-all active:scale-[0.98]"
		>
			Done
		</button>
	</div>
</div>
