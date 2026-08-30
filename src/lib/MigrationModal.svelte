<script>
	import {
		migrationAvailable,
		hasLegacyData,
		legacySummary,
		importLegacyData,
		importLegacyBackup,
		downloadLegacyBackup,
		clearLegacyData
	} from './store.js';
	import Sheet from './Sheet.svelte';

	let { onClose } = $props();

	let busy = $state(false);
	let error = $state('');
	let done = $state(false);

	let localData = $derived(hasLegacyData());
	let summary = $derived(localData ? legacySummary() : null);

	async function run(fn) {
		busy = true;
		error = '';
		try {
			await fn();
			done = true;
		} catch (e) {
			error = e?.message ?? 'The import did not finish.';
		} finally {
			busy = false;
		}
	}

	async function onFile(event) {
		const file = event.currentTarget.files?.[0];
		if (!file) return;
		const text = await file.text();
		await run(() => importLegacyBackup(text));
	}
</script>

<Sheet {onClose}>

		{#if done}
			<h2 class="text-xl font-bold mb-2">Imported</h2>
			<p class="text-sm text-text-muted leading-relaxed mb-5">
				Your history is now in the cloud. Keep the old browser copy for a while as a backup, or
				clear it once you're confident.
			</p>
			<button
				onclick={() => { clearLegacyData(); onClose(); }}
				class="w-full py-3 mb-2 rounded-xl bg-bg border border-border text-text-dim font-medium"
			>
				Clear the old browser copy
			</button>
			<button onclick={onClose} class="w-full py-3 rounded-xl bg-accent/10 border border-accent/30 text-accent font-semibold">
				Done
			</button>
		{:else}
			<div class="font-mono t-meta text-text-muted tracking-widest mb-1">IMPORT OLD DATA</div>
			<h2 class="text-xl font-bold mb-2">Your cloud storage is empty</h2>
			<p class="text-sm text-text-muted leading-relaxed mb-5">
				If you tracked workouts before the move to cloud saving, bring them across now. Importing is
				only possible while the cloud is empty.
			</p>

			{#if localData && summary}
				<div class="rounded-xl border border-border bg-bg p-3 mb-3">
					<div class="font-mono t-meta text-text-muted tracking-wider mb-1">FOUND IN THIS BROWSER</div>
					<div class="font-mono text-sm">
						{summary.sets} sets · {summary.sessions} sessions · {summary.completions} ticks
					</div>
				</div>
				<button
					onclick={() => run(importLegacyData)}
					disabled={busy}
					class="w-full py-4 mb-2 rounded-xl bg-accent/10 border border-accent/30 text-accent font-semibold disabled:opacity-40"
				>
					{busy ? 'Importing…' : 'Import from this browser'}
				</button>
				<button onclick={downloadLegacyBackup} class="w-full py-3 mb-4 rounded-xl bg-bg border border-border text-text-dim font-medium">
					Download a backup first
				</button>
			{/if}

			<div class="font-mono t-meta text-text-muted tracking-wider mb-1.5">
				OR CHOOSE A BACKUP FILE
			</div>
			<input
				type="file"
				accept="application/json,.json"
				onchange={onFile}
				disabled={busy}
				class="w-full text-sm text-text-dim file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-border file:bg-bg-input file:text-text-dim file:font-mono file:t-meta"
			/>
			<p class="font-mono t-meta text-text-muted mt-1.5 leading-relaxed">
				Browser storage can't be read across different web addresses, so data from the old site has
				to come in as a file.
			</p>

			{#if error}
				<p class="text-sm text-danger mt-3">{error}</p>
			{/if}

			<button onclick={onClose} class="w-full mt-5 py-3 rounded-xl bg-bg border border-border text-text-dim font-medium">
				Skip for now
			</button>
		{/if}
</Sheet>
