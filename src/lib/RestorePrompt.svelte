<script>
	// Shown on load when this phone holds changes the cloud does not have:
	// the app was closed or killed before a save was confirmed.
	import { pendingRestore, restoreLocalCopy, discardLocalCopy } from './store.js';
	import Sheet from './Sheet.svelte';

	let busy = $state(false);

	const when = (iso) => {
		if (!iso) return null;
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return null;
		return d.toLocaleString('en-NZ', {
			weekday: 'short',
			hour: 'numeric',
			minute: '2-digit'
		});
	};

	let local = $derived(when($pendingRestore?.changedAt));
	let cloud = $derived(when($pendingRestore?.cloudUpdatedAt));

	async function restore() {
		busy = true;
		try {
			await restoreLocalCopy();
		} finally {
			busy = false;
		}
	}
</script>

<Sheet eyebrow="UNSAVED CHANGES" dismissible={false}>
	<h2 class="text-xl font-bold mb-2">This phone has changes the cloud doesn't</h2>
	<p class="text-sm text-text-muted leading-relaxed mb-5">
		{#if local}Last change on this phone: {local}.{/if}
		{#if cloud}Cloud last saved: {cloud}.{/if}
		The app closed before they were saved. Restore them to send them to the cloud now.
	</p>
	<button
		onclick={restore}
		disabled={busy}
		class="w-full py-4 mb-2 rounded-xl bg-accent/10 border border-accent/30 text-accent font-semibold disabled:opacity-40"
	>
		{busy ? 'Restoring…' : 'Restore them'}
	</button>
	<button
		onclick={discardLocalCopy}
		disabled={busy}
		class="w-full py-3 rounded-xl bg-bg border border-border text-text-dim font-medium disabled:opacity-40"
	>
		Discard, keep the cloud copy
	</button>
</Sheet>
