import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { program, exerciseIndex, movementForId, movementName } from './program.js';
import { withTrainingModel, bandConfigFor, structureFor, GUARDRAIL_EXEMPT_MUSCLES } from './training.js';
import { BANDS, bucketFor, bandLabel, repsOf } from './bands.js';
import { prescribe, isStalled, sessionsInBand } from './prescribe.js';
import { toSessions } from './sessions.js';

// --- Config ---
export const STALE_DAYS = 14;
export const PROGRAM_VERSION = 2;
export const WEEKLY_SETS_MIN = 10;
export const WEEKLY_SETS_MAX = 20;

export const READINESS = ['low', 'normal', 'high'];
export const READINESS_LABELS = { low: 'ROUGH', normal: 'NORMAL', high: 'GOOD' };

// --- Cloud persistence ---
function loadJSON(key, fallback) {
	if (!browser) return fallback;
	try {
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) : fallback;
	} catch {
		return fallback;
	}
}

export const cloudPhase = writable('loading'); // loading | setup | login | ready | error
export const syncStatus = writable('idle'); // idle | pending | saving | saved | error | conflict
export const syncMessage = writable('');
export const migrationAvailable = writable(false);

let cloudVersion = 1;
let initialized = false;
let hydrating = true;
let dirty = false;
let saveInFlight = false;
let saveTimer;
let lastMigration = null;
const IDLE_SAVE_DELAY_MS = 2 * 60 * 1000;

// --- Stores ---

export const currentDayIndex = writable(0);
export const workoutLog = writable([]);
export const completionLog = writable([]);
export const exerciseSelections = writable({});
export const activeSession = writable(null);
export const sessionHistory = writable([]);

// User-created gym-specific variations, per slot:
//   { [slotId]: [{ id, movement, name, basedOn, muscle }] }
// A different station is not the same load, so each gets its own movement key
// and therefore its own records.
export const customVariants = writable({});

const persistedStores = [
	currentDayIndex,
	workoutLog,
	completionLog,
	exerciseSelections,
	activeSession,
	sessionHistory,
	customVariants
];

// Historic rows predate rep bands. Split the old `method` into structure plus a
// per-set bucket, and stamp them `legacy` when no effort was recorded. Rows
// logged as one total (`format: 'total'`) are already complete. Neither kind
// is rewritten into the other: sessions.js reads both.
function migrateLog(log) {
	return log.map((entry) => {
		if (entry.format === 'total' || (entry.structure && entry.bucket)) return entry;
		const movement = entry.movement ?? movementForId(entry.exerciseId);
		const def = exerciseIndex[entry.exerciseId];
		const structure = entry.structure ?? structureFor(entry.method ?? def?.method);
		const next = { ...entry, movement, structure };
		next.bucket = bucketFor(next, bandConfigFor(movement, def?.repRange, def?.sets).bands);
		if (entry.rir == null) next.legacy = true;
		return next;
	});
}

function migrateSessionHistory(history) {
	return history.map((session) => ({
		...session,
		programVersion: session.programVersion ?? 1
	}));
}

function stateSnapshot() {
	return {
		programVersion: PROGRAM_VERSION,
		currentDayIndex: get(currentDayIndex),
		workoutLog: get(workoutLog),
		completionLog: get(completionLog),
		exerciseSelections: get(exerciseSelections),
		customVariants: get(customVariants),
		activeSession: get(activeSession),
		sessionHistory: get(sessionHistory),
		migration: lastMigration
	};
}

function applyState(data) {
	hydrating = true;
	currentDayIndex.set(Number.isInteger(data?.currentDayIndex) ? data.currentDayIndex : 0);
	workoutLog.set(migrateLog(Array.isArray(data?.workoutLog) ? data.workoutLog : []));
	completionLog.set(Array.isArray(data?.completionLog) ? data.completionLog : []);
	exerciseSelections.set(
		data?.exerciseSelections && typeof data.exerciseSelections === 'object'
			? data.exerciseSelections
			: {}
	);
	customVariants.set(
		data?.customVariants && typeof data.customVariants === 'object' ? data.customVariants : {}
	);
	activeSession.set(data?.activeSession ?? null);
	sessionHistory.set(
		migrateSessionHistory(Array.isArray(data?.sessionHistory) ? data.sessionHistory : [])
	);
	lastMigration = data?.migration ?? null;
	hydrating = false;
}

