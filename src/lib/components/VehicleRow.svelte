<script lang="ts">
	import type { Vehicle } from "$lib/types";
	import { calcDays, yesterdayStr, fromIsoDate } from "$lib/utils/dates";
	import { getLastImportChangedVins, setVehicleMeta, saveData, pushLog, addImportChanged } from "$lib/stores/vehicles.svelte";
	import { getUserName } from "$lib/stores/settings.svelte";
	import Dropdown from "./Dropdown.svelte";

	interface Props {
		vehicle: Vehicle;
		checked: boolean;
		onchange: () => void;
	}

	let { vehicle, checked, onchange }: Props = $props();

	let editingCode = $state(false);
	let codeValue = $state(vehicle.code || "");

	const days = $derived(calcDays(vehicle.dateIn, vehicle.dateOut));
	const isChanged = $derived(getLastImportChangedVins().has(vehicle.vin));
	const statusLabel = $derived(vehicle.status === "naskladneno" ? "Naskladněno" : "Vyskladněno");
	const statusBadge = $derived(vehicle.status === "naskladneno" ? "badge-green" : "badge-purple");
	const tip = $derived(vehicle.lastChangedBy ? `${vehicle.lastChangedBy}, ${vehicle.lastChangedAt || ""}` : "");

	const statusOptions = [
		{ val: "naskladneno", label: "Naskladněno" },
		{ val: "vyskladneno", label: "Vyskladněno" },
	];
	const skladOptions = [
		{ val: "Měšice", label: "Měšice" },
		{ val: "Klíčany", label: "Klíčany" },
	];

	function onStatusChange(val: string): void {
		const prev = vehicle.status;
		vehicle.status = val as Vehicle["status"];
		if (val === "vyskladneno") vehicle.dateOut = vehicle.dateOut || yesterdayStr();
		else vehicle.dateOut = null;
		setVehicleMeta(vehicle);
		addImportChanged(vehicle.vin);
		saveData();
		onchange();
		pushLog("Změna stavu", vehicle.vin, `${prev === "naskladneno" ? "Naskladněno" : "Vyskladněno"} → ${val === "naskladneno" ? "Naskladněno" : "Vyskladněno"}`);
	}

	function onSkladChange(val: string): void {
		const prev = vehicle.sklad;
		vehicle.sklad = val;
		// Manual sklad change clears the code
		vehicle.code = "";
		codeValue = "";
		setVehicleMeta(vehicle);
		addImportChanged(vehicle.vin);
		saveData();
		onchange();
		pushLog("Změna skladu", vehicle.vin, `${prev} → ${val}`);
	}

	function editDate(field: "dateIn" | "dateOut", el: HTMLSpanElement): void {
		let isoVal = "";
		const cur = vehicle[field] || "";
		if (cur) {
			const p = cur.split(".");
			if (p.length === 3) isoVal = `${p[2]}-${p[1]}-${p[0]}`;
		}
		const input = document.createElement("input");
		input.type = "date";
		input.value = isoVal;
		input.style.cssText = "position:absolute;left:0;top:100%;opacity:0;pointer-events:none;width:0;height:0;border:none;padding:0;";
		el.appendChild(input);
		requestAnimationFrame(() => {
			try { input.showPicker(); } catch {}
		});
		const cleanup = () => { if (input.parentNode) input.remove(); };
		input.addEventListener("change", () => {
			const prev = vehicle[field] || "—";
			if (input.value) {
				vehicle[field] = fromIsoDate(input.value);
			} else {
				vehicle[field] = null;
			}
			if (field === "dateOut") {
				vehicle.status = vehicle[field] ? "vyskladneno" : "naskladneno";
			}
			setVehicleMeta(vehicle);
			addImportChanged(vehicle.vin);
			saveData();
			cleanup();
			onchange();
			pushLog("Změna data", vehicle.vin, `${field === "dateIn" ? "naskladnění" : "vyskladnění"}: ${prev} → ${vehicle[field] || "—"}`);
		});
		input.addEventListener("blur", () => setTimeout(cleanup, 300));
	}

	function startEditCode(): void {
		editingCode = true;
		codeValue = vehicle.code || "";
	}

	function finishEditCode(): void {
		const val = codeValue.trim();
		const prev = vehicle.code || "";
		if (val !== prev) {
			vehicle.code = val;
			// Revalidate sklad based on first character of new code
			if (val) {
				const newSklad = val.startsWith("D") ? "Klíčany" : "Měšice";
				if (vehicle.sklad !== newSklad) {
					const prevSklad = vehicle.sklad;
					vehicle.sklad = newSklad;
					pushLog("Změna skladu", vehicle.vin, `${prevSklad} → ${newSklad} (auto z kódu)`);
				}
			}
			setVehicleMeta(vehicle);
			addImportChanged(vehicle.vin);
			saveData();
			pushLog("Změna kódu", vehicle.vin, `${prev || "—"} → ${val || "—"}`);
		}
		editingCode = false;
		onchange();
	}

	function handleCodeKeydown(e: KeyboardEvent): void {
		if (e.key === "Enter") { e.preventDefault(); finishEditCode(); }
		if (e.key === "Escape") { editingCode = false; }
	}
