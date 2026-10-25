<script lang="ts">
	import type { IncidentType } from '../constants.ts';

	let { type, size = 22, stroke = 2 }: { type: IncidentType | string; size?: number; stroke?: number } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={stroke}
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{#if type === 'fire'}
		<path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8.5z" />
	{:else if type === 'accident'}
		<path d="M3 17h18v-3l-2-5H5l-2 5z" />
		<circle cx="7.5" cy="17.5" r="1.5" />
		<circle cx="16.5" cy="17.5" r="1.5" />
	{:else if type === 'disaster'}
		<path d="M7 15a4 4 0 1 1 1-7.9A5 5 0 0 1 17.6 9 3.5 3.5 0 0 1 17 15z" />
		<path d="M8 18l-1 2" />
		<path d="M12 18l-1 2" />
		<path d="M16 18l-1 2" />
	{:else}
		<path d="M13 2L4 14h7l-1 8 9-12h-7z" />
	{/if}
</svg>
