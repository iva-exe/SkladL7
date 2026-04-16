<script lang="ts">
	import { onMount } from "svelte";
	import { getSbUrl, getSbKey, getSyncMode } from "$lib/stores/settings.svelte";
	import { isCloudActive, sbHeaders } from "$lib/supabase";
	import type { LogEntry } from "$lib/types";

	let logs = $state<LogEntry[]>([]);
	let loading = $state(false);
	let errorMsg = $state("");

	async function loadLogs(): Promise<void> {
		if (!isCloudActive(getSyncMode(), getSbUrl(), getSbKey())) {
			logs = [];
			errorMsg = "Synchronizace není aktivní.";
			return;
		}
		loading = true;
		errorMsg = "";
		try {
			const res = await fetch(
				getSbUrl() + "/rest/v1/logs?select=*&order=created_at.desc&limit=200",
				{ headers: sbHeaders(getSbKey()) },
			);
			if (!res.ok) throw new Error();
			const rows: LogEntry[] = await res.json();
			logs = rows;
			if (!rows.length) errorMsg = "Žádné záznamy.";
		} catch {
			logs = [];
			errorMsg = "Nelze načíst log.";
		} finally {
			loading = false;
		}
	}

	function formatTime(iso: string): string {
		return new Date(iso).toLocaleString("cs-CZ", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	}

	interface ActionMeta {
		icon: string;
		color: string;
		bg: string;
	}

	function actionMeta(action: string): ActionMeta {
		const a = action.toLowerCase();
		if (a.includes("import"))      return { icon: "↓", color: "#2563eb", bg: "#eff6ff" };
		if (a.includes("smazání"))     return { icon: "✕", color: "#dc2626", bg: "#fef2f2" };
		if (a.includes("stav"))        return { icon: "⟲", color: "#8b06d8", bg: "#f6eaff" };
		if (a.includes("sklad"))       return { icon: "⌂", color: "#0891b2", bg: "#ecfeff" };
		if (a.includes("kód"))         return { icon: "#", color: "#ca8a04", bg: "#fefce8" };
		if (a.includes("dat"))         return { icon: "◷", color: "#059669", bg: "#f0fdf4" };
		return                                { icon: "•", color: "#6b7280", bg: "#f9fafb" };
	}

	onMount(() => {
		loadLogs();
	});
</script>

<div class="log-wrap">
	{#if loading}
		<div class="log-empty">
			<span class="log-empty-icon">⟳</span>
			Načítání…
		</div>
	{:else if errorMsg && logs.length === 0}
		<div class="log-empty">
			<span class="log-empty-icon">○</span>
			{errorMsg}
		</div>
	{:else}
		<div class="log-list">
			{#each logs as entry}
				{@const meta = actionMeta(entry.action)}
				<div class="log-entry">
					<div class="log-icon" style="color: {meta.color}; background: {meta.bg}">
						{meta.icon}
					</div>
					<div class="log-content">
						<div class="log-top">
							<span class="log-action" style="color: {meta.color}">{entry.action}</span>
							{#if entry.vin}
								<span class="log-vin">{entry.vin}</span>
							{/if}
						</div>
						{#if entry.detail}
							<div class="log-detail">{entry.detail}</div>
						{/if}
					</div>
					<div class="log-meta">
						<span class="log-user">{entry.user_name || "?"}</span>
						<span class="log-time">{formatTime(entry.created_at)}</span>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.log-wrap {
		padding: 16px 32px 32px;
	}
	.log-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.log-entry {
		display: flex;
		align-items: flex-start;
		gap: 14px;
		padding: 12px 16px;
		border-radius: var(--radius);
		transition: background 0.1s;
	}
	.log-entry:hover {
		background: var(--surface);
	}
	.log-icon {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 15px;
		font-weight: 600;
		flex-shrink: 0;
		margin-top: 1px;
	}
	.log-content {
		flex: 1;
		min-width: 0;
	}
	.log-top {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.log-action {
		font-size: 13px;
		font-weight: 600;
	}
	.log-vin {
		font-family: "DM Mono", monospace;
		font-size: 11px;
		color: var(--text-secondary);
		background: var(--surface);
		padding: 1px 6px;
		border-radius: 4px;
		border: 1px solid var(--border);
	}
	.log-detail {
		font-size: 12px;
		color: var(--text-secondary);
		margin-top: 2px;
		line-height: 1.4;
	}
	.log-meta {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 2px;
		flex-shrink: 0;
		min-width: 110px;
	}
	.log-user {
		font-size: 12px;
		font-weight: 500;
		color: var(--text);
	}
	.log-time {
		font-family: "DM Mono", monospace;
		font-size: 10px;
		color: var(--text-secondary);
	}
	.log-empty {
		text-align: center;
		padding: 80px 32px;
		color: var(--text-secondary);
		font-size: 14px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}
	.log-empty-icon {
		font-size: 28px;
		opacity: 0.4;
	}
</style>
