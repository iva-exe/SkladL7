<script lang="ts">
	import { getVehicles } from "$lib/stores/vehicles.svelte";
	import { getSettings, updateSettings } from "$lib/stores/settings.svelte";

	const vehicles = $derived(getVehicles());
	const settings = $derived(getSettings());

	const models = $derived([...new Set(vehicles.map((v) => v.model))].sort());
	const statTotal = $derived(vehicles.length);
	const statIn = $derived(vehicles.filter((v) => v.status === "naskladneno").length);
	const statOut = $derived(vehicles.filter((v) => v.status === "vyskladneno").length);

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
	<div class="stats">
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
</style>
