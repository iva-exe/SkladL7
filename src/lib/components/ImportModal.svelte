<script lang="ts">
	import { parseLines } from "$lib/utils/parser";
	import { todayStr, lastWorkdayStr } from "$lib/utils/dates";
	import { getVehicles, setVehicles, setVehicleMeta, saveData, pushLog, addImportChanged } from "$lib/stores/vehicles.svelte";
	import type { Vehicle } from "$lib/types";

	interface Props {
		open: boolean;
		onclose: () => void;
		ontoast: (msg: string) => void;
	}

	let { open = $bindable(), onclose, ontoast }: Props = $props();
	let importText = $state("");

	function processImport(): void {
		if (!importText.trim()) return;
		const incoming = parseLines(importText);
		if (!incoming.length) {
			ontoast("Nepodařilo se rozpoznat žádná vozidla.");
			return;
		}

		const vehicles = getVehicles();
		const inVins = new Set(incoming.map((v) => v.vin));
		const map: Record<string, Vehicle> = {};
		vehicles.forEach((v) => { map[v.vin] = v; });
		const lastWorkday = lastWorkdayStr();
		let added = 0, restocked = 0, removed = 0;

		for (const v of incoming) {
			if (!map[v.vin]) {
				const nv: Vehicle = {
					vin: v.vin,
					model: v.model,
					status: "naskladneno",
					dateIn: v.dateIn,
					dateOut: null,
					dateAdded: todayStr(),
					sklad: v.sklad,
					code: v.code,
					lastChangedBy: null,
					lastChangedAt: null,
				};
				setVehicleMeta(nv);
				vehicles.push(nv);
				addImportChanged(v.vin);
				added++;
			} else if (map[v.vin].status === "vyskladneno") {
				Object.assign(map[v.vin], {
					status: "naskladneno",
					dateIn: v.dateIn,
					dateOut: null,
					model: v.model,
					sklad: v.sklad,
					code: v.code,
				});
				setVehicleMeta(map[v.vin]);
				addImportChanged(v.vin);
				restocked++;
			} else {
				// Already naskladneno — update if changed
				const existing = map[v.vin];
				if (existing.model !== v.model || existing.sklad !== v.sklad || existing.code !== v.code || existing.dateIn !== v.dateIn) {
					Object.assign(existing, {
						model: v.model,
						sklad: v.sklad,
						code: v.code,
						dateIn: v.dateIn,
					});
					setVehicleMeta(existing);
					addImportChanged(v.vin);
				}
			}
		}

		for (const v of vehicles) {
			if (v.status === "naskladneno" && !inVins.has(v.vin)) {
				v.status = "vyskladneno";
				v.dateOut = lastWorkday;
				setVehicleMeta(v);
				addImportChanged(v.vin);
				removed++;
			}
		}

		setVehicles([...vehicles]);
		saveData();
		open = false;
		importText = "";
		pushLog("Import", null, `+${added} nových, ${restocked} znovu, -${removed} vyskladněno`);
		ontoast(`Import dokončen — ${incoming.length} vozidel zpracováno.`);
	}

	function handleOverlayClick(e: MouseEvent): void {
		if (e.target === e.currentTarget) { open = false; importText = ""; }
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-overlay active" onclick={handleOverlayClick}>
		<div class="modal">
			<div class="modal-header">
				<h2>Vložit seznam vozidel</h2>
				<button class="btn btn-small" onclick={() => { open = false; importText = ""; }}>&times;</button>
			</div>
			<div class="modal-body">
				<textarea bind:value={importText} placeholder="Vložte seznam vozidel…"></textarea>
			</div>
			<div class="modal-footer">
				<button class="btn" onclick={() => { open = false; importText = ""; }}>Zrušit</button>
				<button class="btn btn-primary" onclick={processImport}>Importovat</button>
			</div>
		</div>
	</div>
{/if}
