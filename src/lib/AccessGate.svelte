<script>
	import { cloudPhase, syncMessage, submitAccess, initializeCloud } from './store.js';

	let password = $state('');
	let busy = $state(false);
	let error = $state('');

	let isSetup = $derived($cloudPhase === 'setup');
	let tooShort = $derived(isSetup && password.length > 0 && password.length < 12);

	async function submit() {
		if (busy || !password) return;
		busy = true;
		error = '';
		try {
			await submitAccess(password, isSetup);
			password = '';
		} catch (e) {
			error = e?.message ?? 'Could not sign in.';
		} finally {
			busy = false;
		}
	}
</script>

<div class="max-w-md mx-auto px-4 pt-24 pb-12">
	<div class="rounded-2xl border border-border bg-bg-card p-6">
		<h1 class="font-mono text-sm font-semibold tracking-widest uppercase text-text-dim mb-1">
			Gym Tracker
		</h1>

		{#if $cloudPhase === 'loading'}
			<p class="text-text-muted text-sm mt-4">Loading your data…</p>
		{:else if $cloudPhase === 'error'}
			<h2 class="text-xl font-bold mb-2">Can't reach your data</h2>
			<p class="text-sm text-text-muted leading-relaxed mb-4">
				{$syncMessage || 'Something went wrong connecting to cloud storage.'}
			</p>
			<button
				onclick={() => initializeCloud(true)}
				class="w-full py-3 rounded-xl bg-accent/10 border border-accent/30 text-accent font-semibold"
			>
				Try again
			</button>
		{:else}
			<h2 class="text-xl font-bold mb-1">
				{isSetup ? 'Choose a password' : 'Enter your password'}
			</h2>
			<p class="text-sm text-text-muted leading-relaxed mb-5">
				{isSetup
					? 'First-time setup. At least 12 characters. This is the only password for the app.'
					: 'Your workouts are stored in the cloud. Signing in keeps this browser unlocked for 90 days.'}
			</p>

			<!-- svelte-ignore a11y_autofocus -->
			<input
				autofocus
				type="password"
				autocomplete={isSetup ? 'new-password' : 'current-password'}
				bind:value={password}
				onkeydown={(e) => e.key === 'Enter' && submit()}
				placeholder="Password"
				class="w-full h-14 px-4 mb-3 rounded-xl bg-bg-input border border-border text-base focus:outline-none focus:border-accent transition-colors"
			/>

			{#if tooShort}
				<p class="font-mono text-[11px] text-text-muted mb-3">
					{12 - password.length} more character{12 - password.length === 1 ? '' : 's'} needed.
				</p>
			{/if}
			{#if error}
				<p class="text-sm text-danger mb-3">{error}</p>
			{/if}

			<button
				onclick={submit}
				disabled={busy || !password || tooShort}
				class="w-full py-4 rounded-xl bg-accent/10 border border-accent/30 text-accent font-semibold text-base disabled:opacity-40 transition-all active:scale-[0.98]"
			>
				{busy ? 'Checking…' : isSetup ? 'Set password' : 'Sign in'}
			</button>
		{/if}
	</div>
</div>
