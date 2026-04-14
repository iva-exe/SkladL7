<script lang="ts">
	import type { Vehicle, AppSettings } from "$lib/types";
	import { parseDateVal, calcDays } from "$lib/utils/dates";
	import { getVehicles, getChecked, toggleChecked } from "$lib/stores/vehicles.svelte";
	import { getSettings, updateSettings } from "$lib/stores/settings.svelte";
	import VehicleRow from "./VehicleRow.svelte";

	let renderKey = $state(0);
	function rerender(): void { renderKey++; }

	const settings = $derived(getSettings());
	const vehicles = $derived(getVehicles());
	const checked = $derived(getChecked());

	const filtered = $derived.by(() => {
		return vehicles.filter((v) => {
			if (settings.filterStatus !== "all" && v.status !== settings.filterStatus) return false;
			if (settings.filterModel !== "all" && v.model !== settings.filterModel) return false;
			if (settings.filterSklad !== "all" && v.sklad !== settings.filterSklad) return false;
			if (settings.searchVin && !v.vin.toUpperCase().includes(settings.searchVin.toUpperCase())) return false;
			return true;
		});
	});

	const sorted = $derived.by(() => {
		const col = settings.sortCol;
		const dir = settings.sortDir === "asc" ? 1 : -1;
		return [...filtered].sort((a, b) => {
			let va: any, vb: any;
			if (col === "dateIn") { va = parseDateVal(a.dateIn); vb = parseDateVal(b.dateIn); }
			else if (col === "dateOut") { va = parseDateVal(a.dateOut); vb = parseDateVal(b.dateOut); }
			else if (col === "days") { va = calcDays(a.dateIn, a.dateOut) ?? -1; vb = calcDays(b.dateIn, b.dateOut) ?? -1; }
			else if (col === "dateAdded") { va = parseDateVal(a.dateAdded); vb = parseDateVal(b.dateAdded); }
			else if (col === "status") { va = a.status; vb = b.status; }
			else if (col === "sklad") { va = a.sklad || ""; vb = b.sklad || ""; }
			else if (col === "model") { va = a.model; vb = b.model; }
			else { va = a.vin; vb = b.vin; }
			return va < vb ? -dir : va > vb ? dir : 0;
		});
	});

	function sortBy(col: string): void {
		if (settings.sortCol === col) {
			updateSettings({ sortDir: settings.sortDir === "asc" ? "desc" : "asc" });
		} else {
			updateSettings({ sortCol: col, sortDir: "asc" });
		}
	}

	function arrow(col: string): string {
		if (settings.sortCol !== col) return "";
		return settings.sortDir === "asc" ? "▲" : "▼";
	}

	function checkAll(e: Event): void {
		const target = e.target as HTMLInputElement;
		for (const v of sorted) {
			toggleChecked(v.vin, target.checked);
		}
	}

	// Drag-select state
	let dragActive = false;
	let dragValue = true;

	function onMouseDown(e: MouseEvent): void {
		const cell = (e.target as HTMLElement).closest(".cb-cell") as HTMLElement | null;
		if (!cell) return;
		const vin = cell.closest("tr")?.dataset.vin;
		if (!vin) return;
		e.preventDefault();
		dragValue = !checked.has(vin);
		dragActive = true;
		toggleChecked(vin, dragValue);
	}

	function onMouseOver(e: MouseEvent): void {
		if (!dragActive) return;
		const tr = (e.target as HTMLElement).closest("tr") as HTMLElement | null;
		if (!tr) return;
		const vin = tr.dataset.vin;
		if (!vin) return;
		if (checked.has(vin) !== dragValue) {
			toggleChecked(vin, dragValue);
		}
	}

	function onMouseUp(): void {
		dragActive = false;
	}
</script>

<svelte:window onmouseup={onMouseUp} />

<div class="table-wrap">
	{#if sorted.length === 0}
		<div class="empty-state">
			<p>Žádná vozidla. Klikněte na „Vložit seznam" pro import.</p>
		</div>
	{:else}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<table onmousedown={onMouseDown} onmouseover={onMouseOver}>
			<thead>
				<tr>
					<th style="cursor: default">
						<input type="checkbox" onchange={checkAll} style="pointer-events: auto" />
					</th>
					{#each [
						["vin", "VIN"],
						["model", "Model"],
						["sklad", "Sklad"],
						["status", "Stav"],
						["dateIn", "Naskladněno"],
						["dateOut", "Vyskladněno"],
						["days", "Dny"],
						["dateAdded", "Datum přidání"],
					] as [col, label]}
						<th
							data-col={col}
							class:sorted={settings.sortCol === col}
							onclick={() => sortBy(col)}
						>
							{label} <span class="arrow">{arrow(col)}</span>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each sorted as v (v.vin)}
					<VehicleRow vehicle={v} checked={checked.has(v.vin)} onchange={rerender} />
				{/each}
			</tbody>
		</table>
	{/if}
</div>

<style>
	.table-wrap {
		overflow-x: auto;
		padding: 0 32px 32px;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		margin-top: 8px;
		font-size: 13px;
	}
	th {
		text-align: left;
		padding: 10px 12px;
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
		border-bottom: 2px solid var(--border);
		cursor: pointer;
		user-select: none;
		white-space: nowrap;
	}
	th:hover {
		color: var(--accent);
	}
	th.sorted {
		color: var(--accent);
	}
	.arrow {
		font-size: 10px;
		margin-left: 4px;
	}
	.empty-state {
		text-align: center;
		padding: 80px 32px;
		color: var(--text-secondary);
	}
	.empty-state p {
		font-size: 14px;
		margin-top: 8px;
	}
	input[type="checkbox"] {
		width: 22px;
		height: 22px;
		accent-color: var(--accent);
		cursor: pointer;
	}
</style>