export function hasLegacyData() {
	if (!browser) return false;
	return ['gym_log', 'gym_completions', 'gym_history', 'gym_session', 'gym_currentDay'].some(
		(key) => localStorage.getItem(key) !== null
	);
}

function cloudIsEmpty() {
	return get(workoutLog).length === 0 && get(sessionHistory).length === 0 && !lastMigration;
}

async function requestJSON(url, options) {
	const response = await fetch(url, options);
	let body = {};
	try {
		body = await response.json();
	} catch {
		// Preserve the HTTP status when a platform error returns no JSON.
	}
	return { response, body };
}

export async function initializeCloud(force = false) {
	if (!browser || (initialized && !force)) return;
	initialized = true;
	cloudPhase.set('loading');
	syncMessage.set('');

	try {
		const setupResult = await requestJSON('/api/setup');
		if (!setupResult.response.ok) throw new Error(setupResult.body.error ?? 'Could not check setup.');
		if (setupResult.body.needsSetup) {
			cloudPhase.set('setup');
			return;
		}

		const stateResult = await requestJSON('/api/state');
		if (stateResult.response.status === 401) {
			cloudPhase.set('login');
			return;
		}
		if (!stateResult.response.ok) {
			throw new Error(stateResult.body.error ?? 'Could not load cloud data.');
		}

		cloudVersion = stateResult.body.version;
		applyState(stateResult.body.data);
		migrationAvailable.set(cloudIsEmpty());
		cloudPhase.set('ready');
		syncStatus.set('saved');
	} catch (error) {
		cloudPhase.set('error');
		syncStatus.set('error');
		syncMessage.set(error?.message ?? 'Could not connect to cloud storage.');
	}
}

export async function submitAccess(password, setup = false) {
	const { response, body } = await requestJSON(setup ? '/api/setup' : '/api/login', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ password })
	});
	if (!response.ok) throw new Error(body.error ?? 'Could not sign in.');
	await initializeCloud(true);
}

export async function signOut() {
	await fetch('/api/logout', { method: 'POST' });
	initialized = false;
	cloudPhase.set('login');
	syncStatus.set('idle');
}

function scheduleSave() {
	if (hydrating || get(cloudPhase) !== 'ready') return;
	dirty = true;
	// Logging several exercises is one workout, not several independent saves.
	// Save it as a batch when the session ends; this timer is only a safety net
	// for an unfinished session or a history edit.
	syncStatus.set('pending');
	syncMessage.set('Changes will save when you finish, or after a short pause.');
	clearTimeout(saveTimer);
	saveTimer = setTimeout(() => flushCloudState(), IDLE_SAVE_DELAY_MS);
}

export async function flushCloudState() {
	clearTimeout(saveTimer);
	if (!browser || saveInFlight || !dirty || get(cloudPhase) !== 'ready') return;
	saveInFlight = true;
	dirty = false;
	syncStatus.set('saving');

	try {
		const snapshot = stateSnapshot();
		const { response, body } = await requestJSON('/api/state', {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ data: snapshot, expectedVersion: cloudVersion })
		});
		if (response.status === 401) {
			cloudPhase.set('login');
			throw new Error('Your session expired. Sign in again before continuing.');
		}
		if (response.status === 409) {
			syncStatus.set('conflict');
			syncMessage.set(body.error ?? 'Cloud data changed elsewhere. Reload before continuing.');
			return;
		}
		if (!response.ok) throw new Error(body.error ?? 'Could not save changes.');
		cloudVersion = body.version;
		syncStatus.set('saved');
		syncMessage.set('');
	} catch (error) {
		if (get(syncStatus) !== 'conflict') {
			dirty = true;
			syncStatus.set('error');
			syncMessage.set(error?.message ?? 'Could not save changes.');
		}
	} finally {
		saveInFlight = false;
		if (dirty && get(syncStatus) !== 'conflict' && get(cloudPhase) === 'ready') {
			clearTimeout(saveTimer);
			saveTimer = setTimeout(() => flushCloudState(), IDLE_SAVE_DELAY_MS);
		}
	}
}

export function retryCloudSave() {
	if (get(syncStatus) === 'conflict') {
		window.location.reload();
		return;
	}
	dirty = true;
	flushCloudState();
}

// --- Backups ---

