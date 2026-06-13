<script>
	import {
		workoutLog,
		sessionHistory,
		staleRecords,
		recentPRs,
		countPRsInWindow,
		sessionsInWindow,
		currentStreak,
		totalVolumeLifted,
		biggestGain,
		exerciseProgress,
		exerciseName
	} from './store.js';

	// --- Headline stats ---
	let streak = $derived(currentStreak($sessionHistory));
	let sessions7 = $derived(sessionsInWindow($sessionHistory, 7));
	let sessions30 = $derived(sessionsInWindow($sessionHistory, 30));
	let totalSessions = $derived($sessionHistory.length);
	let totalVolume = $derived(totalVolumeLifted($workoutLog));

	// --- Momentum: PRs last 30 vs prior 30 ---
	let prsThis30 = $derived(countPRsInWindow($workoutLog, 30, 0));
	let prsPrev30 = $derived(countPRsInWindow($workoutLog, 60, 30));
	let momentum = $derived(prsThis30 - prsPrev30);

	// --- Biggest recent gain ---
	let topGain = $derived(biggestGain($workoutLog, 60));

	// --- Recent PRs feed ---
	let recent = $derived(recentPRs($workoutLog, 30).slice(0, 6));

	// --- Stale "GO FOR IT" list ---
	let stale = $derived(
		Object.entries($staleRecords)
			.map(([id, days]) => ({ id, days, name: exerciseName(id) }))
			.sort((a, b) => b.days - a.days)
			.slice(0, 8)
	);

	// --- Per-exercise e1RM progression (exercises with >= 2 records) ---
	let charts = $derived.by(() => {
		const ids = [...new Set($workoutLog.filter((e) => e.weight != null).map((e) => e.exerciseId))];
		return ids
			.map((id) => {
				const points = exerciseProgress($workoutLog, id);
				return { id, name: exerciseName(id), points };
			})
			.filter((c) => c.points.length >= 2)
			.sort((a, b) => new Date(b.points.at(-1).date) - new Date(a.points.at(-1).date))
			.slice(0, 8);
	});

	function sparkline(points, w = 120, h = 30) {
		const vals = points.map((p) => p.e1rm);
		const min = Math.min(...vals);
		const max = Math.max(...vals);
		const range = max - min || 1;
		const step = points.length > 1 ? w / (points.length - 1) : 0;
		return vals
			.map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`)
			.join(' ');
	}

	function trendPct(points) {
		const first = points[0].e1rm;
		const last = points.at(-1).e1rm;
		if (!first) return 0;
		return Math.round(((last - first) / first) * 100);
	}

	function fmtDate(iso) {
		const d = new Date(iso);
		return `${d.getDate()} ${d.toLocaleDateString('en-NZ', { month: 'short' })}`;
	}

	function fmtNum(n) {
		return Math.round(n).toLocaleString('en-NZ');
	}
</script>

<div>
	<h2 class="text-xl font-bold mb-4">Stats</h2>

	{#if totalSessions === 0 && $workoutLog.length === 0}
		<div class="text-center py-12">
			<div class="text-text-muted font-mono text-sm">No data yet.</div>
			<div class="text-text-muted font-mono text-xs mt-1">Log a few sessions to unlock your stats.</div>
		</div>
	{:else}
		<!-- Headline grid -->
		<div class="grid grid-cols-2 gap-2 mb-4">
			<div class="rounded-xl bg-bg-card border border-border p-3">
				<div class="font-mono text-[10px] text-text-muted tracking-wider">CURRENT STREAK</div>
				<div class="text-2xl font-bold mt-1">{streak}<span class="text-sm font-normal text-text-dim ml-1">day{streak === 1 ? '' : 's'}</span></div>
			</div>
			<div class="rounded-xl bg-bg-card border border-border p-3">
				<div class="font-mono text-[10px] text-text-muted tracking-wider">PRs THIS MONTH</div>
				<div class="text-2xl font-bold mt-1 text-pr">
					{prsThis30}
					{#if momentum !== 0}
						<span class="text-xs font-normal {momentum > 0 ? 'text-success' : 'text-danger'} ml-1">
							{momentum > 0 ? '▲' : '▼'}{Math.abs(momentum)}
						</span>
					{/if}
				</div>
			</div>
			<div class="rounded-xl bg-bg-card border border-border p-3">
				<div class="font-mono text-[10px] text-text-muted tracking-wider">SESSIONS · 7D / 30D</div>
				<div class="text-2xl font-bold mt-1">{sessions7}<span class="text-sm font-normal text-text-dim"> / {sessions30}</span></div>
			</div>
			<div class="rounded-xl bg-bg-card border border-border p-3">
				<div class="font-mono text-[10px] text-text-muted tracking-wider">TOTAL VOLUME</div>
				<div class="text-2xl font-bold mt-1">{fmtNum(totalVolume)}<span class="text-sm font-normal text-text-dim ml-1">kg</span></div>
			</div>
		</div>

		{#if topGain}
			<div class="rounded-xl bg-success/5 border border-success/20 p-3 mb-4">
				<div class="font-mono text-[10px] text-success/70 tracking-wider">BIGGEST GAIN · 60D</div>
				<div class="flex items-baseline justify-between mt-1">
					<div class="font-semibold text-sm">{exerciseName(topGain.exerciseId)}</div>
					<div class="font-mono text-sm text-success">
						+{fmtNum(topGain.gain)}kg e1RM
					</div>
				</div>
				<div class="font-mono text-[11px] text-text-dim mt-0.5">
					{fmtNum(topGain.from)} → {fmtNum(topGain.to)}kg estimated max
				</div>
			</div>
		{/if}

		<!-- GO FOR IT list -->
		{#if stale.length > 0}
			<div class="mb-5">
				<div class="flex items-center gap-2 mb-2">
					<span>🔥</span>
					<h3 class="font-mono text-xs text-pr tracking-wider">GO FOR IT — records gone stale</h3>
				</div>
				<div class="space-y-1.5">
					{#each stale as item}
						<div class="flex items-center justify-between px-3 py-2 rounded-lg bg-pr/5 border border-pr/15">
							<span class="text-sm font-medium">{item.name}</span>
							<span class="font-mono text-[11px] text-pr/80">{item.days}d ago</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Progression charts -->
		{#if charts.length > 0}
			<div class="mb-5">
				<h3 class="font-mono text-xs text-text-dim tracking-wider mb-2">PROGRESSION · estimated 1RM</h3>
				<div class="space-y-2">
					{#each charts as c}
						{@const pct = trendPct(c.points)}
						<div class="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-bg-card border border-border">
							<div class="flex-1 min-w-0">
								<div class="text-sm font-medium truncate">{c.name}</div>
								<div class="font-mono text-[10px] text-text-muted">
									now {fmtNum(c.points.at(-1).e1rm)}kg · {c.points.length} logs
								</div>
							</div>
							<svg viewBox="0 0 120 30" class="w-[120px] h-[30px] flex-shrink-0 overflow-visible" preserveAspectRatio="none">
								<polyline
									points={sparkline(c.points)}
									fill="none"
									stroke={pct >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}
									stroke-width="1.5"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
							<div class="font-mono text-xs {pct >= 0 ? 'text-success' : 'text-danger'} w-10 text-right">
								{pct >= 0 ? '+' : ''}{pct}%
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Recent PRs feed -->
		{#if recent.length > 0}
			<div>
				<h3 class="font-mono text-xs text-text-dim tracking-wider mb-2">RECENT PRs</h3>
				<div class="space-y-1.5">
					{#each recent as pr}
						<div class="flex items-center justify-between px-3 py-2 rounded-lg bg-bg-card border border-border">
							<div>
								<div class="text-sm font-medium">{exerciseName(pr.exerciseId)}</div>
								<div class="font-mono text-[10px] text-text-muted">{fmtDate(pr.date)}</div>
							</div>
							<div class="font-mono text-sm font-bold text-pr">{pr.weight}kg x {pr.reps}</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>
