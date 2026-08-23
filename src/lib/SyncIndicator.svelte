<script>
	import { syncStatus, syncMessage, flushCloudState, retryCloudSave } from './store.js';

	const LABEL = {
		idle: '',
		pending: 'UNSAVED',
		saving: 'SAVING…',
		saved: 'SAVED',
		error: 'NOT SAVED',
		conflict: 'CONFLICT'
	};

	let tone = $derived(
		$syncStatus === 'error' || $syncStatus === 'conflict'
			? 'text-danger bg-danger/10 border-danger/30'
			: $syncStatus === 'pending'
				? 'text-accent bg-accent/10 border-accent/25'
				: 'text-text-muted bg-bg-input border-border'
	);
</script>

{#if $syncStatus !== 'idle'}
	<div class="flex flex-col items-end gap-1">
		<div class="flex items-center gap-1.5">
			<span class="font-mono t-meta font-bold tracking-widest px-1.5 py-0.5 rounded border {tone}">
				{LABEL[$syncStatus]}
			</span>
			{#if $syncStatus === 'pending'}
				<button
					onclick={() => flushCloudState()}
					class="font-mono t-meta tracking-wider text-accent underline underline-offset-2"
				>
					save now
				</button>
			{:else if $syncStatus === 'error'}
				<button
					onclick={retryCloudSave}
					class="font-mono t-meta tracking-wider text-danger underline underline-offset-2"
				>
					retry
				</button>
			{:else if $syncStatus === 'conflict'}
				<button
					onclick={retryCloudSave}
					class="font-mono t-meta tracking-wider text-danger underline underline-offset-2"
				>
					reload
				</button>
			{/if}
		</div>
		{#if $syncMessage && $syncStatus !== 'saved'}
			<p class="font-mono t-meta text-text-muted text-right max-w-[15rem] leading-snug">
				{$syncMessage}
			</p>
		{/if}
	</div>
{/if}
