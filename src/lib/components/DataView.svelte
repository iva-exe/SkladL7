<script lang="ts">
	import { getVehicles } from "$lib/stores/vehicles.svelte";
	import { aggregateMonthly } from "$lib/utils/monthlyStats";

	const vehicles = $derived(getVehicles());
	const months = $derived(aggregateMonthly(vehicles));

	// Highlight: top totalDays across visible months → drives the bar fill
	const maxDays = $derived(months.reduce((m, b) => Math.max(m, b.totalDays), 0) || 1);

	// Grand totals across all months
	const grandTotal = $derived(months.reduce((acc, b) => {
		acc.days += b.totalDays;
		acc.arrived += b.arrived;
		acc.departed += b.departed;
		return acc;
	}, { days: 0, arrived: 0, departed: 0 }));

	const now = new Date();
	const currentKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;

	function fmt(n: number): string {
		return n.toLocaleString("cs-CZ");
	}

	function dayWord(n: number): string {
		if (n === 1) return "den";
		if (n >= 2 && n <= 4) return "dny";
		return "dní";
	}

	function vehicleWord(n: number): string {
		if (n === 1) return "vozidlo";
		if (n >= 2 && n <= 4) return "vozidla";
		return "vozidel";
	}
</script>

<div class="data-wrap">
	{#if !months.length}
		<div class="data-empty">
			<span class="data-empty-icon">○</span>
			Zatím žádná data k zobrazení.
		</div>
	{:else}
		<!-- Souhrnná řádka -->
		<div class="summary">
			<div class="sum-card">
				<div class="sum-label">
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="6"/><polyline points="12 10 12 12 13 13"/><path d="m16.13 7.66-.81-4.05a2 2 0 0 0-2-1.61h-2.68a2 2 0 0 0-2 1.61l-.78 4.05"/><path d="m7.88 16.36.8 4a2 2 0 0 0 2 1.64h2.72a2 2 0 0 0 2-1.61l.81-4.05"/>
					</svg>
					Celkem dní na skladě
				</div>
				<div class="sum-value sum-blue">{fmt(grandTotal.days)} <span class="sum-unit">{dayWord(grandTotal.days)}</span></div>
			</div>
			<div class="sum-card">
				<div class="sum-label">
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>
					</svg>
					Celkem naskladněno
				</div>
				<div class="sum-value sum-green">{fmt(grandTotal.arrived)}</div>
			</div>
			<div class="sum-card">
				<div class="sum-label">
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>
					</svg>
					Celkem vyskladněno
				</div>
				<div class="sum-value sum-purple">{fmt(grandTotal.departed)}</div>
			</div>
			<div class="sum-card">
				<div class="sum-label">
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>
					</svg>
					Měsíců v přehledu
				</div>
				<div class="sum-value">{months.length}</div>
			</div>
		</div>

		<!-- Měsíční kapsle -->
		<div class="months-grid">
			{#each months as b}
				{@const pct = Math.round((b.totalDays / maxDays) * 100)}
				{@const isCurrent = b.key === currentKey}
				<div class="month-card" class:current={isCurrent}>
					<div class="bar-fill" style="width: {pct}%"></div>
					<div class="month-content">
						<div class="month-period">
							<span class="period-label">{b.label}</span>
							{#if isCurrent}
								<span class="current-badge">Aktuální</span>
							{/if}
							{#if b.activeVehicles}
								<span class="active-badge">{b.activeVehicles} {vehicleWord(b.activeVehicles)}</span>
							{/if}
						</div>
						<div class="month-stats">
							<div class="stat stat-in">
								<svg class="stat-icon" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
									<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>
								</svg>
								<span class="stat-value">{b.arrived}</span>
								<span class="stat-label">naskladněno</span>
							</div>
							<div class="stat stat-out">
								<svg class="stat-icon" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
									<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>
								</svg>
								<span class="stat-value">{b.departed}</span>
								<span class="stat-label">vyskladněno</span>
							</div>
							<div class="stat stat-days">
								<svg class="stat-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<circle cx="12" cy="12" r="6"/><polyline points="12 10 12 12 13 13"/><path d="m16.13 7.66-.81-4.05a2 2 0 0 0-2-1.61h-2.68a2 2 0 0 0-2 1.61l-.78 4.05"/><path d="m7.88 16.36.8 4a2 2 0 0 0 2 1.64h2.72a2 2 0 0 0 2-1.61l.81-4.05"/>
								</svg>
								<span class="stat-value-big">{fmt(b.totalDays)}</span>
								<span class="stat-label">{dayWord(b.totalDays)} celkem</span>
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.data-wrap {
		padding: 16px 32px 32px;
	}

	/* ── Empty state (matches LogView) ── */
	.data-empty {
		text-align: center;
		padding: 80px 32px;
		color: var(--text-secondary);
		font-size: 14px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}
	.data-empty-icon {
		font-size: 28px;
		opacity: 0.4;
	}

	/* ── Summary cards (top row) ── */
	.summary {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 8px;
		margin-bottom: 16px;
	}
	.sum-card {
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 12px 14px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		transition: border-color 0.12s;
	}
	.sum-card:hover {
		border-color: var(--border-strong);
	}
	.sum-label {
		font-size: 11px;
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.sum-value {
		font-size: 22px;
		font-weight: 700;
		color: var(--text);
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
	}
	.sum-unit {
		font-size: 12px;
		font-weight: 500;
		color: var(--text-secondary);
		margin-left: 2px;
	}
	.sum-blue { color: #2563eb; }
	.sum-green { color: var(--green); }
	.sum-purple { color: var(--purple); }

	/* ── Monthly capsule grid — responsive on ultrawide ── */
	.months-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 6px;
	}
	@media (min-width: 1100px) {
		.months-grid { grid-template-columns: repeat(2, 1fr); }
	}
	@media (min-width: 1700px) {
		.months-grid { grid-template-columns: repeat(3, 1fr); }
	}
	@media (min-width: 2300px) {
		.months-grid { grid-template-columns: repeat(4, 1fr); }
	}

	.month-card {
		position: relative;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		overflow: hidden;
		transition: background 0.1s, border-color 0.12s;
	}
	.month-card:hover {
		background: var(--surface);
		border-color: var(--border-strong);
	}
	/* Current month — subtle accent left border + slight tinted bg */
	.month-card.current {
		border-color: var(--accent);
		background: var(--accent-bg);
	}
	.month-card.current:hover {
		background: var(--accent-bg);
		filter: brightness(0.985);
	}
	.bar-fill {
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		background: rgba(37, 99, 235, 0.06);
		z-index: 0;
		transition: width 0.4s ease;
	}
	.month-card.current .bar-fill {
		background: rgba(162, 26, 25, 0.06);
	}
	.month-content {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 12px 16px;
		flex-wrap: wrap;
	}
	.month-period {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}
	.period-label {
		font-size: 14px;
		font-weight: 600;
		color: var(--text);
		letter-spacing: -0.01em;
	}
	.current-badge {
		font-size: 10px;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 100px;
		background: var(--accent);
		color: #fff;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.active-badge {
		font-size: 10px;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 100px;
		background: var(--surface);
		border: 1px solid var(--border);
		color: var(--text-secondary);
		white-space: nowrap;
	}
	.month-card.current .active-badge {
		background: var(--bg);
	}

	.month-stats {
		display: flex;
		align-items: center;
		gap: 18px;
		flex-wrap: wrap;
	}
	.stat {
		display: flex;
		align-items: center;
		gap: 5px;
	}
	.stat-icon {
		flex-shrink: 0;
		color: var(--text-secondary);
		opacity: 0.85;
	}
	.stat-in .stat-icon { color: var(--green); opacity: 1; }
	.stat-out .stat-icon { color: var(--purple); opacity: 1; }
	.stat-days .stat-icon { color: #2563eb; opacity: 1; }
	.stat-value {
		font-size: 14px;
		font-weight: 700;
		color: var(--text);
		font-variant-numeric: tabular-nums;
	}
	.stat-value-big {
		font-size: 17px;
		font-weight: 700;
		color: #2563eb;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
	}
	.stat-label {
		font-size: 11px;
		color: var(--text-secondary);
		letter-spacing: 0.01em;
	}

	@media (max-width: 768px) {
		.data-wrap { padding-left: 16px; padding-right: 16px; }
		.month-content { padding: 12px; gap: 10px; }
		.month-stats { gap: 14px; width: 100%; }
		.month-period { width: 100%; justify-content: space-between; }
	}
</style>
