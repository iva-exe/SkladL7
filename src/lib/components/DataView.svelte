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

	function fmt(n: number): string {
		return n.toLocaleString("cs-CZ");
	}

	function dayWord(n: number): string {
		if (n === 1) return "den";
		if (n >= 2 && n <= 4) return "dny";
		return "dní";
	}
</script>

<div class="data-wrap">
	{#if !months.length}
		<div class="empty">
			<span class="empty-icon">○</span>
			Zatím žádná data k zobrazení.
		</div>
	{:else}
		<!-- Souhrnná řádka -->
		<div class="summary">
			<div class="sum-card">
				<div class="sum-label">Celkem dní na skladě</div>
				<div class="sum-value sum-blue">{fmt(grandTotal.days)} <span class="sum-unit">{dayWord(grandTotal.days)}</span></div>
			</div>
			<div class="sum-card">
				<div class="sum-label">Celkem naskladněno</div>
				<div class="sum-value sum-green">{fmt(grandTotal.arrived)}</div>
			</div>
			<div class="sum-card">
				<div class="sum-label">Celkem vyskladněno</div>
				<div class="sum-value sum-purple">{fmt(grandTotal.departed)}</div>
			</div>
			<div class="sum-card">
				<div class="sum-label">Měsíců v přehledu</div>
				<div class="sum-value">{months.length}</div>
			</div>
		</div>

		<!-- Měsíční kapsle -->
		<div class="months-list">
			{#each months as b}
				{@const pct = Math.round((b.totalDays / maxDays) * 100)}
				<div class="month-card">
					<div class="bar-fill" style="width: {pct}%"></div>
					<div class="month-content">
						<div class="month-period">
							<span class="period-label">{b.label}</span>
							{#if b.activeVehicles}
								<span class="active-badge">{b.activeVehicles} {b.activeVehicles === 1 ? "vozidlo" : (b.activeVehicles < 5 ? "vozidla" : "vozidel")}</span>
							{/if}
						</div>
						<div class="month-stats">
							<div class="stat stat-in">
								<span class="stat-icon">↓</span>
								<span class="stat-value">{b.arrived}</span>
								<span class="stat-label">naskladněno</span>
							</div>
							<div class="stat stat-out">
								<span class="stat-icon">↑</span>
								<span class="stat-value">{b.departed}</span>
								<span class="stat-label">vyskladněno</span>
							</div>
							<div class="stat stat-days">
								<span class="stat-icon">⌚</span>
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
		padding: 20px 32px 40px;
		max-width: 1200px;
		margin: 0 auto;
	}

	/* ── Empty state ── */
	.empty {
		text-align: center;
		padding: 80px 32px;
		color: var(--text-secondary);
		font-size: 14px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}
	.empty-icon {
		font-size: 28px;
		opacity: 0.4;
	}

	/* ── Summary cards (top row) ── */
	.summary {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
		gap: 12px;
		margin-bottom: 24px;
	}
	.sum-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 16px 18px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.sum-label {
		font-size: 11px;
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.sum-value {
		font-size: 26px;
		font-weight: 700;
		color: var(--text);
		letter-spacing: -0.02em;
	}
	.sum-unit {
		font-size: 13px;
		font-weight: 500;
		color: var(--text-secondary);
		margin-left: 2px;
	}
	.sum-blue { color: #2563eb; }
	.sum-green { color: #16a34a; }
	.sum-purple { color: #8b06d8; }

	/* ── Monthly capsule cards ── */
	.months-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.month-card {
		position: relative;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 14px;
		overflow: hidden;
		transition: transform 0.12s, box-shadow 0.12s, border-color 0.12s;
	}
	.month-card:hover {
		transform: translateY(-1px);
		border-color: var(--accent);
		box-shadow: 0 4px 14px rgba(0,0,0,0.06);
	}
	.bar-fill {
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		background: linear-gradient(90deg, rgba(37, 99, 235, 0.10) 0%, rgba(37, 99, 235, 0.03) 100%);
		z-index: 0;
		transition: width 0.4s ease;
	}
	.month-content {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
		padding: 16px 22px;
		flex-wrap: wrap;
	}
	.month-period {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 180px;
	}
	.period-label {
		font-size: 16px;
		font-weight: 700;
		color: var(--text);
		letter-spacing: -0.01em;
	}
	.active-badge {
		font-size: 10px;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 999px;
		background: var(--surface);
		border: 1px solid var(--border);
		color: var(--text-secondary);
		white-space: nowrap;
	}

	.month-stats {
		display: flex;
		align-items: center;
		gap: 28px;
		flex-wrap: wrap;
	}
	.stat {
		display: flex;
		align-items: baseline;
		gap: 6px;
	}
	.stat-icon {
		font-size: 14px;
		font-weight: 700;
		color: var(--text-secondary);
		opacity: 0.7;
	}
	.stat-in .stat-icon { color: #16a34a; opacity: 1; }
	.stat-out .stat-icon { color: #8b06d8; opacity: 1; }
	.stat-days .stat-icon { color: #2563eb; opacity: 1; font-size: 16px; }
	.stat-value {
		font-size: 18px;
		font-weight: 700;
		color: var(--text);
		font-variant-numeric: tabular-nums;
	}
	.stat-value-big {
		font-size: 22px;
		font-weight: 800;
		color: #2563eb;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
	}
	.stat-label {
		font-size: 11px;
		color: var(--text-secondary);
		text-transform: lowercase;
		letter-spacing: 0.02em;
	}

	@media (max-width: 600px) {
		.data-wrap { padding: 16px; }
		.month-content { padding: 14px 16px; gap: 12px; }
		.month-stats { gap: 16px; width: 100%; }
		.month-period { min-width: 0; width: 100%; justify-content: space-between; }
	}
</style>
