<script lang="ts">
	import type { ChartPoint } from "$lib/utils/monthlyStats";

	interface Props {
		data: ChartPoint[];
		title: string;
		subtitle?: string;
	}

	let { data, title, subtitle }: Props = $props();

	// SVG layout
	const W = 480;
	const H = 280;
	const PAD = { top: 16, right: 16, bottom: 36, left: 36 };
	const innerW = W - PAD.left - PAD.right;
	const innerH = H - PAD.top - PAD.bottom;

	const yMax = $derived(Math.max(1, ...data.map((p) => p.value)));
	// Round Y axis up to a nice number
	const yScale = $derived.by(() => {
		const m = yMax;
		if (m <= 5) return 5;
		if (m <= 10) return 10;
		if (m <= 20) return 20;
		if (m <= 50) return Math.ceil(m / 10) * 10;
		return Math.ceil(m / 50) * 50;
	});

	const stepX = $derived(data.length > 1 ? innerW / (data.length - 1) : 0);

	const points = $derived(data.map((p, i) => ({
		...p,
		x: PAD.left + (data.length === 1 ? innerW / 2 : i * stepX),
		y: PAD.top + innerH - (p.value / yScale) * innerH,
	})));

	const linePath = $derived(points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "));
	const areaPath = $derived.by(() => {
		if (!points.length) return "";
		const baseY = PAD.top + innerH;
		const first = points[0];
		const last = points[points.length - 1];
		return `M${first.x.toFixed(1)},${baseY} L${points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L")} L${last.x.toFixed(1)},${baseY} Z`;
	});

	// Y axis ticks
	const yTicks = $derived.by(() => {
		const ticks: number[] = [];
		const step = yScale / 4;
		for (let i = 0; i <= 4; i++) ticks.push(Math.round(i * step));
		return ticks;
	});

	// X axis labels — pick at most 6 evenly spaced
	const xLabels = $derived.by(() => {
		if (!points.length) return [];
		const max = 6;
		if (points.length <= max) return points.map((p, i) => ({ ...p, idx: i }));
		const step = (points.length - 1) / (max - 1);
		const idxs = Array.from({ length: max }, (_, i) => Math.round(i * step));
		return idxs.map((i) => ({ ...points[i], idx: i }));
	});

	// Hover state
	let hoverIdx = $state<number | null>(null);
	let svgEl = $state<SVGSVGElement | undefined>();

	function onMove(e: PointerEvent | MouseEvent): void {
		if (!svgEl || !points.length) return;
		const rect = svgEl.getBoundingClientRect();
		const xPx = ((e.clientX - rect.left) / rect.width) * W;
		// Find closest point by x
		let best = 0;
		let bestDist = Infinity;
		for (let i = 0; i < points.length; i++) {
			const d = Math.abs(points[i].x - xPx);
			if (d < bestDist) { bestDist = d; best = i; }
		}
		hoverIdx = best;
	}

	function onLeave(): void {
		hoverIdx = null;
	}

	const hoverPoint = $derived(hoverIdx !== null ? points[hoverIdx] : null);

	// Tooltip position — clamp inside chart
	const tipX = $derived(hoverPoint ? Math.max(8, Math.min(W - 100, hoverPoint.x - 50)) : 0);
	const tipY = $derived(hoverPoint ? Math.max(4, hoverPoint.y - 50) : 0);
</script>

<div class="chart-card">
	<div class="chart-header">
		<div class="chart-title">{title}</div>
		{#if subtitle}<div class="chart-subtitle">{subtitle}</div>{/if}
	</div>

	{#if !data.length}
		<div class="chart-empty">Žádná data</div>
	{:else}
		<div class="chart-svg-wrap">
			<svg
				bind:this={svgEl}
				viewBox="0 0 {W} {H}"
				preserveAspectRatio="none"
				role="img"
				aria-label={title}
				onpointermove={onMove}
				onpointerleave={onLeave}
			>
				<!-- Y gridlines + labels -->
				{#each yTicks as t}
					{@const y = PAD.top + innerH - (t / yScale) * innerH}
					<line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} class="gridline" />
					<text x={PAD.left - 6} y={y + 3} class="axis-label" text-anchor="end">{t}</text>
				{/each}

				<!-- Area + line -->
				<path d={areaPath} class="area" />
				<path d={linePath} class="line" />

				<!-- Data dots -->
				{#each points as p, i}
					<circle cx={p.x} cy={p.y} r={hoverIdx === i ? 4 : 2.5} class="dot" class:dot-active={hoverIdx === i} />
				{/each}

				<!-- X labels -->
				{#each xLabels as l}
					<text x={l.x} y={H - 12} class="axis-label" text-anchor="middle">{l.label}</text>
				{/each}

				<!-- Hover line -->
				{#if hoverPoint}
					<line x1={hoverPoint.x} y1={PAD.top} x2={hoverPoint.x} y2={PAD.top + innerH} class="hoverline" />
				{/if}
			</svg>

			{#if hoverPoint}
				<div class="tooltip" style="left: {(tipX / W) * 100}%; top: {(tipY / H) * 100}%;">
					<div class="tip-label">{hoverPoint.label}</div>
					<div class="tip-value">{hoverPoint.value} {hoverPoint.value === 1 ? "vozidlo" : (hoverPoint.value < 5 ? "vozidla" : "vozidel")}</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.chart-card {
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 14px 16px;
	}
	.chart-header {
		margin-bottom: 8px;
	}
	.chart-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--text);
	}
	.chart-subtitle {
		font-size: 11px;
		color: var(--text-secondary);
		margin-top: 2px;
	}
	.chart-empty {
		text-align: center;
		padding: 60px 16px;
		color: var(--text-secondary);
		font-size: 13px;
	}
	.chart-svg-wrap {
		position: relative;
		width: 100%;
	}
	svg {
		width: 100%;
		height: auto;
		display: block;
		touch-action: none;
		cursor: crosshair;
	}
	.gridline {
		stroke: var(--border);
		stroke-width: 1;
		stroke-dasharray: 2 3;
	}
	.axis-label {
		font-family: "DM Mono", monospace;
		font-size: 9px;
		fill: var(--text-secondary);
	}
	.area {
		fill: rgba(37, 99, 235, 0.10);
	}
	.line {
		fill: none;
		stroke: #2563eb;
		stroke-width: 1.6;
		stroke-linejoin: round;
		stroke-linecap: round;
	}
	.dot {
		fill: #2563eb;
		stroke: var(--bg);
		stroke-width: 1.5;
		transition: r 0.1s;
	}
	.dot-active {
		fill: var(--accent);
	}
	.hoverline {
		stroke: var(--text-secondary);
		stroke-width: 1;
		stroke-dasharray: 3 3;
		opacity: 0.5;
		pointer-events: none;
	}
	.tooltip {
		position: absolute;
		transform: translate(0, 0);
		background: var(--text);
		color: #fff;
		padding: 6px 10px;
		border-radius: 5px;
		font-size: 11px;
		pointer-events: none;
		white-space: nowrap;
		box-shadow: 0 4px 12px rgba(0,0,0,0.18);
		z-index: 5;
	}
	.tip-label {
		font-size: 10px;
		opacity: 0.7;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.tip-value {
		font-weight: 700;
		font-size: 12px;
		font-variant-numeric: tabular-nums;
	}
</style>
