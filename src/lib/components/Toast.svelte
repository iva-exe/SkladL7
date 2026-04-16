<script lang="ts">
	let message = $state("");
	let visible = $state(false);
	let timer: ReturnType<typeof setTimeout> | null = null;

	export function show(msg: string): void {
		message = msg;
		visible = true;
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => { visible = false; }, 4000);
	}
</script>

<div class="toast" class:show={visible}>{message}</div>

<style>
	.toast {
		position: fixed;
		bottom: 28px;
		right: 28px;
		background: var(--text);
		color: #fff;
		padding: 14px 28px;
		border-radius: var(--radius);
		font-size: 14px;
		font-weight: 500;
		z-index: 200;
		opacity: 0;
		transform: translateY(8px);
		transition: all 0.25s;
		pointer-events: none;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
	}
	.toast.show {
		opacity: 1;
		transform: translateY(0);
	}
</style>
