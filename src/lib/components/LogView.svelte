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

	interface SubItem {
		marker: string;       // [+] [↻] [~] [-]
		color: string;
		bg: string;
		vin: string;
		text: string;
	}

	interface ParsedDetail {
		summaryHtml: string | null;   // colored summary (first line of import detail)
		plain: string | null;         // non-import, single-line detail
		subs: SubItem[];
	}

	function subMeta(marker: string): { color: string; bg: string } {
		if (marker === "[+]") return { color: "#16a34a", bg: "#f0fdf4" };  // new — green
		if (marker === "[↻]") return { color: "#0891b2", bg: "#ecfeff" };  // restocked — cyan
		if (marker === "[~]") return { color: "#ca8a04", bg: "#fefce8" };  // updated — yellow
		if (marker === "[-]") return { color: "#8b06d8", bg: "#f6eaff" };  // removed — purple
		return { color: "#6b7280", bg: "#f9fafb" };
	}

	function escapeHtml(s: string): string {
		return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
	}

	function colorSummary(line: string): string {
		let s = escapeHtml(line);
		// "+N nových" → green
		s = s.replace(/\+(\d+)\s+nových/g, '<span class="sum-green">+$1 nových</span>');
		// "N znovu" → cyan
		s = s.replace(/(^|\s)(\d+)\s+znovu/g, '$1<span class="sum-cyan">$2 znovu</span>');
		// "-N vyskladněno" → purple
		s = s.replace(/-(\d+)\s+vyskladněno/g, '<span class="sum-purple">-$1 vyskladněno</span>');
		// separators "|" — muted
		s = s.replace(/\s\|\s/g, ' <span class="sum-sep">·</span> ');
		return s;
	}

	function parseDetail(action: string, detail: string | null): ParsedDetail {
		if (!detail) return { summaryHtml: null, plain: null, subs: [] };
		const lines = detail.split("\n");
		const isImport = action.toLowerCase().includes("import");
		if (!isImport || lines.length === 1) {
			return { summaryHtml: null, plain: detail, subs: [] };
		}
		const [first, ...rest] = lines;
		const subs: SubItem[] = [];
		for (const raw of rest) {
			const line = raw.trim();
			if (!line) continue;
			const m = line.match(/^(\[[+↻~\-]\])\s+([A-Z0-9]+)\s*—\s*(.*)$/);
			if (m) {
				const meta = subMeta(m[1]);
				subs.push({ marker: m[1], color: meta.color, bg: meta.bg, vin: m[2], text: m[3] });
			} else {
				subs.push({ marker: "", color: "#6b7280", bg: "#f9fafb", vin: "", text: line });
			}
		}
		return { summaryHtml: colorSummary(first), plain: null, subs };
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
				{@const parsed = parseDetail(entry.action, entry.detail)}
				<div class="log-entry">
					<div class="log-icon" style="color: {meta.color}; background: {meta.bg}">
						{meta.icon}
					</div>
					<div class="log-main">
						<span class="log-action" style="color: {meta.color}">{entry.action}</span>
						{#if entry.vin}
							<span class="log-vin">{entry.vin}</span>
						{/if}
						{#if parsed.summaryHtml}
							<span class="log-summary">{@html parsed.summaryHtml}</span>
						{:else if parsed.plain}
							<span class="log-detail-inline">{parsed.plain}</span>
						{/if}
						<span class="log-spacer"></span>
						<span class="log-user">{entry.user_name || "?"}</span>
						<span class="log-time">{formatTime(entry.created_at)}</span>
					</div>
					{#if parsed.subs.length}
						<ul class="log-subs">
							{#each parsed.subs as sub}
								<li class="log-sub">
									{#if sub.marker}
										<span class="sub-marker" style="color: {sub.color}; background: {sub.bg}">{sub.marker}</span>
									{/if}
									{#if sub.vin}
										<span class="sub-vin">{sub.vin}</span>
									{/if}
									<span class="sub-text">{sub.text}</span>
								</li>
							{/each}
						</ul>
					{/if}
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
		display: grid;
		grid-template-columns: 32px 1fr;
		gap: 6px 14px;
		padding: 10px 16px;
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
	.log-main {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
		flex-wrap: wrap;
		min-height: 32px;
	}
	.log-action {
		font-size: 13px;
		font-weight: 600;
		white-space: nowrap;
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
	.log-detail-inline {
		font-size: 12px;
		color: var(--text-secondary);
		line-height: 1.4;
	}
	.log-summary {
		font-size: 12px;
		color: var(--text-secondary);
		line-height: 1.4;
	}
	.log-spacer {
		flex: 1;
	}
	.log-user {
		font-size: 12px;
		font-weight: 500;
		color: var(--text);
		white-space: nowrap;
	}
	.log-time {
		font-family: "DM Mono", monospace;
		font-size: 10px;
		color: var(--text-secondary);
		white-space: nowrap;
	}
	/* Colored tokens inside summary */
	.log-main :global(.sum-green) {
		color: var(--green, #16a34a);
		font-weight: 600;
	}
	.log-main :global(.sum-cyan) {
		color: #0891b2;
		font-weight: 600;
	}
	.log-main :global(.sum-purple) {
		color: var(--purple, #8b06d8);
		font-weight: 600;
	}
	.log-main :global(.sum-sep) {
		color: var(--text-secondary);
		opacity: 0.5;
		margin: 0 2px;
	}
	/* Sub-list below main row — spans content column, full width */
	.log-subs {
		grid-column: 2 / 3;
		list-style: none;
		margin: 2px 0 0;
		padding: 6px 10px;
		background: var(--surface);
		border-radius: 6px;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	.log-sub {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 11px;
		color: var(--text-secondary);
		line-height: 1.4;
	}
	.sub-marker {
		font-family: "DM Mono", monospace;
		font-size: 10px;
		font-weight: 700;
		padding: 1px 5px;
		border-radius: 4px;
		flex-shrink: 0;
	}
	.sub-vin {
		font-family: "DM Mono", monospace;
		font-size: 10px;
		color: var(--text);
		background: var(--bg);
		padding: 1px 5px;
		border-radius: 3px;
		border: 1px solid var(--border);
		flex-shrink: 0;
	}
	.sub-text {
		min-width: 0;
		word-break: break-word;
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
