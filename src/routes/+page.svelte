<script>
	import {
		currentDay,
		currentDayIndex,
		activeSession,
		workoutLog,
		records,
		staleRecords,
		recordKey,
		recordsFor,
		staleDaysFor,
		exerciseSelections,
		customVariants,
		customVariantsFor,
		getActiveVariant,
		selectVariant,
		addCustomVariant,
		removeCustomVariant,
		markCompleted,
		startSession,
		completeSession,
		markExerciseComplete,
		prescriptionFor,
		READINESS,
		READINESS_LABELS
	} from '$lib/store.js';
	import { slotVariants } from '$lib/program.js';
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
	let view = $state('workout'); // 'workout' | 'history' | 'stats'
	let sessionPRs = $state(0);
	let showComplete = $state(false);
	let pendingReadiness = $state('normal');

	// Readiness scales today's instructions: on a rough day the app tells you to
	// match your last session rather than beat it, and never programmes a heavy
	// test. Defaults to normal before a session starts.
	let readiness = $derived($activeSession?.readiness ?? 'normal');

	const READINESS_BLURB = {
		low: 'Slept badly, sore, stressed — match, don\'t chase',
		normal: 'Business as usual',
		high: 'Fresh and ready to push'
	};

	function downloadMigrationBackup() {
		const storageKeys = [
			'gym_currentDay',
			'gym_log',
			'gym_completions',
			'gym_selections',
			'gym_customVariants',
			'gym_session',
			'gym_history'
		];
		const keys = Object.fromEntries(
			storageKeys.map((key) => {
				const raw = localStorage.getItem(key);
				if (raw === null) return [key, null];
				try {
					return [key, JSON.parse(raw)];
				} catch {
					return [key, raw];
				}
			})
		);
		const backup = { exportedAt: new Date().toISOString(), keys };
		const href = URL.createObjectURL(
			new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
		);
		const anchor = document.createElement('a');
		anchor.href = href;
		anchor.download = `gym-tracker-migration-${new Date().toISOString().slice(0, 10)}.json`;
		anchor.click();
		setTimeout(() => URL.revokeObjectURL(href), 1000);
	}

	function activeVariant(slot) {
		return getActiveVariant(slot, $exerciseSelections, $customVariants);
	}

	function variantsFor(slot) {
		return slotVariants(slot, customVariantsFor($customVariants, slot.id));
	}

	// Every band's record for a movement, keyed by bucket — the log modal needs
	// them all, because the band you land in may not be the one prescribed.
	function bucketRecordsFor(variant) {
		const out = {};
		for (const bucket of ['heavy', 'moderate', 'volume', 'myo']) {
			const rec = $records[recordKey(variant.movement, bucket)];
			if (rec) out[bucket] = rec;
		}
		return out;
	}

	function handleExerciseTap(slot, variant) {
		selectedSlot = slot;
		selectedExercise = variant;
		showLog = true;
	}

	function handleCloseLog() {
		showLog = false;
		selectedSlot = null;
		selectedExercise = null;
	}

	function handleEditHistory(variant) {
		editHistoryExercise = variant;
		showEditHistory = true;
	}

	function handleCloseEditHistory() {
		showEditHistory = false;
		editHistoryExercise = null;
	}

	function handleTick(slot, variant) {
		markExerciseComplete(slot.id);
		markCompleted(slot.id, variant.id);
	}

	function handleStartSession() {
		startSession($currentDayIndex, pendingReadiness);
	}

	function handleFinishSession() {
		completeSession($currentDayIndex, sessionPRs, readiness);
		sessionPRs = 0;
		showComplete = true;
		setTimeout(() => { showComplete = false; }, 2500);
	}

	function handlePR() {
		sessionPRs++;
	}

	function cyclePrev() {
		currentDayIndex.update(i => (i - 1 + program.length) % program.length);
	}

	function cycleNext() {
		currentDayIndex.update(i => (i + 1) % program.length);
	}

	let isSessionActive = $derived(!!$activeSession);
	let completedExercises = $derived($activeSession?.completedExercises ?? []);
	let allExercisesDone = $derived(
		isSessionActive && $currentDay.exercises.every(e => completedExercises.includes(e.id))
	);
</script>

