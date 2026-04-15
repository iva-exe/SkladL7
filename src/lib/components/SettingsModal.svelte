<script lang="ts">
	import {
		getUserName, setUserName,
		getSyncMode, setSyncMode as storeSyncMode,
		getSbUrl, setSbUrl, getSbKey, setSbKey,
		getWorkspaceCode, setWorkspaceCode, setWorkspaceName,
		clearConnection,
	} from "$lib/stores/settings.svelte";
	import { pushToCloud, startSync } from "$lib/stores/vehicles.svelte";
	import { isCloudActive } from "$lib/supabase";

	interface Props {
		open: boolean;
		onclose: () => void;
		ontoast: (msg: string) => void;
	}

	let { open = $bindable(), onclose, ontoast }: Props = $props();

	let name = $state(getUserName());
	let tempMode = $state(getSyncMode());
	let code = $state(getWorkspaceCode());
	let connecting = $state(false);
	let codeError = $state("");

	// Reset form values when modal opens
	$effect(() => {
		if (open) {
			name = getUserName();
			tempMode = getSyncMode();
			code = getWorkspaceCode();
			codeError = "";
			connecting = false;
		}
	});

	function setMode(mode: string): void {
		tempMode = mode;
		codeError = "";
	}

	async function save(): Promise<void> {
		if (!name.trim()) {
			ontoast("Vyplň své jméno.");
			return;
		}
		setUserName(name.trim());

		if (tempMode === "supabase") {
			const cleanCode = code.trim().toUpperCase();
			if (!cleanCode) {
				codeError = "Zadej kód workspace.";
				return;
			}

			// Always verify the code via API (even if same — ensures credentials are fresh)
			connecting = true;
			codeError = "";
			try {
				const res = await fetch(`/api/connect/${encodeURIComponent(cleanCode)}`);
				let data: Record<string, unknown>;
				try {
					data = await res.json();
				} catch {
					codeError = `Server vrátil neplatnou odpověď (HTTP ${res.status}).`;
					connecting = false;
					return;
				}

				if (!res.ok) {
					codeError = (data.error as string) || `Chyba serveru (HTTP ${res.status}).`;
					connecting = false;
					return;
				}

				if (!data.url || !data.key) {
					codeError = "Server vrátil neúplná data.";
					connecting = false;
					return;
				}

				setSbUrl(data.url as string);
				setSbKey(data.key as string);
				setWorkspaceCode(data.code as string);
				setWorkspaceName(data.name as string);
			} catch (err) {
				codeError = `Nepodařilo se připojit k serveru: ${err instanceof Error ? err.message : "neznámá chyba"}.`;
				connecting = false;
				return;
			}
			connecting = false;

			storeSyncMode("supabase");
			open = false;
			pushToCloud().then(() => startSync());
		} else {
			// Switch to local mode
			if (getSyncMode() === "supabase") {
				clearConnection();
			}
			storeSyncMode("local");
			open = false;
			startSync();
		}
	}

	function disconnect(): void {
		clearConnection();
		code = "";
		tempMode = "local";
		startSync();
		ontoast("Odpojeno od workspace.");
	}

	function handleOverlayClick(e: MouseEvent): void {
		if (e.target === e.currentTarget) { open = false; }
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-overlay active" onclick={handleOverlayClick}>
		<div class="modal" style="max-width: 460px">
			<div class="modal-header">
				<h2>Nastavení</h2>
				<button class="btn btn-small" onclick={() => { open = false; }}>&times;</button>
			</div>
			<div class="modal-body">
				<label class="settings-label">Vaše jméno <span style="color: var(--accent)">*</span></label>
				<input type="text" class="settings-input" bind:value={name} placeholder="Jan Novák" />

				<div style="display: flex; gap: 8px; margin: 16px 0 20px">
					<button class="btn sync-mode-btn" class:active={tempMode === "local"} onclick={() => setMode("local")}>
						Lokální úložiště
					</button>
					<button class="btn sync-mode-btn" class:active={tempMode === "supabase"} onclick={() => setMode("supabase")}>
						Online sync
					</button>
				</div>

				{#if tempMode === "supabase"}
					<label class="settings-label">Kód workspace</label>
					<input
						type="text"
						class="settings-input"
						bind:value={code}
						placeholder="např. IMPORTO2026"
						style="text-transform: uppercase; letter-spacing: 0.05em"
					/>
					{#if codeError}
						<div style="font-size: 12px; color: var(--accent); margin-top: -8px; margin-bottom: 12px">
							{codeError}
						</div>
					{/if}
					{#if getWorkspaceCode() && getSbUrl()}
						<div class="connected-info">
							<span class="connected-dot"></span>
							Připojeno: <strong>{getWorkspaceCode()}</strong>
							<button class="btn btn-small" style="margin-left: auto; color: var(--accent)" onclick={disconnect}>
								Odpojit
							</button>
						</div>
					{/if}
				{:else}
					<div style="font-size: 13px; color: var(--text-secondary)">
						Data se ukládají pouze v tomto prohlížeči.
					</div>
				{/if}
			</div>
			<div class="modal-footer">
				<button class="btn" onclick={() => { open = false; }}>Zrušit</button>
				<button class="btn btn-primary" onclick={save} disabled={connecting}>
					{connecting ? "Ověřuji…" : "Uložit"}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.connected-info {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		color: var(--text-secondary);
		padding: 8px 12px;
		background: var(--green-bg);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		margin-top: 4px;
	}
	.connected-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--green);
		flex-shrink: 0;
	}
</style>