// Download everything currently held in the cloud. There was no way to export
// cloud data before; without one, a bad release has no undo.
export function downloadCloudBackup() {
	const backup = {
		exportedAt: new Date().toISOString(),
		source: 'cloud',
		version: cloudVersion,
		data: stateSnapshot()
	};
	const href = URL.createObjectURL(
		new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
	);
	const anchor = document.createElement('a');
	anchor.href = href;
	anchor.download = `gym-tracker-cloud-${new Date().toISOString().slice(0, 10)}.json`;
	anchor.click();
	URL.revokeObjectURL(href);
}

export function legacySummary() {
	const log = loadJSON('gym_log', []);
	const completions = loadJSON('gym_completions', []);
	const history = loadJSON('gym_history', []);
	return {
		sets: Array.isArray(log) ? log.length : 0,
		completions: Array.isArray(completions) ? completions.length : 0,
		sessions: Array.isArray(history) ? history.length : 0
	};
}

function stateFromLegacyKeys(keys) {
	return {
		currentDayIndex: Number.isInteger(keys.gym_currentDay) ? keys.gym_currentDay : 0,
		workoutLog: migrateLog(Array.isArray(keys.gym_log) ? keys.gym_log : []),
		completionLog: Array.isArray(keys.gym_completions) ? keys.gym_completions : [],
		exerciseSelections:
			keys.gym_selections && typeof keys.gym_selections === 'object' ? keys.gym_selections : {},
		customVariants: {},
		activeSession: keys.gym_session ?? null,
		sessionHistory: Array.isArray(keys.gym_history) ? keys.gym_history : [],
		migration: { importedAt: new Date().toISOString(), source: 'localStorage-v1' }
	};
}

function localLegacyKeys() {
	return Object.fromEntries(
		['gym_currentDay', 'gym_log', 'gym_completions', 'gym_selections', 'gym_session', 'gym_history']
			.map((key) => [key, loadJSON(key, null)])
	);
}

