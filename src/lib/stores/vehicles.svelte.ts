import { browser } from "$app/environment";
import type { Vehicle, VehicleRow } from "$lib/types";
import { toLocal, toRow } from "$lib/types";
import { isCloudActive, sbHeaders, getClient, resetClient, getChannel, setChannel } from "$lib/supabase";
import {
	getSyncMode, getSbUrl, getSbKey, getUserName, getWorkspaceName,
	getWorkspaceCode, clearConnection, setAuthExpired,
	setSbUrl, setSbKey, setWorkspaceName,
} from "$lib/stores/settings.svelte";
import { nowStr, todayStr } from "$lib/utils/dates";

const STORAGE_KEY = "sklad_vozidel_data";

// ── Local persistence (only for local mode) ──

function loadLocal(): Vehicle[] {
	if (!browser) return [];
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || [];
	} catch {
		return [];
	}
}

function saveLocal(): void {
	if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(_vehicles));
}

// ── State ──

let _vehicles = $state<Vehicle[]>(loadLocal());
let _checked = $state<Set<string>>(new Set());
let _syncState = $state<{ state: string; label: string }>({ state: "offline", label: "Offline" });
let _onAuthExpired: (() => void) | null = null;
let _authCheckInterval: ReturnType<typeof setInterval> | null = null;
let _midnightTimeout: ReturnType<typeof setTimeout> | null = null;

const AUTH_CHECK_INTERVAL_MS = 60_000; // Check every 60 seconds

// ── Getters ──

export function getVehicles(): Vehicle[] { return _vehicles; }
export function getChecked(): Set<string> { return _checked; }
export function getSyncStatus(): { state: string; label: string } { return _syncState; }

// ── Setters ──

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

// ── Changed fields (per-field change dots, shared via DB) ──

/** Mark specific fields as changed today on a vehicle */
export function markFieldChanged(v: Vehicle, ...fields: string[]): void {
	const today = todayStr();
	const existing = (v.changedDate === today && v.changedFields)
		? new Set(v.changedFields.split(","))
		: new Set<string>();
	for (const f of fields) existing.add(f);
	v.changedFields = [...existing].join(",");
	v.changedDate = today;
}

/** Check if a specific field was changed today */
export function isFieldChanged(v: Vehicle, field: string): boolean {
	if (!v.changedFields || !v.changedDate) return false;
	if (v.changedDate !== todayStr()) return false;
	return v.changedFields.split(",").includes(field);
}

/** Check if the whole row was marked changed today (e.g. newly imported) */
export function isWholeRowChanged(v: Vehicle): boolean {
	if (!v.changedFields || !v.changedDate) return false;
	if (v.changedDate !== todayStr()) return false;
	return v.changedFields.split(",").includes("__all__");
}

/** Clear all change dots that are from a previous day (midnight reset) */
function clearExpiredChangeDots(): void {
	const today = todayStr();
	let changed = false;
	for (const v of _vehicles) {
		if (v.changedDate && v.changedDate !== today) {
			v.changedFields = null;
			v.changedDate = null;
			changed = true;
		}
	}
	if (changed) saveData();
}

/** Schedule midnight reset of change dots */
function scheduleMidnightReset(): void {
	if (_midnightTimeout) clearTimeout(_midnightTimeout);
	if (!browser) return;

	const now = new Date();
	const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
	const ms = midnight.getTime() - now.getTime();

	_midnightTimeout = setTimeout(() => {
		console.log("Midnight: clearing change dots");
		clearExpiredChangeDots();
		// Schedule next midnight
		scheduleMidnightReset();
	}, ms);
}

// ── Auth expired callback ──

export function setOnAuthExpired(cb: () => void): void { _onAuthExpired = cb; }

// ── Helpers ──

function syncLabel(label: string): string {
	const ws = getWorkspaceName();
	return ws ? `${label} — ${ws}` : label;
}

