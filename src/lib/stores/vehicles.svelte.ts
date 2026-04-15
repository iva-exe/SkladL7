import { browser } from "$app/environment";
import type { Vehicle, VehicleRow } from "$lib/types";
import { toLocal, toRow } from "$lib/types";
import { isCloudActive, sbHeaders, getClient, resetClient, getChannel, setChannel } from "$lib/supabase";
import { getSyncMode, getSbUrl, getSbKey, getUserName, getWorkspaceName } from "$lib/stores/settings.svelte";
import { nowStr } from "$lib/utils/dates";

const STORAGE_KEY = "sklad_vozidel_data";

function loadData(): Vehicle[] {
	if (!browser) return [];
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || [];
	} catch {
		return [];
	}
}

// State
let _vehicles = $state<Vehicle[]>(loadData());
let _checked = $state<Set<string>>(new Set());
let _lastImportChangedVins = $state<Set<string>>(new Set());
let _syncState = $state<{ state: string; label: string }>({ state: "offline", label: "Offline" });

// Getters
export function getVehicles(): Vehicle[] { return _vehicles; }
export function getChecked(): Set<string> { return _checked; }
export function getLastImportChangedVins(): Set<string> { return _lastImportChangedVins; }
export function getSyncStatus(): { state: string; label: string } { return _syncState; }

// Setters
export function setVehicles(v: Vehicle[]): void { _vehicles = v; }
export function setChecked(c: Set<string>): void { _checked = c; }
export function clearChecked(): void { _checked = new Set(); }
export function toggleChecked(vin: string, value?: boolean): void {
	const next = new Set(_checked);
	const shouldCheck = value !== undefined ? value : !next.has(vin);
	if (shouldCheck) next.add(vin);
	else next.delete(vin);
	_checked = next;
}
export function clearLastImportChanged(): void { _lastImportChangedVins = new Set(); }
export function addImportChanged(vin: string): void {
	const next = new Set(_lastImportChangedVins);
	next.add(vin);
	_lastImportChangedVins = next;
}

function syncLabel(label: string): string {
	const ws = getWorkspaceName();
	return ws ? `${label} — ${ws}` : label;
}

function setSyncState(state: string, label: string): void {
	console.log(`Sync: ${state} — ${label}`);
	_syncState = { state, label };
}

// Persistence
function saveLocal(): void {
	if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(_vehicles));
}

function cloudActive(): boolean {
	return isCloudActive(getSyncMode(), getSbUrl(), getSbKey());
}

function headers(): Record<string, string> {
	return sbHeaders(getSbKey());
}

export function setVehicleMeta(v: Vehicle): void {
	v.lastChangedBy = getUserName() || "—";
	v.lastChangedAt = nowStr();
}

// Cloud operations
export async function pushLog(action: string, vin: string | null, detail: string | null): Promise<void> {
	if (!cloudActive() || !getUserName()) return;
	try {
		await fetch(getSbUrl() + "/rest/v1/logs", {
			method: "POST",
			headers: headers(),
			body: JSON.stringify({
				user_name: getUserName(),
				vin: vin || null,
				action,
				detail: detail || null,
			}),
		});
	} catch (err) {
		console.warn("Log push failed:", err);
	}
}

export async function pushToCloud(): Promise<void> {
	if (!cloudActive()) return;
	setSyncState("syncing", "Ukládání…");
	try {
		const rows = _vehicles.map(toRow);
		const res = await fetch(getSbUrl() + "/rest/v1/vehicles", {
			method: "POST",
			headers: headers(),
			body: JSON.stringify(rows),
		});
		if (!res.ok) throw new Error("HTTP " + res.status);
		setSyncState("ok", syncLabel("Synchronizováno"));
	} catch (err) {
		console.warn("Push failed:", err);
		setSyncState("error", "Chyba sync");
	}
}

export async function pullFromCloud(): Promise<void> {
	if (!cloudActive()) return;
	setSyncState("syncing", "Stahování…");
	try {
		const res = await fetch(getSbUrl() + "/rest/v1/vehicles?select=*", { headers: headers() });
		if (!res.ok) throw new Error("HTTP " + res.status);
		const rows: VehicleRow[] = await res.json();
		if (!Array.isArray(rows)) throw new Error("Invalid data");
		if (rows.length > 0) {
			const cloud = rows.map(toLocal);
			const merged: Record<string, Vehicle> = {};
			_vehicles.forEach((v) => { merged[v.vin] = v; });
			cloud.forEach((v) => { merged[v.vin] = v; });
			_vehicles = Object.values(merged);
			saveLocal();
		}
		setSyncState("ok", syncLabel("Synchronizováno"));
	} catch (err) {
		console.warn("Pull failed:", err);
		setSyncState("error", "Chyba sync");
	}
}

export async function deleteFromCloud(vins: string[]): Promise<void> {
	if (!cloudActive() || !vins.length) return;
	try {
		for (const v of vins) {
			await fetch(
				getSbUrl() + "/rest/v1/vehicles?vin=eq." + encodeURIComponent(v),
				{ method: "DELETE", headers: headers() },
			);
		}
	} catch (err) {
		console.warn("Delete failed:", err);
	}
}

// Save data — persists locally and pushes to cloud
export function saveData(): void {
	saveLocal();
	if (cloudActive()) pushToCloud();
}

// Realtime
export function startSync(): void {
	const ch = getChannel();
	if (ch) {
		const url = getSbUrl();
		const key = getSbKey();
		if (url && key) {
			const c = getClient(url, key);
			c.removeChannel(ch);
		}
		setChannel(null);
	}

	if (!cloudActive()) {
		setSyncState("offline", getSyncMode() === "supabase" ? "Klikni \u2699" : "Lokální režim");
		return;
	}

	resetClient();
	const client = getClient(getSbUrl(), getSbKey());
	pullFromCloud();

	const newChannel = client
		.channel("vehicles-sync")
		.on(
			"postgres_changes",
			{ event: "*", schema: "public", table: "vehicles" },
			(payload: any) => {
				const eventVin = payload.new?.vin || payload.old?.vin || "";
				console.log(`Realtime: ${payload.eventType}`, eventVin);
				if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
					const u = toLocal(payload.new);
					const i = _vehicles.findIndex((v) => v.vin === u.vin);
					if (i >= 0) _vehicles[i] = u;
					else _vehicles = [..._vehicles, u];
				} else if (payload.eventType === "DELETE") {
					_vehicles = _vehicles.filter((v) => v.vin !== payload.old.vin);
				}
				saveLocal();
				setSyncState("ok", syncLabel("Synchronizováno"));
			},
		)
		.subscribe((s: string) => {
			if (s === "SUBSCRIBED") setSyncState("ok", syncLabel("Synchronizováno"));
			else if (s === "CHANNEL_ERROR") setSyncState("error", "Chyba spojení");
		});

	setChannel(newChannel);
}

export function handleVisibilityChange(): void {
	if (typeof document === "undefined") return;
	if (document.visibilityState === "visible" && cloudActive()) {
		console.log("Tab aktivní — pull + kontrola channelu");
		pullFromCloud();
		const ch = getChannel();
		if (!ch || (ch as any).state !== "joined") {
			console.log("Realtime channel mrtvý, reconnect…");
			startSync();
		}
	}
}

export function handleOnline(): void {
	if (cloudActive()) startSync();
}

export function handleFocus(): void {
	if (cloudActive()) pullFromCloud();
}
