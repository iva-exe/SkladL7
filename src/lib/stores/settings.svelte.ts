import { browser } from "$app/environment";
import type { AppSettings } from "$lib/types";

const SETTINGS_KEY = "sklad_vozidel_settings";

function defaultSettings(): AppSettings {
	return {
		sortCol: "dateIn",
		sortDir: "desc",
		filterStatus: "all",
		filterModel: "all",
		filterSklad: "all",
		searchVin: "",
	};
}

function loadSettings(): AppSettings {
	if (!browser) return defaultSettings();
	try {
		return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null") || defaultSettings();
	} catch {
		return defaultSettings();
	}
}

let _settings = $state<AppSettings>(loadSettings());
let _syncMode = $state<string>(browser ? localStorage.getItem("sync_mode") || "local" : "local");
let _userName = $state<string>(browser ? localStorage.getItem("sb_user") || "" : "");
let _sbUrl = $state<string>(browser ? localStorage.getItem("sb_url") || "" : "");
let _sbKey = $state<string>(browser ? localStorage.getItem("sb_key") || "" : "");
let _workspaceCode = $state<string>(browser ? localStorage.getItem("workspace_code") || "" : "");
let _workspaceName = $state<string>(browser ? localStorage.getItem("workspace_name") || "" : "");

export function getSettings(): AppSettings { return _settings; }
export function setSettings(s: AppSettings): void {
	_settings = s;
	if (browser) localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}
export function updateSettings(partial: Partial<AppSettings>): void {
	_settings = { ..._settings, ...partial };
	if (browser) localStorage.setItem(SETTINGS_KEY, JSON.stringify(_settings));
}

export function getSyncMode(): string { return _syncMode; }
export function setSyncMode(mode: string): void {
	_syncMode = mode;
	if (browser) localStorage.setItem("sync_mode", mode);
}

export function getUserName(): string { return _userName; }
export function setUserName(name: string): void {
	_userName = name;
	if (browser) localStorage.setItem("sb_user", name);
}

export function getSbUrl(): string { return _sbUrl; }
export function setSbUrl(url: string): void {
	_sbUrl = url;
	if (browser) localStorage.setItem("sb_url", url);
}

export function getSbKey(): string { return _sbKey; }
export function setSbKey(key: string): void {
	_sbKey = key;
	if (browser) localStorage.setItem("sb_key", key);
}

export function getWorkspaceCode(): string { return _workspaceCode; }
export function setWorkspaceCode(code: string): void {
	_workspaceCode = code;
	if (browser) localStorage.setItem("workspace_code", code);
}

export function getWorkspaceName(): string { return _workspaceName; }
export function setWorkspaceName(name: string): void {
	_workspaceName = name;
	if (browser) localStorage.setItem("workspace_name", name);
}

/** Clear all connection data (disconnect) */
export function clearConnection(): void {
	_sbUrl = "";
	_sbKey = "";
	_workspaceCode = "";
	_workspaceName = "";
	_syncMode = "local";
	if (browser) {
		localStorage.removeItem("sb_url");
		localStorage.removeItem("sb_key");
		localStorage.removeItem("workspace_code");
		localStorage.removeItem("workspace_name");
		localStorage.setItem("sync_mode", "local");
	}
}
