<script lang="ts">
	// Tracy's Qinga mark: ringed Q with a heart inside and an arrow tail, followed by "inga".
	let {
		size = 32,
		dark = false,
		full = false,
		wordmark = true
	}: { size?: number; dark?: boolean; full?: boolean; wordmark?: boolean } = $props();

	const red = $derived(dark ? '#EF4444' : '#B91C1C');
	const green = $derived(dark ? '#4ADE80' : '#15803D');
	const ring = $derived(dark ? '#FFFFFF' : '#14171C');
	const heart =
		'M56 76 C40 64 32 56 32 44 C32 36 38 30 45 30 C50 30 54 33 56 37 C58 33 62 30 67 30 C74 30 80 36 80 44 C80 56 72 64 56 76 Z';
</script>

<span class="logo" style:--size="{size}px" style:color={dark ? '#fff' : 'var(--ink)'}>
	<svg width={size} height={size} viewBox="0 0 112 112" aria-hidden="true">
		{#if full}
			<circle cx="56" cy="54" r="46" fill="none" stroke={ring} stroke-width="5" />
			<circle cx="56" cy="54" r="37" fill="none" stroke={red} stroke-width="5" />
			<path d={heart} transform="rotate(-38 56 54)" fill="none" stroke={green} stroke-width="5" stroke-linejoin="round" />
			<path d="M76 74 L96 94" fill="none" stroke={red} stroke-width="9" stroke-linecap="round" />
			<path d="M104 104 L86 101 L101 86 Z" fill={red} stroke={red} stroke-width="3" stroke-linejoin="round" />
		{:else}
			<circle cx="56" cy="54" r="40" fill="none" stroke={red} stroke-width="12" />
			<path d={heart} transform="rotate(-38 56 54)" fill={green} />
			<path d="M82 80 L102 100" fill="none" stroke={red} stroke-width="13" stroke-linecap="round" />
		{/if}
	</svg>
	{#if wordmark}
		<span class="word"><span class="sr-only">Q</span>inga</span>
	{:else}
		<span class="sr-only">Qinga</span>
	{/if}
</span>

<style>
	.logo {
		display: inline-flex;
		align-items: center;
	}
	.word {
		margin-left: calc(var(--size) * -0.2);
		font-family: 'Nunito', 'Public Sans', sans-serif;
		font-size: calc(var(--size) * 0.76);
		font-weight: 900;
		line-height: 1;
	}
</style>
