<script lang="ts">
	import StatusChip from '../StatusChip.svelte';

	// VERIFIED / CLOSED, severity and EXTREME chips for a public incident.
	// On cards (`all = false`) severity is left out when the incident is already marked extreme.
	let {
		incident,
		all = false
	}: { incident: { status: string; severity: string | null; extreme: number | boolean }; all?: boolean } = $props();

	const severity = $derived(incident.severity && (all || !incident.extreme) ? incident.severity : null);
</script>

<div class="chips">
	{#if incident.status === 'closed'}
		<StatusChip status="closed" />
	{:else}
		<StatusChip status="verified" />
	{/if}
	{#if severity}
		<StatusChip status={severity.toLowerCase()} label={severity} />
	{/if}
	{#if incident.extreme}
		<StatusChip status="extreme" />
	{/if}
</div>

<style>
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
</style>
