<script lang="ts">
	import { onMount } from 'svelte';
	import { refreshAll } from '$app/navigation';

	// Re-runs the page's load functions whenever the server reports a change
	// (new report, verification, SMS delivery, forecast refresh...).
	let { entities }: { entities?: string[] } = $props();

	onMount(() => {
		let timer: ReturnType<typeof setTimeout> | undefined;
		const source = new EventSource('/api/stream');
		source.addEventListener('change', (e) => {
			const change = JSON.parse((e as MessageEvent).data) as { entity: string };
			if (entities && !entities.includes(change.entity)) return;
			clearTimeout(timer);
			timer = setTimeout(() => refreshAll(), 300);
		});
		return () => {
			clearTimeout(timer);
			source.close();
		};
	});
</script>
