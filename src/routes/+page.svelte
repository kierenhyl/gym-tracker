<script>
	import { onMount } from 'svelte';
	import {
		cloudPhase, migrationAvailable, initializeCloud, signOut, downloadCloudBackup,
		currentDay, currentDayIndex, activeSession, workoutLog, records, staleRecords,
		recordKey, recordsFor, staleDaysFor, exerciseSelections, customVariants,
		customVariantsFor, slotVariantsWithCustom, getActiveVariant, selectVariant,
		addCustomVariant, removeCustomVariant, markCompleted, startSession, completeSession,
		markExerciseComplete, prescriptionFor, READINESS, READINESS_LABELS
	} from '$lib/store.js';
	import AccessGate from '$lib/AccessGate.svelte';
	import MigrationModal from '$lib/MigrationModal.svelte';
	import SyncIndicator from '$lib/SyncIndicator.svelte';
	import ExerciseCard from '$lib/ExerciseCard.svelte';
	import LogModal from '$lib/LogModal.svelte';
	import EditHistoryModal from '$lib/EditHistoryModal.svelte';
	import HistoryView from '$lib/HistoryView.svelte';
	import AnalyticsView from '$lib/AnalyticsView.svelte';
	import { program } from '$lib/program.js';
	import { fly, fade } from 'svelte/transition';

	let showLog = $state(false);
	let selectedSlot = $state(null);
	let selectedExercise = $state(null);
	let showEditHistory = $state(false);
	let editHistoryExercise = $state(null);
	let showMigration = $state(false);
	let migrationDismissed = $state(false);
	let view = $state('workout');
	let sessionPRs = $state(0);
	let showComplete = $state(false);
	let pendingReadiness = $state('normal');

	onMount(() => { initializeCloud(); });

	// Readiness scales the day's instructions: a rough day never programmes a
	// heavy test and downgrades progression to matching the last session.
	let readiness = $derived($activeSession?.readiness ?? 'normal');
	const READINESS_BLURB = {
		low: "Slept badly, sore, stressed — match, don't chase",
		normal: 'Business as usual',
		high: 'Fresh and ready to push'
	};

	let isSessionActive = $derived(!!$activeSession);
	let completedExercises = $derived($activeSession?.completedExercises ?? []);
	let allDone = $derived(isSessionActive && $currentDay.exercises.every((e) => completedExercises.includes(e.id)));

	$effect(() => {
		if ($migrationAvailable && !migrationDismissed) showMigration = true;
	});

	function activeVariant(slot) { return getActiveVariant(slot, $exerciseSelections, $customVariants); }
	function variantsFor(slot) { return slotVariantsWithCustom(slot, $customVariants); }

	function bucketRecordsFor(variant) {
		const out = {};
		for (const bucket of ['heavy', 'moderate', 'volume', 'myo']) {
			const rec = $records[recordKey(variant.movement, bucket)];
			if (rec) out[bucket] = rec;
		}
		return out;
	}

	function tap(slot, variant) { selectedSlot = slot; selectedExercise = variant; showLog = true; }
	function closeLog() { showLog = false; selectedSlot = null; selectedExercise = null; }
	function tick(slot, variant) { markExerciseComplete(slot.id); markCompleted(slot.id, variant.id); }

	function finishSession() {
		completeSession($currentDayIndex, sessionPRs, readiness);
		sessionPRs = 0;
		showComplete = true;
		setTimeout(() => { showComplete = false; }, 2500);
	}
</script>