function setSyncState(state: string, label: string): void {
	console.log(`Sync: ${state} — ${label}`);
	_syncState = { state, label };
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

// ── Auth validation ──

/** Validate workspace code against server. Returns true if valid. */
async function validateWorkspaceCode(): Promise<boolean> {
	const code = getWorkspaceCode();
	if (!code) return false;

	try {
		const res = await fetch(`/api/connect/${encodeURIComponent(code)}`);
		if (!res.ok) return false;

		const data = await res.json();
		// Refresh credentials in memory
		setSbUrl(data.url);
		setSbKey(data.key);
		setWorkspaceName(data.name);
		return true;
	} catch {
		// Network error — can't determine validity, assume still valid
		return true;
	}
}

/** Disconnect from workspace due to expired/revoked key */
function triggerAuthExpired(): void {
	console.warn("Auth expired — disconnecting from workspace");

	// Stop periodic auth checks
	stopAuthCheck();

	// Stop realtime channel
	const ch = getChannel();
	if (ch) {
		try {
			const url = getSbUrl();
			const key = getSbKey();
			if (url && key) {
				getClient(url, key).removeChannel(ch);
			}
		} catch { /* ignore cleanup errors */ }
		setChannel(null);
	}

	// Clear connection, mark expired
	clearConnection();
	setAuthExpired(true);

	// Switch to local data
	_vehicles = loadLocal();
	setSyncState("offline", "Lokální režim");

	// Notify page component to open settings modal
	_onAuthExpired?.();
}

/** Check if a cloud HTTP error indicates expired auth */
async function handleCloudError(context: string, status: number): Promise<void> {
	if (status === 401 || status === 403) {
		console.warn(`Cloud ${context}: HTTP ${status}, validating workspace code…`);
		const valid = await validateWorkspaceCode();
		if (!valid) {
			triggerAuthExpired();
		}
	}
}

// ── Periodic auth check ──

function startAuthCheck(): void {
	stopAuthCheck();
	if (!cloudActive()) return;

	_authCheckInterval = setInterval(async () => {
		if (!cloudActive()) {
			stopAuthCheck();
			return;
		}
		console.log("Periodic auth check…");
		const valid = await validateWorkspaceCode();
		if (!valid) {
			triggerAuthExpired();
		}
	}, AUTH_CHECK_INTERVAL_MS);
}

function stopAuthCheck(): void {
	if (_authCheckInterval) {
		clearInterval(_authCheckInterval);
		_authCheckInterval = null;
	}
}

// ── Cloud operations ──

export async function pushLog(action: string, vin: string | null, detail: string | null): Promise<void> {
	if (!cloudActive() || !getUserName()) return;
	try {
		const res = await fetch(getSbUrl() + "/rest/v1/logs", {
			method: "POST",
			headers: headers(),
			body: JSON.stringify({
				user_name: getUserName(),
				vin: vin || null,
				action,
				detail: detail || null,
			}),
		});
		if (res.status === 401 || res.status === 403) {
			await handleCloudError("pushLog", res.status);
		}
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
		if (!res.ok) {
			if (res.status === 401 || res.status === 403) {
				await handleCloudError("push", res.status);
				return;
			}
			throw new Error("HTTP " + res.status);
		}
		setSyncState("ok", syncLabel("Synchronizováno"));
	} catch (err) {
		console.warn("Push failed:", err);
		if (cloudActive()) setSyncState("error", "Chyba sync");
	}
}

export async function pullFromCloud(): Promise<void> {
	if (!cloudActive()) return;
	setSyncState("syncing", "Stahování…");
	try {
		const res = await fetch(getSbUrl() + "/rest/v1/vehicles?select=*", { headers: headers() });
		if (!res.ok) {
			if (res.status === 401 || res.status === 403) {
				await handleCloudError("pull", res.status);
				return;
			}
			throw new Error("HTTP " + res.status);
		}
		const rows: VehicleRow[] = await res.json();
		if (!Array.isArray(rows)) throw new Error("Invalid data");
		// Online mode: replace vehicles entirely from cloud (no merge with local)
		_vehicles = rows.map(toLocal);
		setSyncState("ok", syncLabel("Synchronizováno"));
	} catch (err) {
		console.warn("Pull failed:", err);
		if (cloudActive()) setSyncState("error", "Chyba sync");
	}
}

export async function deleteFromCloud(vins: string[]): Promise<void> {
	if (!cloudActive() || !vins.length) return;
	try {
		for (const v of vins) {
			const res = await fetch(
				getSbUrl() + "/rest/v1/vehicles?vin=eq." + encodeURIComponent(v),
				{ method: "DELETE", headers: headers() },
			);
			if (res.status === 401 || res.status === 403) {
				await handleCloudError("delete", res.status);
				return;
			}
		}
	} catch (err) {
		console.warn("Delete failed:", err);
	}
}

// ── Save data — local mode: LS only; online mode: cloud only ──

export function saveData(): void {
	if (cloudActive()) {
		// Online mode — push to cloud, never touch localStorage
		pushToCloud();
	} else {
		// Local mode — save to localStorage only
		saveLocal();
	}
}

// ── Console commands ──

function registerConsoleCommands(): void {
	if (!browser) return;
	(window as any).users = async () => {
		if (!cloudActive()) {
			console.log("%cNejsi v online režimu.", "color: #e67e22");
			return;
		}
		try {
			const res = await fetch(
				getSbUrl() + "/rest/v1/presence?select=*",
				{ headers: headers() },
			);
			if (!res.ok) throw new Error("HTTP " + res.status);
			const rows: Array<{ user_name: string; last_seen: string }> = await res.json();
			if (!rows.length) {
				console.log("%cŽádní připojení uživatelé.", "color: #6b6b6b");
				return;
			}
			console.log(`%c${rows.length} připojený(ch) uživatel(ů):`, "font-weight:bold");
			for (const r of rows) {
				const ago = Math.floor((Date.now() - new Date(r.last_seen).getTime()) / 1000);
				const agoStr = ago < 60 ? `${ago}s` : ago < 3600 ? `${Math.floor(ago / 60)}m` : `${Math.floor(ago / 3600)}h`;
				console.log(`  • ${r.user_name}  (${agoStr} ago)`);
			}
		} catch (err) {
			console.warn("Chyba při načítání uživatelů:", err);
		}
	};
}

// ── Presence heartbeat ──

let _presenceInterval: ReturnType<typeof setInterval> | null = null;

async function sendPresence(): Promise<void> {
	if (!cloudActive() || !getUserName()) return;
	try {
		await fetch(getSbUrl() + "/rest/v1/presence", {
			method: "POST",
			headers: headers(),
			body: JSON.stringify({
				user_name: getUserName(),
				last_seen: new Date().toISOString(),
			}),
		});
	} catch { /* silent */ }
}

function startPresence(): void {
	stopPresence();
	if (!cloudActive()) return;
	sendPresence();
	_presenceInterval = setInterval(sendPresence, 30_000); // every 30s
}

function stopPresence(): void {
	if (_presenceInterval) {
		clearInterval(_presenceInterval);
		_presenceInterval = null;
	}
}

// ── Realtime ──

export function startSync(): void {
	// Clean up existing channel
	const ch = getChannel();
	if (ch) {
		try {
			const url = getSbUrl();
			const key = getSbKey();
			if (url && key) {
				getClient(url, key).removeChannel(ch);
			}
		} catch { /* ignore cleanup errors */ }
		setChannel(null);
	}

	if (!cloudActive()) {
		// Local mode — stop auth checks, load from localStorage
		stopAuthCheck();
		stopPresence();
		_vehicles = loadLocal();
		setSyncState("offline", getSyncMode() === "supabase" ? "Klikni ⚙" : "Lokální režim");
		return;
	}

	// Online mode — fresh client, load from cloud, start periodic auth check
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
				// Online mode — don't save to localStorage
				setSyncState("ok", syncLabel("Synchronizováno"));
			},
		)
		.subscribe(async (s: string) => {
			if (s === "SUBSCRIBED") {
				setSyncState("ok", syncLabel("Synchronizováno"));
			} else if (s === "CHANNEL_ERROR") {
				console.warn("Realtime channel error, validating auth…");
				const valid = await validateWorkspaceCode();
				if (!valid) {
					triggerAuthExpired();
				} else {
					setSyncState("error", "Chyba spojení");
				}
			}
		});

	setChannel(newChannel);

	// Start periodic auth validation & presence
	startAuthCheck();
	startPresence();
	scheduleMidnightReset();
	clearExpiredChangeDots();
}

/** One-off auth check (used on focus/visibility) */
async function checkAuthOnce(): Promise<void> {
	if (!cloudActive()) return;
	const valid = await validateWorkspaceCode();
	if (!valid) triggerAuthExpired();
}

export function handleVisibilityChange(): void {
	if (typeof document === "undefined") return;
	if (document.visibilityState === "visible" && cloudActive()) {
		console.log("Tab aktivní — auth check + pull + kontrola channelu");
		checkAuthOnce();
		pullFromCloud();
		sendPresence();
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
	if (!cloudActive()) return;
	checkAuthOnce();
	pullFromCloud();
	sendPresence();
}

// Init console commands
registerConsoleCommands();