</script>

<tr class:checked-row={checked} class="has-tooltip" data-vin={vehicle.vin}>
	<td class="cb-cell">
		<input type="checkbox" checked={checked} data-vin={vehicle.vin} />
	</td>
	<td class="vin">
		{vehicle.vin}{#if isChanged}<span class="change-dot"></span>{/if}
		{#if tip}<span class="tooltip">{tip}</span>{/if}
	</td>
	<td>{vehicle.model}</td>
	<td>
		<Dropdown options={skladOptions} current={vehicle.sklad || ""} badgeClass="badge-sklad" onselect={onSkladChange}>
			{vehicle.sklad || "—"}
		</Dropdown>
		{#if editingCode}
			<input
				type="text"
				class="code-input"
				bind:value={codeValue}
				onblur={finishEditCode}
				onkeydown={handleCodeKeydown}
				placeholder="Zadejte kód"
			/>
		{:else}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<span class="editable-code" class:code-placeholder={!vehicle.code} onclick={startEditCode} onkeydown={(e) => { if (e.key === 'Enter') startEditCode(); }} role="button" tabindex="0">
				{vehicle.code || "Zadejte kód"}
			</span>
		{/if}
	</td>
	<td>
		<Dropdown options={statusOptions} current={vehicle.status} badgeClass={statusBadge} onselect={onStatusChange}>
			{statusLabel}
		</Dropdown>
	</td>
	<td>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<span class="editable-date" onclick={(e) => editDate("dateIn", e.currentTarget as HTMLSpanElement)} role="button" tabindex="0" onkeydown={(e) => { if (e.key === 'Enter') editDate('dateIn', e.currentTarget as HTMLSpanElement); }}>
			{vehicle.dateIn || "—"}
		</span>
	</td>
	<td>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<span class="editable-date" onclick={(e) => editDate("dateOut", e.currentTarget as HTMLSpanElement)} role="button" tabindex="0" onkeydown={(e) => { if (e.key === 'Enter') editDate('dateOut', e.currentTarget as HTMLSpanElement); }}>
			{vehicle.dateOut || "—"}
		</span>
	</td>
	<td>{days !== null ? days : "—"}</td>
	<td class="date-added">{vehicle.dateAdded || "—"}</td>
</tr>

<style>
	.vin {
		font-family: "DM Mono", monospace;
		font-size: 12px;
		letter-spacing: 0.02em;
	}
	.change-dot {
		display: inline-block;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--changed);
		margin-left: 4px;
		vertical-align: middle;
	}
	.editable-date {
		cursor: pointer;
		padding: 2px 4px;
		border-radius: 3px;
		transition: background 0.15s;
		position: relative;
		display: inline-block;
	}
	.editable-date:hover {
		background: var(--accent-bg);
	}
	.editable-code {
		font-family: "DM Mono", monospace;
		font-size: 11px;
		color: var(--text-secondary);
		cursor: pointer;
	}
	.editable-code.code-placeholder {
		color: var(--text-secondary);
		opacity: 0.5;
		font-style: italic;
	}
	.code-input {
		width: 80px;
		font-family: "DM Mono", monospace;
		font-size: 11px;
		padding: 1px 4px;
		border: 1px solid var(--accent);
		border-radius: 3px;
		outline: none;
	}
	.code-input::placeholder {
		color: var(--text-secondary);
		opacity: 0.5;
		font-style: italic;
	}
	.date-added {
		font-family: "DM Mono", monospace;
		font-size: 11px;
		color: var(--text-secondary);
	}
	td {
		padding: 10px 12px;
		border-bottom: 1px solid var(--border);
		white-space: nowrap;
	}
	tr:hover td {
		background: var(--surface);
	}
	tr.checked-row td {
		background: var(--accent-bg);
	}
	input[type="checkbox"] {
		width: 22px;
		height: 22px;
		accent-color: var(--accent);
		cursor: pointer;
		pointer-events: none;
	}
	.cb-cell {
		cursor: pointer;
		user-select: none;
		-webkit-user-select: none;
	}
	.has-tooltip {
		position: relative;
	}
	.tooltip {
		position: absolute;
		bottom: calc(100% + 6px);
		left: 50%;
		transform: translateX(-50%);
		background: var(--text);
		color: #fff;
		padding: 6px 12px;
		border-radius: var(--radius);
		font-size: 11px;
		white-space: nowrap;
		z-index: 50;
		pointer-events: none;
		opacity: 0;
		transition: opacity 0.25s ease;
		user-select: none;
		-webkit-user-select: none;
	}
	.has-tooltip:hover .tooltip {
		opacity: 1;
		transition-delay: 2s;
	}
	.has-tooltip:not(:hover) .tooltip {
		transition-delay: 0s;
	}
</style>
