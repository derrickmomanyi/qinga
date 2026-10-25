<script lang="ts">
	// One chip style per status/label; colours live in app.css (.chip-*).
	let { status, label }: { status: string; label?: string } = $props();
	const text = $derived(label ?? status.replace(/_/g, ' '));
</script>

<span class="chip chip-{status}">{text}</span>
