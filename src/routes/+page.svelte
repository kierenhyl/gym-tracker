<script>
	import { onMount } from 'svelte';
	import {
		cloudPhase, migrationAvailable, initializeCloud, signOut, downloadCloudBackup,
		currentDay, currentDayIndex, activeSession, sessions, records, recordFor,
		historyForMovement, bandChoices, exerciseSelections, customVariants,
		slotVariantsWithCustom, getActiveVariant, selectVariant,
		addCustomVariant, removeCustomVariant, markCompleted, startSession, completeSession,
		markExerciseComplete, unmarkExerciseComplete, prescriptionFor, READINESS, READINESS_LABELS
	} from '$lib/store.js';
	import { suggestionsFor } from '$lib/variations.js';
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

	// __BUILD__ is replaced at build time — see vite.config.js.
	const buildSha = __BUILD__.sha;
	const buildShort = buildSha.slice(0, 7);
	const buildDate = new Date(__BUILD__.at).toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'short',
		year: 'numeric'
	});
	let sessionPRs = $state(0);
	let showComplete = $state(false);
	let pendingReadiness = $state('normal');
	let focusedSlotId = $state(null);
	// The band picked on each card, for today only. Unpicked, a card uses the
	// band its programmed range sits in.
	let bandPick = $state({});

	onMount(() => { initializeCloud(); });

	// Readiness scales the day's instructions: a rough day downgrades
	// progression to matching the last session.
	let readiness = $derived($activeSession?.readiness ?? 'normal');
	const READINESS_BLURB = {
		low: "Slept badly, sore, stressed — match, don't chase",
		normal: 'Business as usual',
		high: 'Fresh and ready to push'
	};

	let isSessionActive = $derived(!!$activeSession);
	// A session belongs to the day it started on. Browsing elsewhere mid-session
	// is just looking — the session is untouched, and this is the way back.
	let browsingAway = $derived(isSessionActive && $activeSession.dayIndex !== $currentDayIndex);
	let completedExercises = $derived($activeSession?.completedExercises ?? []);
	let allDone = $derived(isSessionActive && $currentDay.exercises.every((e) => completedExercises.includes(e.id)));

	$effect(() => {
		if ($migrationAvailable && !migrationDismissed) showMigration = true;
	});

	// Everything the day view needs, computed once: the active variant, the
	// band chips, today's prescription, and what was logged today.
	let plan = $derived(
		$currentDay.exercises.map((slot) => {
			const exercise = getActiveVariant(slot, $exerciseSelections, $customVariants);
			const rx = prescriptionFor($sessions, slot, exercise, bandPick[slot.id], readiness, $customVariants);
			return {
				slot,
				exercise,
				rx,
				choices: bandChoices($sessions, exercise),
				variants: slotVariantsWithCustom(slot, $customVariants),
				loggedToday: loggedTodayFor(exercise.movement)
			};
		})
	);

	// The exercise you're up to: the first incomplete one, unless you tapped
	// another to jump to it.
	let currentSlotId = $derived.by(() => {
		// A completed exercise can be focused too — tapping it should show what
		// you logged, not hide it.
		if (focusedSlotId) return focusedSlotId;
		return $currentDay.exercises.find((e) => !completedExercises.includes(e.id))?.id ?? null;
	});

	function loggedTodayFor(movement) {
		const today = new Date().toISOString().slice(0, 10);
		return $sessions.findLast((s) => s.movement === movement && String(s.date).slice(0, 10) === today) ?? null;
	}

	// The shape of the day, before you start.
	let shape = $derived.by(() => {
		const counts = { reps: 0, load: 0, back: 0, base: 0 };
		for (const { rx } of plan) {
			const d = rx?.direction;
			if (!d) continue;
			if (d.tone === 'new' && d.move === 'none') counts.base++;
			else if (d.move === 'reps') counts.reps++;
			else if (d.move === 'load' && d.tone === 'back-off') counts.back++;
			else if (d.move === 'load') counts.load++;
		}
		return [
			counts.reps && `${counts.reps} rep push${counts.reps > 1 ? 'es' : ''}`,
			counts.load && `${counts.load} load step${counts.load > 1 ? 's' : ''}`,
			counts.back && `${counts.back} back off`,
			counts.base && `${counts.base} baseline${counts.base > 1 ? 's' : ''}`
		].filter(Boolean).join(' · ');
	});

	// The log sheet works from the prescription the card showed, band included.
	let selectedRx = $derived(plan.find((p) => p.slot.id === selectedSlot?.id)?.rx ?? null);

	function tap(slot, variant) { selectedSlot = slot; selectedExercise = variant; showLog = true; }
	function closeLog() { showLog = false; selectedSlot = null; selectedExercise = null; }
	function tick(slot, variant) { markExerciseComplete(slot.id); markCompleted(slot.id, variant.id); focusedSlotId = null; }

	function finishSession() {
		completeSession($currentDayIndex, sessionPRs, readiness);
		sessionPRs = 0;
		focusedSlotId = null;
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
				<h1 class="t-label text-text-dim pt-1">Gym Tracker</h1>
				<SyncIndicator />
			</div>
			<div class="flex items-center gap-1 p-1 rounded-lg bg-bg-card border border-border">
				{#each [['workout', 'Workout'], ['history', 'History'], ['stats', 'Stats']] as [key, label]}
					<button onclick={() => (view = key)}
						class="flex-1 py-1.5 rounded-md t-label transition-colors {view === key ? 'bg-accent/15 text-accent' : 'text-text-muted'}">
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
					<div class="t-label text-text-muted mb-2">Your data</div>
					<button onclick={downloadCloudBackup}
						class="w-full py-2.5 mb-2 rounded-lg bg-bg border border-border text-text-dim t-label hover:text-text">
						Download a backup
					</button>
					<button onclick={signOut}
						class="w-full py-2.5 rounded-lg bg-bg border border-border text-text-muted t-label hover:text-text-dim">
						Sign out
					</button>
				</div>

				<!-- Which build is this? Stamped at build time from Vercel's own git
				     variables, so it cannot disagree with what is deployed. -->
				<p class="mt-4 mb-2 text-center t-meta text-text-muted break-words">
					built from
					{#if buildSha}
						<a href="https://github.com/kierenhyl/gym-tracker/commit/{buildSha}"
							target="_blank" rel="noreferrer" class="underline underline-offset-2 hover:text-text-dim">{buildShort}</a>
					{:else}
						local
					{/if}
					· {__BUILD__.ref} · {buildDate}
				</p>
			</div>
		{:else}
			<div class="flex items-center justify-between mb-4" in:fly={{ y: 20, duration: 200 }}>
				<button onclick={() => currentDayIndex.update((i) => (i - 1 + program.length) % program.length)}
					aria-label="Previous day"
					class="w-10 h-10 flex items-center justify-center rounded-lg bg-bg-card border border-border text-text-dim hover:text-accent disabled:opacity-40">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
				</button>
				<div class="text-center">
					<div class="t-label text-accent">Day {$currentDay.day} of 5</div>
					<h2 class="text-2xl font-bold tracking-tight">{$currentDay.name}</h2>
				</div>
				<button onclick={() => currentDayIndex.update((i) => (i + 1) % program.length)}
					aria-label="Next day"
					class="w-10 h-10 flex items-center justify-center rounded-lg bg-bg-card border border-border text-text-dim hover:text-accent disabled:opacity-40">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
				</button>
			</div>

			{#if shape}
				<p class="t-meta text-text-muted text-center mb-5">{shape}</p>
			{/if}

			{#if browsingAway}
				<button onclick={() => currentDayIndex.set($activeSession.dayIndex)}
					class="w-full mb-6 px-3.5 py-3 rounded-xl bg-accent/10 border border-accent/30 text-left flex items-center gap-2">
					<span class="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0"></span>
					<span class="t-body text-accent flex-1">
						Session running on Day {program[$activeSession.dayIndex].day} — {program[$activeSession.dayIndex].name}
					</span>
					<span class="t-label text-accent/70">back to it</span>
				</button>
			{/if}

			{#if !isSessionActive}
				<div class="mb-6">
					<div class="t-label text-text-muted mb-2">How are you feeling today?</div>
					<div class="grid grid-cols-3 gap-2 mb-2">
						{#each READINESS as level}
							<button onclick={() => (pendingReadiness = level)}
								class="py-2.5 rounded-xl border t-label font-bold transition-all active:scale-[0.97] {pendingReadiness === level ? 'bg-accent/15 border-accent/40 text-accent' : 'bg-bg-card border-border text-text-dim'}">
								{READINESS_LABELS[level]}
							</button>
						{/each}
					</div>
					<p class="t-label text-text-muted normal-case tracking-normal mb-3">{READINESS_BLURB[pendingReadiness]}</p>
					<button onclick={() => startSession($currentDayIndex, pendingReadiness)}
						class="w-full py-4 rounded-xl bg-accent/10 border border-accent/30 text-accent font-semibold text-lg active:scale-[0.98]">
						Start Session
					</button>
				</div>
			{/if}

			<div class="space-y-2">
				{#each plan as item, i (item.slot.id)}
					<div in:fly={{ y: 16, duration: 180, delay: i * 30 }}>
						<ExerciseCard
							slot={item.slot}
							exercise={item.exercise}
							variants={item.variants}
							choices={item.choices}
							prescription={item.rx}
							loggedToday={item.loggedToday}
							isActive={isSessionActive}
							isCompleted={completedExercises.includes(item.slot.id)}
							isCurrent={item.slot.id === currentSlotId}
							onTap={() => tap(item.slot, item.exercise)}
							onTick={() => tick(item.slot, item.exercise)}
							onUndoTick={() => unmarkExerciseComplete(item.slot.id)}
							suggestions={suggestionsFor(item.slot.movement, item.variants)}
							onFocus={() => (focusedSlotId = item.slot.id)}
							onSelectBand={(band) => (bandPick = { ...bandPick, [item.slot.id]: band })}
							onSelectVariant={(id) => selectVariant(item.slot.id, id)}
							onAddVariant={(name) => addCustomVariant(item.slot.id, name)}
							onRemoveVariant={(id) => removeCustomVariant(item.slot.id, id)}
							onEditHistory={() => { editHistoryExercise = item.exercise; showEditHistory = true; }}
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
		prescription={selectedRx}
		sessions={historyForMovement($sessions, selectedExercise.movement)}
		record={recordFor($records, selectedExercise, selectedRx?.band)}
		{readiness}
		onClose={closeLog}
		onExerciseComplete={() => { markExerciseComplete(selectedSlot.id); focusedSlotId = null; }}
		onPR={() => sessionPRs++}
	/>
{/if}

{#if showEditHistory && editHistoryExercise}
	<EditHistoryModal exercise={editHistoryExercise} onClose={() => { showEditHistory = false; editHistoryExercise = null; }} />
{/if}

{#if showMigration}
	<MigrationModal onClose={() => { showMigration = false; migrationDismissed = true; }} />
{/if}
