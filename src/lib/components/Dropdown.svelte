<script lang="ts">
	import { tick } from "svelte";
	import type { Snippet } from "svelte";

	interface Props {
		options: { val: string; label: string }[];
		current: string;
		badgeClass?: string;
		onselect: (val: string) => void;
		children: Snippet;
	}

	let { options, current, badgeClass = "", onselect, children }: Props = $props();
	let open = $state(false);
	let menuEl: HTMLDivElement | undefined = $state();

	function toggle(e: MouseEvent): void {
		e.stopPropagation();
		open = !open;
		if (open) {
			setTimeout(() => {
				document.addEventListener("click", handleOutsideClick);
			}, 0);
		} else {
			document.removeEventListener("click", handleOutsideClick);
		}
	}

	function select(val: string): void {
		open = false;
		document.removeEventListener("click", handleOutsideClick);
		if (val !== current) onselect(val);
	}

	function handleOutsideClick(e: MouseEvent): void {
		if (menuEl && !menuEl.contains(e.target as Node)) {
			open = false;
			document.removeEventListener("click", handleOutsideClick);
		}
	}
</script>

<span class="dropdown-anchor">
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<span
		class="badge {badgeClass}"
		onclick={toggle}
		onkeydown={(e) => { if (e.key === 'Enter') toggle(); }}
		role="button"
		tabindex="0"
	>
		{@render children()}
	</span>
	{#if open}
		<div class="dropdown-menu open" bind:this={menuEl}>
			{#each options as opt}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="dropdown-item"
					class:active={opt.val === current}
					onclick={() => select(opt.val)}
					onkeydown={(e) => { if (e.key === 'Enter') select(opt.val); }}
					role="button"
					tabindex="0"
				>
					{opt.label}
				</div>
			{/each}
		</div>
	{/if}
</span>
