<script lang="ts">
	import { toast } from './toast.svelte.ts';
</script>

<!-- The live region stays in the page so screen readers hear each new message. -->
<div role="status" aria-live="polite">
	{#if toast.message}
		<div class="toast">{toast.message}</div>
	{/if}
</div>
