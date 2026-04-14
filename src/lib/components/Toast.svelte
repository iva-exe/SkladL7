<script lang="ts">
	let message = $state("");
	let visible = $state(false);
	let timer: ReturnType<typeof setTimeout> | null = null;

	export function show(msg: string): void {
		message = msg;
		visible = true;
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => { visible = false; }, 2500);
	}
</script>

<div class="toast" class:show={visible}>{message}</div>

<style>
	.toast {
		position: fixed;
		bottom: 24px;
		right: 24px;
		background: var(--text);
		color: #fff;
		padding: 10px 20px;
		border-radius: var(--radius);
		font-size: 13px;
		font-weight: 500;
		z-index: 200;
		opacity: 0;
		transform: translateY(8px);
		transition: all 0.2s;
		pointer-events: none;
	}
	.toast.show {
		opacity: 1;
		transform: translateY(0);
	}
</style>