<div class="max-w-md mx-auto px-4 pb-24">
	<!-- Header -->
	<header class="pt-6 pb-4">
		<div class="flex items-center justify-between mb-3">
			<h1 class="font-mono text-sm font-semibold tracking-widest uppercase text-text-dim">
				Gym Tracker
			</h1>
			<button
				onclick={downloadMigrationBackup}
				class="font-mono text-[9px] tracking-wider px-2.5 py-1.5 rounded-lg bg-accent/10 border border-accent/30 text-accent"
			>
				DOWNLOAD MIGRATION BACKUP
			</button>
		</div>
		<!-- Tab bar -->
		<div class="flex items-center gap-1 p-1 rounded-lg bg-bg-card border border-border">
			{#each [['workout', 'WORKOUT'], ['history', 'HISTORY'], ['stats', 'STATS']] as [key, label]}
				<button
					onclick={() => view = key}
					class="flex-1 py-1.5 rounded-md font-mono text-[11px] tracking-wider transition-colors {
						view === key ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-dim'
					}"
				>
					{label}
				</button>
			{/each}
		</div>
	</header>

	{#if view === 'history'}
		<div in:fly={{ y: 20, duration: 200 }}>
			<HistoryView />
		</div>
	{:else if view === 'stats'}
		<div in:fly={{ y: 20, duration: 200 }}>
			<AnalyticsView />
		</div>
	{:else}
		<!-- Day Selector -->
		<div class="flex items-center justify-between mb-6" in:fly={{ y: 20, duration: 200 }}>
			<button
				onclick={cyclePrev}
				aria-label="Previous day"
				class="w-10 h-10 flex items-center justify-center rounded-lg bg-bg-card border border-border text-text-dim hover:text-accent hover:border-accent transition-all active:scale-95"
				disabled={isSessionActive}
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
			</button>

			<div class="text-center">
				<div class="font-mono text-xs text-accent font-semibold tracking-wider">
					DAY {$currentDay.day} OF 5
				</div>
				<h2 class="text-2xl font-bold tracking-tight">
					{$currentDay.name}
				</h2>
				{#if $currentDay.subtitle}
					<div class="text-sm text-text-dim">{$currentDay.subtitle}</div>
				{/if}
			</div>

			<button
				onclick={cycleNext}
				aria-label="Next day"
				class="w-10 h-10 flex items-center justify-center rounded-lg bg-bg-card border border-border text-text-dim hover:text-accent hover:border-accent transition-all active:scale-95"
				disabled={isSessionActive}
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
			</button>
		</div>

		<!-- Session Control -->
		{#if !isSessionActive}
			<div class="mb-6">
				<div class="font-mono text-[10px] text-text-muted tracking-wider mb-2">
					HOW ARE YOU FEELING TODAY?
				</div>
				<div class="grid grid-cols-3 gap-2 mb-3">
					{#each READINESS as level}
						<button
							onclick={() => (pendingReadiness = level)}
							class="py-2.5 rounded-xl border font-mono text-[11px] font-bold tracking-wider transition-all active:scale-[0.97] {pendingReadiness === level
								? 'bg-accent/15 border-accent/40 text-accent'
								: 'bg-bg-card border-border text-text-dim hover:border-border-focus'}"
						>
							{READINESS_LABELS[level]}
						</button>
					{/each}
				</div>
				<p class="font-mono text-[10px] text-text-muted mb-3">{READINESS_BLURB[pendingReadiness]}</p>
				<button
					onclick={handleStartSession}
					class="w-full py-4 rounded-xl bg-accent/10 border border-accent/30 text-accent font-semibold text-lg hover:bg-accent/20 transition-all active:scale-[0.98]"
				>
					Start Session
				</button>
			</div>
		{/if}

		<!-- Exercise List -->
		<div class="space-y-3">
			{#each $currentDay.exercises as slot, i (slot.id)}
				{@const variant = activeVariant(slot)}
				{@const rx = prescriptionFor($workoutLog, slot, variant, readiness)}
				<div in:fly={{ y: 20, duration: 200, delay: i * 50 }}>
					<ExerciseCard
						{slot}
						exercise={variant}
						variants={variantsFor(slot)}
						bandRecords={recordsFor($records, variant)}
						prescription={rx}
						staleDays={staleDaysFor($staleRecords, variant, rx?.bucket)}
						isActive={isSessionActive}
						isCompleted={completedExercises.includes(slot.id)}
						onTap={() => handleExerciseTap(slot, variant)}
						onTick={() => handleTick(slot, variant)}
						onSelectVariant={(variantId) => selectVariant(slot.id, variantId)}
						onAddVariant={(name) => addCustomVariant(slot.id, name)}
						onRemoveVariant={(variantId) => removeCustomVariant(slot.id, variantId)}
						onEditHistory={() => handleEditHistory(variant)}
					/>
				</div>
			{/each}
		</div>

		<!-- Finish Session -->
		{#if isSessionActive}
			<div class="mt-6" in:fade>
				<button
					onclick={handleFinishSession}
					class="w-full py-4 rounded-xl font-semibold text-lg transition-all active:scale-[0.98] {
						allExercisesDone
							? 'bg-success/20 border border-success/40 text-success hover:bg-success/30'
							: 'bg-bg-card border border-border text-text-dim'
					}"
				>
					{allExercisesDone ? 'Finish Session' : 'Finish Early'}
				</button>
			</div>
		{/if}
	{/if}

	<!-- Complete Animation -->
	{#if showComplete}
		<div
			class="fixed inset-0 flex items-center justify-center z-50 bg-bg/80 backdrop-blur-sm"
			in:fade={{ duration: 200 }}
			out:fade={{ duration: 300 }}
		>
			<div class="text-center" in:fly={{ y: 30, duration: 300 }}>
				<div class="text-2xl font-bold text-success mb-1">Session Complete</div>
				{#if sessionPRs > 0}
					<div class="font-mono text-pr">{sessionPRs} new PR{sessionPRs > 1 ? 's' : ''}!</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<!-- Log Modal -->
{#if showLog && selectedExercise}
	<LogModal
		exercise={selectedExercise}
		prescription={prescriptionFor($workoutLog, selectedSlot, selectedExercise, readiness)}
		bucketRecords={bucketRecordsFor(selectedExercise)}
		{readiness}
		onClose={handleCloseLog}
		onExerciseComplete={() => markExerciseComplete(selectedSlot.id)}
		onPR={handlePR}
	/>
{/if}

<!-- Edit History Modal -->
{#if showEditHistory && editHistoryExercise}
	<EditHistoryModal
		exercise={editHistoryExercise}
		onClose={handleCloseEditHistory}
	/>
{/if}
