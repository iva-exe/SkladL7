<script lang="ts">
	import { getUserName, setUserName, getSyncMode, setSyncMode as storeSyncMode, getSbUrl, setSbUrl, getSbKey, setSbKey } from "$lib/stores/settings.svelte";
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
	let url = $state(getSbUrl());
	let key = $state(getSbKey());

	// Reset form values when modal opens
	$effect(() => {
		if (open) {
			name = getUserName();
			tempMode = getSyncMode();
			url = getSbUrl();
			key = getSbKey();
		}
	});

	function setMode(mode: string): void {
		tempMode = mode;
	}

	function save(): void {
		if (!name.trim()) {
			ontoast("Vyplň své jméno.");
			return;
		}
		setUserName(name.trim());
		storeSyncMode(tempMode);

		if (tempMode === "supabase") {
			const cleanUrl = url.trim().replace(/\/+$/, "");
			const cleanKey = key.trim();
			if (!cleanUrl || !cleanKey) {
				ontoast("Vyplň URL i klíč.");
				return;
			}
			setSbUrl(cleanUrl);
			setSbKey(cleanKey);
		}

		open = false;
		if (tempMode === "supabase" && isCloudActive(tempMode, getSbUrl(), getSbKey())) {
			pushToCloud().then(() => startSync());
		} else {
			startSync();
		}
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
						Supabase sync
					</button>
				</div>

				{#if tempMode === "supabase"}
					<label class="settings-label">Project URL <span class="settings-hint">— Connect → Framework</span></label>
					<input type="text" class="settings-input" bind:value={url} placeholder="https://xxxxx.supabase.co" />
					<label class="settings-label">Publishable Key <span class="settings-hint">— Connect → Framework</span></label>
					<input type="text" class="settings-input" bind:value={key} placeholder="sb_publishable_…" />
				{:else}
					<div style="font-size: 13px; color: var(--text-secondary)">
						Data se ukládají pouze v tomto prohlížeči.
					</div>
				{/if}
			</div>
			<div class="modal-footer">
				<button class="btn" onclick={() => { open = false; }}>Zrušit</button>
				<button class="btn btn-primary" onclick={save}>Uložit</button>
			</div>
		</div>
	</div>
{/if}
