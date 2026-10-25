<script lang="ts">
	import { onMount } from 'svelte';
	import RumourCard from '#lib/components/team/RumourCard.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let now = $state(Date.now());
	onMount(() => {
		const timer = setInterval(() => (now = Date.now()), 30_000);
		return () => clearInterval(timer);
	});

	const checking = $derived(data.rumours.filter((r) => r.status === 'checking'));
	const answered = $derived(data.rumours.filter((r) => r.status !== 'checking'));
</script>

<svelte:head>
	<title>Qinga · Rumours</title>
</svelte:head>

<div class="page">
	<div>
		<h1>Rumours</h1>
		<p class="muted">People ask “Is this true?”. Check with Red Cross, then answer so the correction can be shared.</p>
	</div>

	<section class="stack" aria-labelledby="checking-title">
		<h2 id="checking-title">Still checking <span class="muted">({checking.length})</span></h2>
		{#each checking as r (r.id)}
			<RumourCard rumour={r} incidents={data.incidents} {now} />
		{:else}
			<p class="panel muted">Nothing waiting. New questions from the public appear here.</p>
		{/each}
	</section>

	{#if answered.length}
		<section class="stack" aria-labelledby="answered-title">
			<h2 id="answered-title">Answered <span class="muted">({answered.length})</span></h2>
			{#each answered as r (r.id)}
				<RumourCard rumour={r} incidents={data.incidents} {now} />
			{/each}
		</section>
	{/if}
</div>

<style>
	.page {
		max-width: 860px;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}
	h1 {
		font-size: 24px;
		font-weight: 800;
	}
	h1 + p {
		margin-top: 4px;
		font-size: 14px;
	}
	h2 {
		font-size: 16px;
		font-weight: 800;
	}
	h2 .muted {
		font-weight: 600;
	}
	.stack {
		gap: 12px;
	}
</style>