export function downloadLegacyBackup() {
	const backup = { exportedAt: new Date().toISOString(), keys: localLegacyKeys() };
	const href = URL.createObjectURL(
		new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
	);
	const anchor = document.createElement('a');
	anchor.href = href;
	anchor.download = `gym-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
	anchor.click();
	URL.revokeObjectURL(href);
}

export async function importLegacyData() {
	if (!cloudIsEmpty() || !hasLegacyData()) {
		throw new Error('Cloud data is not empty or no browser data was found.');
	}
	await importState(stateFromLegacyKeys(localLegacyKeys()));
}

async function importState(state) {
	if (!cloudIsEmpty()) throw new Error('Cloud data is not empty. Reload before importing.');
	applyState(state);
	dirty = true;
	await flushCloudState();
	if (get(syncStatus) !== 'saved') {
		throw new Error(get(syncMessage) || 'The import did not finish saving.');
	}
}

export async function importLegacyBackup(contents) {
	let parsed;
	try {
		parsed = typeof contents === 'string' ? JSON.parse(contents) : contents;
	} catch {
		throw new Error('That file is not valid JSON.');
	}

	const keys = parsed?.keys ?? parsed;
	if (
		!keys ||
		typeof keys !== 'object' ||
		!('gym_log' in keys || 'gym_history' in keys || 'gym_currentDay' in keys)
	) {
		throw new Error('That file is not a Gym Tracker backup.');
	}
	await importState(stateFromLegacyKeys(keys));
}

export function clearLegacyData() {
	for (const key of [
		'gym_currentDay',
		'gym_log',
		'gym_completions',
		'gym_selections',
		'gym_session',
		'gym_history'
	]) {
		localStorage.removeItem(key);
	}
}

for (const store of persistedStores) store.subscribe(scheduleSave);

// Backgrounding a phone/browser is the other common way a workout is paused.
if (browser) {
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'hidden') void flushCloudState();
	});
}

// --- Sessions and records ---

export const currentDay = derived(currentDayIndex, ($i) => program[$i]);

// A record is movement + band. The same movement on different days shares a
// record per band; a different band keeps its own.
export function recordKey(movement, band) {
	return `${movement}::${band}`;
}

const movementOf = (entry) => entry.movement ?? movementForId(entry.exerciseId);

// Bands and totals for a logged entry. Custom variants are not in the
// programme index, so rows carry the range and set count they were logged
// against.
function configForEntry(entry) {
	const def = exerciseIndex[entry.exerciseId];
	return bandConfigFor(
		movementOf(entry),
		entry.targetRepRange ?? def?.repRange,
		entry.targetSets ?? def?.sets
	);
}

// Every performance in the log, one row each, oldest first. See sessions.js
// for how set-by-set history is converted.
export function sessionsOf(log) {
	return toSessions(log, movementOf, configForEntry);
}

export const sessions = derived(workoutLog, sessionsOf);

// Best per movement+band, by weight × total reps.
export const records = derived(sessions, ($sessions) => {
	const recs = {};
	for (const s of $sessions) {
		const key = recordKey(s.movement, s.band);
		if (!recs[key] || s.score > recs[key].score) recs[key] = s;
	}
	return recs;
});

export function recordFor(recs, exercise, band) {
	if (!exercise) return undefined;
	return recs[recordKey(exercise.movement, band ?? exercise.defaultBand)];
}

function daysBetween(iso, now = Date.now()) {
	return (now - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

export const staleRecords = derived(records, ($recs) => {
	const stale = {};
	const now = Date.now();
	for (const [key, rec] of Object.entries($recs)) {
		const days = daysBetween(rec.date, now);
		if (days >= STALE_DAYS) stale[key] = Math.floor(days);
	}
	return stale;
});

export function historyForMovement(allSessions, movement) {
	return allSessions.filter((s) => s.movement === movement);
}

// One chip per band on the card: its range, and the weight you last used in it.
export function bandChoices(allSessions, exercise) {
	const history = historyForMovement(allSessions, exercise.movement);
	return exercise.bands.map((band) => {
		const [lo, hi] = exercise.targetTotals[band];
		const last = sessionsInBand(history, band).at(-1);
		return { band, label: BANDS[band].label, lo, hi, lastWeight: last?.weight ?? null };
	});
}

// --- Variants ---

export function customVariantsFor(custom, slotId) {
	return custom?.[slotId] ?? [];
}

// The programme has no built-in alternatives, so the only swaps are the ones
// created here — gym-specific stations whose loads are not comparable.
export function slotVariantsWithCustom(slot, custom) {
	const primary = withTrainingModel({ ...slot, isPrimary: true });
	const customs = customVariantsFor(custom, slot.id).map((c) =>
		withTrainingModel({
			...slot,
			id: c.id,
			movement: c.movement,
			name: c.name,
			muscle: c.muscle ?? slot.muscle,
			isPrimary: false,
			isCustom: true,
			basedOn: c.basedOn ?? slot.movement
		})
	);
	return [primary, ...customs];
}

export function getActiveVariant(slot, selections, custom) {
	const variants = slotVariantsWithCustom(slot, custom);
	const selectedId = selections?.[slot.id];
	return variants.find((v) => v.id === selectedId) ?? variants[0];
}

export function selectVariant(slotId, variantId) {
	exerciseSelections.update(($s) => ({ ...$s, [slotId]: variantId }));
}

export function addCustomVariant(slotId, name) {
	const clean = String(name ?? '').trim();
	if (!clean) return null;
	const slug = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
	const slot = program.flatMap((d) => d.exercises).find((e) => e.id === slotId);
	if (!slot || !slug) return null;
	const id = `custom-${slotId}-${slug}`;
	const variant = {
		id,
		movement: `custom-${slug}`,
		name: clean,
		basedOn: slot.movement,
		muscle: slot.muscle
	};
	let created = null;
	customVariants.update(($c) => {
		const existing = $c[slotId] ?? [];
		const match = existing.find((v) => v.id === id);
		if (match) {
			created = match;
			return $c;
		}
		created = variant;
		return { ...$c, [slotId]: [...existing, variant] };
	});
	if (created) selectVariant(slotId, created.id);
	return created;
}

export function removeCustomVariant(slotId, variantId) {
	customVariants.update(($c) => ({
		...$c,
		[slotId]: ($c[slotId] ?? []).filter((v) => v.id !== variantId)
	}));
	exerciseSelections.update(($s) => {
		if ($s[slotId] !== variantId) return $s;
		const next = { ...$s };
		delete next[slotId];
		return next;
	});
}

// --- Coaching ---

// The latest session on another variant of the same slot, shown as a reference
// when there is no history on the station picked today. Same band if there is
// one, since a low-rep weight is no guide to a high-rep one.
export function referenceFor(allSessions, slot, exercise, band, custom) {
	if (!slot || !exercise) return null;
	const siblings = slotVariantsWithCustom(slot, custom)
		.map((v) => v.movement)
		.filter((m) => m && m !== exercise.movement);
	const theirs = allSessions.filter((s) => siblings.includes(s.movement));
	const pick = theirs.filter((s) => s.band === band).at(-1) ?? theirs.at(-1);
	return pick ? { name: displayName(pick.movement), weight: pick.weight, total: pick.total } : null;
}

export function prescriptionFor(allSessions, slot, exercise, band, readiness = 'normal', custom) {
	if (!exercise) return null;
	const b = band ?? exercise.defaultBand;
	return prescribe({
		exercise,
		sessions: historyForMovement(allSessions, exercise.movement),
		band: b,
		readiness,
		reference: referenceFor(allSessions, slot, exercise, b, custom)
	});
}

// --- Fatigue guardrails ---

// Programmed hard sets per muscle over the last 7 days. Legs are excluded: one
// exercise per day is the programme's deliberate recovery choice, not an
// accident to be flagged.
export function weeklySetsByMuscle(history, days = 7) {
	const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
	const totals = {};
	for (const session of history) {
		if (new Date(session.date).getTime() < cutoff) continue;
		const day = program[session.dayIndex];
		if (!day) continue;
		for (const slot of day.exercises) {
			if (GUARDRAIL_EXEMPT_MUSCLES.has(slot.muscle)) continue;
			totals[slot.muscle] = (totals[slot.muscle] ?? 0) + (slot.sets ?? 0);
		}
	}
	return totals;
}

export function stalledMovements(allSessions) {
	const byKey = new Map();
	for (const s of allSessions) {
		const key = recordKey(s.movement, s.band);
		if (!byKey.has(key)) byKey.set(key, []);
		byKey.get(key).push(s);
	}
	const out = [];
	for (const [key, list] of byKey) {
		if (isStalled(list)) out.push({ key, load: list.at(-1).weight });
	}
	return out;
}

// --- Analytics ---

export function exerciseProgress(allSessions, key) {
	return allSessions
		.filter((s) => recordKey(s.movement, s.band) === key)
		.map((s) => ({ date: s.date, weight: s.weight, total: s.total }));
}

function walkPRs(allSessions, onPR) {
	const best = {};
	for (const s of allSessions) {
		const key = recordKey(s.movement, s.band);
		if (best[key] == null || s.score > best[key]) {
			best[key] = s.score;
			onPR({ ...s, key });
		}
	}
}

export function recentPRs(allSessions, days = 30) {
	const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
	const prs = [];
	walkPRs(allSessions, (s) => {
		if (new Date(s.date).getTime() >= cutoff) prs.push(s);
	});
	return prs.reverse();
}

export function countPRsInWindow(allSessions, startDaysAgo, endDaysAgo) {
	const now = Date.now();
	const start = now - startDaysAgo * 24 * 60 * 60 * 1000;
	const end = now - endDaysAgo * 24 * 60 * 60 * 1000;
	let count = 0;
	walkPRs(allSessions, (s) => {
		const t = new Date(s.date).getTime();
		if (t >= start && t < end) count++;
	});
	return count;
}

export function sessionsInWindow(history, days) {
	const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
	return history.filter((s) => new Date(s.date).getTime() >= cutoff).length;
}

export function currentStreak(history) {
	if (history.length === 0) return 0;
	const dayKeys = new Set(history.map((s) => new Date(s.date).toISOString().slice(0, 10)));
	let streak = 0;
	const cursor = new Date();
	if (!dayKeys.has(cursor.toISOString().slice(0, 10))) {
		cursor.setDate(cursor.getDate() - 1);
	}
	while (dayKeys.has(cursor.toISOString().slice(0, 10))) {
		streak++;
		cursor.setDate(cursor.getDate() - 1);
	}
	return streak;
}

export function totalVolumeLifted(log) {
	return log.reduce(
		(sum, e) => sum + (e.weight != null && e.reps != null ? e.weight * repsOf(e) : 0),
		0
	);
}

// The biggest rise in working weight on one movement and band: the weight goes
// up only when a range is topped, so it is the cleanest sign of progress.
export function biggestGain(allSessions, days = 60) {
	const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
	const before = {};
	const after = {};
	for (const s of allSessions) {
		const key = recordKey(s.movement, s.band);
		if (new Date(s.date).getTime() < cutoff) before[key] = Math.max(before[key] ?? 0, s.weight);
		else after[key] = Math.max(after[key] ?? 0, s.weight);
	}
	let top = null;
	for (const key of Object.keys(after)) {
		const base = before[key];
		if (!base) continue;
		const gain = after[key] - base;
		if (gain > 0 && (!top || gain > top.gain)) top = { key, gain, from: base, to: after[key] };
	}
	return top;
}

function displayName(movement) {
	const custom = Object.values(get(customVariants))
		.flat()
		.find((v) => v.movement === movement);
	return custom?.name ?? movementName(movement);
}

export function exerciseName(id) {
	if (exerciseIndex[id]) return exerciseIndex[id].name;
	const custom = Object.values(get(customVariants))
		.flat()
		.find((v) => v.id === id);
	return custom?.name ?? movementName(movementForId(id));
}

export function recordLabel(key) {
	const [movement, band] = key.split('::');
	const name = displayName(movement);
	return band === 'moderate' ? name : `${name} · ${bandLabel(band).toLowerCase()}`;
}

// --- Actions ---

// One row per exercise: the weight and the total reps reached at it. The band
// is the one picked on the card, stored rather than derived. Range and set
// count are stored too, so a custom variant's row can still be filed.
export function logSession(exercise, { weight, total, band }, opts = {}) {
	const w = parseFloat(weight);
	const t = parseInt(total);
	if (!(w > 0) || !(t > 0) || !exercise) return;
	workoutLog.update(($log) => [
		...$log,
		{
			format: 'total',
			date: new Date().toISOString(),
			exerciseId: exercise.id,
			movement: exercise.movement,
			structure: 'straight',
			weight: w,
			reps: t,
			band,
			bucket: band,
			readiness: opts.readiness ?? null,
			targetSets: exercise.sets ?? null,
			targetRepRange: exercise.repRange ?? null
		}
	]);
}

// Correct a logged row. On an old myo-rep row the number that counts is the
// total, so that is what the reps field edits.
export function editLogEntry(entry, weight, reps) {
	const w = parseFloat(weight);
	const r = parseInt(reps);
	if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) return;
	workoutLog.update(($log) =>
		$log.map((e) => {
			if (e !== entry) return e;
			if (e.totalReps != null) return { ...e, weight: w, totalReps: r };
			const next = { ...e, weight: w, reps: r };
			if (e.format !== 'total') next.bucket = bucketFor({ ...next, bucket: null }, configForEntry(next).bands);
			return next;
		})
	);
}

export function deleteLogEntry(entry) {
	workoutLog.update(($log) => $log.filter((e) => e !== entry));
}

export function markCompleted(slotId, exerciseId) {
	completionLog.update(($log) => [
		...$log,
		{ date: new Date().toISOString(), exerciseId: exerciseId ?? slotId }
	]);
}

export function startSession(dayIndex, readiness = 'normal') {
	activeSession.set({
		dayIndex,
		startedAt: new Date().toISOString(),
		readiness,
		completedExercises: []
	});
}

export function setReadiness(readiness) {
	activeSession.update(($s) => ($s ? { ...$s, readiness } : $s));
}

export function markExerciseComplete(slotId) {
	activeSession.update(($s) => {
		if (!$s) return $s;
		if ($s.completedExercises.includes(slotId)) return $s;
		return { ...$s, completedExercises: [...$s.completedExercises, slotId] };
	});
}

// Ticking an exercise by accident should not cost you the rest of the session.
export function unmarkExerciseComplete(slotId) {
	activeSession.update(($s) =>
		$s ? { ...$s, completedExercises: $s.completedExercises.filter((id) => id !== slotId) } : $s
	);
}

export function completeSession(dayIndex, prCount, readiness = 'normal') {
	sessionHistory.update(($h) => [
		...$h,
		{
			date: new Date().toISOString(),
			dayIndex,
			dayName: program[dayIndex].name,
			programVersion: PROGRAM_VERSION,
			exerciseCount: program[dayIndex].exercises.length,
			prCount,
			readiness
		}
	]);

	currentDayIndex.update(($i) => ($i + 1) % program.length);
	activeSession.set(null);

	// The normal commit point for a workout. Store updates above are synchronous,
	// so this snapshot contains the completed session and its sets.
	void flushCloudState();
}