{#if $cloudPhase !== 'ready'}
	<AccessGate />
{:else}
	<div class="max-w-md mx-auto px-4 pb-24">
		<header class="pt-6 pb-4">
			<div class="flex items-start justify-between mb-3 gap-3">
				<h1 class="font-mono text-sm font-semibold tracking-widest uppercase text-text-dim pt-1">Gym Tracker</h1>
				<SyncIndicator />
			</div>
			<div class="flex items-center gap-1 p-1 rounded-lg bg-bg-card border border-border">
				{#each [['workout', 'WORKOUT'], ['history', 'HISTORY'], ['stats', 'STATS']] as [key, label]}
					<button onclick={() => (view = key)}
						class="flex-1 py-1.5 rounded-md font-mono text-[11px] tracking-wider transition-colors {view === key ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-dim'}">
						{label}
					</button>
				{/each}
			</div>
		</header>

		{#if view === 'history'}
			<div in:fly={{ y: 20, duration: 200 }}><HistoryView /></div>
		{:else if view === 'stats'}
			<div in:fly={{ y: 20, duration: 200 }}>
				<AnalyticsView />
				<div class="mt-6 rounded-xl border border-border bg-bg-card p-3">
					<div class="font-mono text-[10px] text-text-muted tracking-wider mb-2">YOUR DATA</div>
					<button onclick={downloadCloudBackup}
						class="w-full py-2.5 mb-2 rounded-lg bg-bg border border-border text-text-dim font-mono text-[11px] tracking-wider hover:text-text">
						DOWNLOAD A BACKUP
					</button>
					<button onclick={signOut}
						class="w-full py-2.5 rounded-lg bg-bg border border-border text-text-muted font-mono text-[11px] tracking-wider hover:text-text-dim">
						SIGN OUT
					</button>
				</div>
			</div>
		{:else}
			<div class="flex items-center justify-between mb-6" in:fly={{ y: 20, duration: 200 }}>
				<button onclick={() => currentDayIndex.update((i) => (i - 1 + program.length) % program.length)}
					aria-label="Previous day" disabled={isSessionActive}
					class="w-10 h-10 flex items-center justify-center rounded-lg bg-bg-card border border-border text-text-dim hover:text-accent disabled:opacity-40">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
				</button>
				<div class="text-center">
					<div class="font-mono text-xs text-accent font-semibold tracking-wider">DAY {$currentDay.day} OF 5</div>
					<h2 class="text-2xl font-bold tracking-tight">{$currentDay.name}</h2>
				</div>
				<button onclick={() => currentDayIndex.update((i) => (i + 1) % program.length)}
					aria-label="Next day" disabled={isSessionActive}
					class="w-10 h-10 flex items-center justify-center rounded-lg bg-bg-card border border-border text-text-dim hover:text-accent disabled:opacity-40">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
				</button>
			</div>

			{#if !isSessionActive}
				<div class="mb-6">
					<div class="font-mono text-[10px] text-text-muted tracking-wider mb-2">HOW ARE YOU FEELING TODAY?</div>
					<div class="grid grid-cols-3 gap-2 mb-2">
						{#each READINESS as level}
							<button onclick={() => (pendingReadiness = level)}
								class="py-2.5 rounded-xl border font-mono text-[11px] font-bold tracking-wider transition-all active:scale-[0.97] {pendingReadiness === level ? 'bg-accent/15 border-accent/40 text-accent' : 'bg-bg-card border-border text-text-dim'}">
								{READINESS_LABELS[level]}
							</button>
						{/each}
					</div>
					<p class="font-mono text-[10px] text-text-muted mb-3">{READINESS_BLURB[pendingReadiness]}</p>
					<button onclick={() => startSession($currentDayIndex, pendingReadiness)}
						class="w-full py-4 rounded-xl bg-accent/10 border border-accent/30 text-accent font-semibold text-lg active:scale-[0.98]">
						Start Session
					</button>
				</div>
			{/if}

			<div class="space-y-3">
				{#each $currentDay.exercises as slot, i (slot.id)}
					{@const variant = activeVariant(slot)}
					{@const rx = prescriptionFor($workoutLog, slot, variant, readiness, $customVariants)}
					<div in:fly={{ y: 20, duration: 200, delay: i * 40 }}>
						<ExerciseCard
							{slot} exercise={variant}
							variants={variantsFor(slot)}
							bandRecords={recordsFor($records, variant)}
							prescription={rx}
							staleDays={staleDaysFor($staleRecords, variant, rx?.bucket)}
							isActive={isSessionActive}
							isCompleted={completedExercises.includes(slot.id)}
							onTap={() => tap(slot, variant)}
							onTick={() => tick(slot, variant)}
							onSelectVariant={(id) => selectVariant(slot.id, id)}
							onAddVariant={(name) => addCustomVariant(slot.id, name)}
							onRemoveVariant={(id) => removeCustomVariant(slot.id, id)}
							onEditHistory={() => { editHistoryExercise = variant; showEditHistory = true; }}
						/>
					</div>
				{/each}
			</div>

			{#if isSessionActive}
				<div class="mt-6" in:fade>
					<button onclick={finishSession}
						class="w-full py-4 rounded-xl font-semibold text-lg transition-all active:scale-[0.98] {allDone ? 'bg-success/20 border border-success/40 text-success' : 'bg-bg-card border border-border text-text-dim'}">
						{allDone ? 'Finish Session' : 'Finish Early'}
					</button>
				</div>
			{/if}
		{/if}

		{#if showComplete}
			<div class="fixed inset-0 flex items-center justify-center z-50 bg-bg/80 backdrop-blur-sm" transition:fade={{ duration: 200 }}>
				<div class="text-center">
					<div class="text-2xl font-bold text-success mb-1">Session Complete</div>
					{#if sessionPRs > 0}<div class="font-mono text-pr">{sessionPRs} new PR{sessionPRs > 1 ? 's' : ''}!</div>{/if}
				</div>
			</div>
		{/if}
	</div>
{/if}

{#if showLog && selectedExercise}
	<LogModal
		exercise={selectedExercise}
		prescription={prescriptionFor($workoutLog, selectedSlot, selectedExercise, readiness, $customVariants)}
		bucketRecords={bucketRecordsFor(selectedExercise)}
		{readiness}
		onClose={closeLog}
		onExerciseComplete={() => markExerciseComplete(selectedSlot.id)}
		onPR={() => sessionPRs++}
	/>
{/if}

{#if showEditHistory && editHistoryExercise}
	<EditHistoryModal exercise={editHistoryExercise} onClose={() => { showEditHistory = false; editHistoryExercise = null; }} />
{/if}

{#if showMigration}
	<MigrationModal onClose={() => { showMigration = false; migrationDismissed = true; }} />
{/if}
