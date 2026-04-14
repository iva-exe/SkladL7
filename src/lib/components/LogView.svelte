<script lang="ts">
	import { getSbUrl, getSbKey, getSyncMode } from "$lib/stores/settings.svelte";
	import { isCloudActive, sbHeaders } from "$lib/supabase";
	import type { LogEntry } from "$lib/types";

	let logs = $state<LogEntry[]>([]);
	let loading = $state(false);
	let errorMsg = $state("");

	export async function loadLogs(): Promise<void> {
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
			second: "2-digit",
		});
	}
</script>

<div class="log-wrap">
	{#if loading}
		<div class="log-empty">Načítání…</div>
	{:else if errorMsg && logs.length === 0}
		<div class="log-empty">{errorMsg}</div>
	{:else}
		{#each logs as entry}
			<div class="log-entry">
				<span class="log-time">{formatTime(entry.created_at)}</span>
				<span class="log-user">{entry.user_name || "?"}</span>
				<span class="log-action">
					{entry.action}
					{#if entry.vin}
						— <span class="log-vin">{entry.vin}</span>
					{/if}
					{#if entry.detail}
						— {entry.detail}
					{/if}
				</span>
			</div>
		{/each}
	{/if}
</div>

<style>
	.log-wrap {
		padding: 16px 32px 32px;
	}
	.log-entry {
		display: flex;
		gap: 12px;
		align-items: flex-start;
		padding: 10px 0;
		border-bottom: 1px solid var(--border);
		font-size: 13px;
	}
	.log-time {
		font-family: "DM Mono", monospace;
		font-size: 11px;
		color: var(--text-secondary);
		min-width: 130px;
		flex-shrink: 0;
	}
	.log-user {
		font-weight: 600;
		min-width: 80px;
		flex-shrink: 0;
	}
	.log-action {
		color: var(--text-secondary);
	}
	.log-vin {
		font-family: "DM Mono", monospace;
		font-size: 11px;
		color: var(--accent);
	}
	.log-empty {
		text-align: center;
		padding: 60px;
		color: var(--text-secondary);
		font-size: 14px;
	}
</style>
