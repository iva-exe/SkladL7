<script lang="ts">
	import { onMount } from "svelte";
	import { browser } from "$app/environment";
	import { getChecked, getVehicles, setVehicles, clearChecked, deleteFromCloud, pushLog, getSyncStatus, startSync, handleVisibilityChange, handleOnline, handleFocus, saveData } from "$lib/stores/vehicles.svelte";
	import { getUserName, getWorkspaceName, getWorkspaceCode, getSyncMode, setSbUrl, setSbKey, setWorkspaceCode, setWorkspaceName, clearConnection, setSyncMode } from "$lib/stores/settings.svelte";
	import VehicleTable from "$lib/components/VehicleTable.svelte";
	import Toolbar from "$lib/components/Toolbar.svelte";
	import ImportModal from "$lib/components/ImportModal.svelte";
	import SettingsModal from "$lib/components/SettingsModal.svelte";
	import LogView from "$lib/components/LogView.svelte";
	import Toast from "$lib/components/Toast.svelte";

	const CURRENT_VERSION = "1";

	let activeTab = $state<"seznam" | "log">("seznam");
	let importOpen = $state(false);
	let settingsOpen = $state(false);
	let toastRef: ReturnType<typeof Toast> | undefined = $state();

	const syncStatus = $derived(getSyncStatus());
	const checked = $derived(getChecked());

	function showToast(msg: string): void {
		toastRef?.show(msg);
	}

	function copyVin(): void {
		if (!checked.size) { showToast("Žádné vozidlo není zaškrtnuto."); return; }
		navigator.clipboard.writeText([...checked].join("\n"))
			.then(() => showToast(`${checked.size} VIN zkopírováno.`));
	}

	function deleteSelected(): void {
		if (!checked.size) { showToast("Žádné vozidlo není zaškrtnuto."); return; }
		if (!confirm(`Opravdu smazat ${checked.size} vozidel?`)) return;
		const vins = [...checked];
		deleteFromCloud(vins);
		pushLog("Smazání", null, `${vins.length} vozidel: ${vins.slice(0, 3).join(", ")}${vins.length > 3 ? "…" : ""}`);
		const vehicles = getVehicles();
		setVehicles(vehicles.filter((v) => !checked.has(v.vin)));
		clearChecked();
		saveData();
		showToast("Záznamy smazány.");
	}

	function switchTab(tab: "seznam" | "log"): void {
		activeTab = tab;
	}

	/** Re-validate workspace code on startup — refresh credentials from server */
	async function validateWorkspace(): Promise<void> {
		const code = getWorkspaceCode();
		if (!code || getSyncMode() !== "supabase") return;

		try {
			const res = await fetch(`/api/connect/${encodeURIComponent(code)}`);
			const data = await res.json();

			if (!res.ok) {
				console.warn("Workspace validation failed:", data.error);
				clearConnection();
				showToast("Workspace kód je neplatný. Přepnuto na lokální režim.");
				startSync();
				return;
			}

			// Refresh credentials (key may have rotated)
			setSbUrl(data.url);
			setSbKey(data.key);
			setWorkspaceName(data.name);
			console.log(`Workspace ověřen: ${data.name} (${data.code})`);
			startSync();
		} catch {
			// Network error — use cached credentials
			console.warn("Workspace validation offline, using cached credentials");
			startSync();
		}
	}

	onMount(() => {
		console.log(`%cSklad vozidel L7ATG v${CURRENT_VERSION}`, "font-weight:bold;color:#a21a19");
		console.log(`Režim: ${import.meta.env.SSR ? "—" : "client"} | Uživatel: ${getUserName() || "—"}`);

		// Validate workspace and start sync
		validateWorkspace();

		// Auto-open settings if no user name
		if (!getUserName()) {
			setTimeout(() => { settingsOpen = true; }, 300);
		}

		// Auto-update check
		async function checkForUpdate(): Promise<void> {
			try {
				const res = await fetch("./version.txt?_t=" + Date.now());
				if (!res.ok) return;
				const remote = (await res.text()).trim();
				console.log(`Kontrola verze: local=${CURRENT_VERSION} remote=${remote}`);
				if (remote && remote !== CURRENT_VERSION) {
					console.log("Nová verze detekována, reload…");
					showToast("Nová verze dostupná, aktualizuji…");
					setTimeout(() => location.reload(), 1500);
				}
			} catch {}
		}
		const interval = setInterval(checkForUpdate, 60000);

		// Reconnect handlers
		document.addEventListener("visibilitychange", handleVisibilityChange);
		window.addEventListener("online", handleOnline);
		window.addEventListener("focus", handleFocus);
		window.addEventListener("focus", checkForUpdate);

		return () => {
			clearInterval(interval);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("focus", handleFocus);
			window.removeEventListener("focus", checkForUpdate);
		};
	});
</script>

<div class="header">
	<h1>Sklad vozidel L7ATG</h1>
	<div class="header-actions">
		<div class="sync-status">
			<span class="sync-dot {syncStatus.state}"></span>
			<span>{syncStatus.label}</span>
			<button class="btn btn-small" style="margin-left: 4px; padding: 4px 6px" onclick={() => { settingsOpen = true; }}>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
					<circle cx="12" cy="12" r="3" />
				</svg>
			</button>
		</div>
		<button class="btn" onclick={copyVin}>Kopírovat VIN</button>
		<button class="btn" style="color: var(--accent)" onclick={deleteSelected}>Smazat</button>
		<button class="btn-primary btn" onclick={() => { importOpen = true; }}>Vložit seznam</button>
	</div>
</div>

<div class="tab-bar">
	<button class="tab-btn" class:active={activeTab === "seznam"} onclick={() => switchTab("seznam")}>Seznam</button>
	<button class="tab-btn" class:active={activeTab === "log"} onclick={() => switchTab("log")}>Log</button>
</div>

{#if activeTab === "seznam"}
	<Toolbar />
	<VehicleTable />
{:else}
	<LogView />
{/if}

<ImportModal bind:open={importOpen} onclose={() => { importOpen = false; }} ontoast={showToast} />
<SettingsModal bind:open={settingsOpen} onclose={() => { settingsOpen = false; }} ontoast={showToast} />
<Toast bind:this={toastRef} />

<style>
	.header {
		padding: 24px 32px;
		border-bottom: 1px solid var(--border);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}
	.header h1 {
		font-size: 20px;
		font-weight: 600;
		letter-spacing: -0.02em;
		color: var(--accent);
	}
	.header-actions {
		display: flex;
		gap: 10px;
		align-items: center;
	}
	.tab-bar {
		display: flex;
		gap: 0;
		border-bottom: 2px solid var(--border);
		padding: 0 32px;
	}
	.tab-btn {
		padding: 10px 20px;
		font-family: inherit;
		font-size: 13px;
		font-weight: 600;
		border: none;
		background: none;
		color: var(--text-secondary);
		cursor: pointer;
		border-bottom: 2px solid transparent;
		margin-bottom: -2px;
		transition: all 0.15s;
	}
	.tab-btn:hover {
		color: var(--text);
	}
	.tab-btn.active {
		color: var(--accent);
		border-bottom-color: var(--accent);
	}
</style>
