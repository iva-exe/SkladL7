<script lang="ts">
	import { getVehicles, getChecked, setChecked } from "$lib/stores/vehicles.svelte";
	import { getSettings, updateSettings } from "$lib/stores/settings.svelte";
	import { visibleVehicles } from "$lib/utils/visible";

	const SELECT_TOP_COUNT = 150;

	const vehicles = $derived(getVehicles());
	const settings = $derived(getSettings());
	const checked = $derived(getChecked());

	const models = $derived([...new Set(vehicles.map((v) => v.model))].sort());
	const statTotal = $derived(vehicles.length);
	const statIn = $derived(vehicles.filter((v) => v.status === "naskladneno").length);
	const statOut = $derived(vehicles.filter((v) => v.status === "vyskladneno").length);
	const statChecked = $derived(checked.size);

	function onFilterStatus(e: Event): void {
		updateSettings({ filterStatus: (e.target as HTMLSelectElement).value });
	}
	function onFilterModel(e: Event): void {
		updateSettings({ filterModel: (e.target as HTMLSelectElement).value });
	}
	function onFilterSklad(e: Event): void {
		updateSettings({ filterSklad: (e.target as HTMLSelectElement).value });
	}
	function onSearchVin(e: Event): void {
		updateSettings({ searchVin: (e.target as HTMLInputElement).value.trim().toUpperCase() });
	}
	/** Select the first 150 rows as currently shown (filters + sort), replacing any selection. */
	function selectTop(): void {
		const top = visibleVehicles(vehicles, settings).slice(0, SELECT_TOP_COUNT);
		setChecked(new Set(top.map((v) => v.vin)));
	}
</script>

<div class="toolbar">
	<label>Stav:</label>
	<select value={settings.filterStatus} onchange={onFilterStatus}>
		<option value="all">Vše</option>
		<option value="naskladneno">Naskladněno</option>
		<option value="vyskladneno">Vyskladněno</option>
	</select>
	<label>Model:</label>
	<select value={settings.filterModel} onchange={onFilterModel}>
		<option value="all">Vše</option>
		{#each models as m}
			<option value={m}>{m}</option>
		{/each}
	</select>
	<label>Sklad:</label>
	<select value={settings.filterSklad} onchange={onFilterSklad}>
		<option value="all">Vše</option>
		<option value="Měšice">Měšice</option>
		<option value="Klíčany">Klíčany</option>
	</select>
	<label>Hledat VIN:</label>
	<input type="text" value={settings.searchVin} oninput={onSearchVin} placeholder="VIN…" style="width: 160px" />
	<button class="btn btn-small" onclick={selectTop} title="Označí prvních {SELECT_TOP_COUNT} řádků seznamu shora">
		<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>
		</svg>
		Označit {SELECT_TOP_COUNT}
	</button>
	<div class="stats">
		{#if statChecked > 0}
			<div class="stat-checked">Zvoleno: <span>{statChecked}</span></div>
		{/if}
		<div>Celkem: <span>{statTotal}</span></div>
		<div style="color: var(--green)">Naskladněno: <span>{statIn}</span></div>
		<div style="color: var(--purple)">Vyskladněno: <span>{statOut}</span></div>
	</div>
</div>

<style>
	.toolbar {
		padding: 12px 32px;
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
		border-bottom: 1px solid var(--border);
		background: var(--surface);
	}
	.toolbar label {
		font-size: 12px;
		font-weight: 500;
		color: var(--text-secondary);
	}
	.toolbar select,
	.toolbar input[type="text"] {
		font-family: inherit;
		font-size: 12px;
		padding: 5px 10px;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--bg);
		outline: none;
	}
	.stats {
		margin-left: auto;
		font-size: 12px;
		color: var(--text-secondary);
		display: flex;
		gap: 16px;
	}
	.stats span {
		font-weight: 500;
	}
	.stat-checked {
		color: var(--accent);
		font-weight: 600;
		padding: 2px 10px;
		background: var(--accent-bg);
		border-radius: 100px;
	}
	.stat-checked span {
		font-weight: 700;
	}
</style>
