<script>
	// One bottom sheet, used by every modal in the app.
	//
	// It exists because the sheets were hard to get out of mid-workout: at
	// 92vh the only dismiss targets were an 8%-tall strip of backdrop and a
	// button below the fold. A sheet you cannot leave with one thumb is a
	// sheet you resent. So: a close button that never scrolls away, Escape,
	// backdrop, and enough backdrop left to actually hit.

	import { fly, fade } from 'svelte/transition';

	let { eyebrow = null, title = null, onClose, children } = $props();
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') onClose?.();
	}}
/>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-40 bg-bg/90 backdrop-blur-sm"
	onclick={onClose}
	in:fade={{ duration: 150 }}
	out:fade={{ duration: 100 }}
></div>

<div
	class="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col"
	in:fly={{ y: 300, duration: 250, opacity: 1 }}
	out:fly={{ y: 300, duration: 200, opacity: 1 }}
>
	<div
		class="max-w-md mx-auto w-full flex flex-col min-h-0 bg-bg-card rounded-t-2xl border-t border-x border-border"
	>
		<!-- Sticky, so the way out is always on screen however far you scroll. -->
		<div class="flex-shrink-0 px-5 pt-3 pb-3 border-b border-border/50">
			<div class="w-10 h-1 rounded-full bg-border mx-auto mb-3"></div>
			<div class="flex items-start gap-2">
				<div class="flex-1 min-w-0">
					{#if eyebrow}
						<div class="t-label text-text-muted mb-0.5">{eyebrow}</div>
					{/if}
					{#if title}
						<h2 class="text-xl font-bold truncate">{title}</h2>
					{/if}
				</div>
				<button
					onclick={onClose}
					aria-label="Close"
					class="w-11 h-11 -mr-2 -mt-1 flex-shrink-0 flex items-center justify-center rounded-xl text-text-muted hover:text-text active:scale-95"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		</div>

		<div class="overflow-y-auto px-5 pt-4 pb-8">
			{@render children?.()}
		</div>
	</div>
</div>
