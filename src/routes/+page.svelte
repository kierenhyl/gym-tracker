<script>
	import { currentDay, currentDayIndex, activeSession, personalRecords, startSession, completeSession, markExerciseComplete } from '$lib/store.js';
	import ExerciseCard from '$lib/ExerciseCard.svelte';
	import LogModal from '$lib/LogModal.svelte';
	import HistoryView from '$lib/HistoryView.svelte';
	import { program } from '$lib/program.js';
	import { fly, fade } from 'svelte/transition';

	let showLog = $state(false);
	let selectedExercise = $state(null);
	let showHistory = $state(false);
	let sessionPRs = $state(0);
	let showComplete = $state(false);

	function handleExerciseTap(exercise) {
		selectedExercise = exercise;
		showLog = true;
	}

	function handleCloseLog() {
		showLog = false;
		selectedExercise = null;
	}

	function handleStartSession() {
		startSession($currentDayIndex);
	}

	function handleFinishSession() {
		completeSession($currentDayIndex, sessionPRs);
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
		<div class="flex items-center justify-between mb-1">
			<h1 class="font-mono text-sm font-semibold tracking-widest uppercase text-text-dim">
				Gym Tracker
			</h1>
			<button
				onclick={() => showHistory = !showHistory}
				class="font-mono text-xs text-text-muted hover:text-accent transition-colors px-2 py-1"
			>
				{showHistory ? 'WORKOUT' : 'HISTORY'}
			</button>
		</div>
	</header>

	{#if showHistory}
		<div in:fly={{ y: 20, duration: 200 }}>
			<HistoryView />
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
				<div class="font-mono text-xs text-text-muted mt-1">
					{$currentDay.location}
				</div>
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
			<button
				onclick={handleStartSession}
				class="w-full py-4 mb-6 rounded-xl bg-accent/10 border border-accent/30 text-accent font-semibold text-lg hover:bg-accent/20 transition-all active:scale-[0.98]"
			>
				Start Session
			</button>
		{/if}

		<!-- Exercise List -->
		<div class="space-y-3">
			{#each $currentDay.exercises as exercise, i}
				<div in:fly={{ y: 20, duration: 200, delay: i * 50 }}>
					<ExerciseCard
						{exercise}
						pr={$personalRecords[exercise.id]}
						isActive={isSessionActive}
						isCompleted={completedExercises.includes(exercise.id)}
						onTap={() => handleExerciseTap(exercise)}
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
				<div class="text-6xl mb-4">
					{sessionPRs > 0 ? '' : ''}
				</div>
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
		pr={$personalRecords[selectedExercise.id]}
		onClose={handleCloseLog}
		onExerciseComplete={() => markExerciseComplete(selectedExercise.id)}
		onPR={handlePR}
	/>
{/if}
