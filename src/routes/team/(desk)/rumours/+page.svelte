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

	<div class="board" class:single={!answered.length}>
		<section class="lane" aria-labelledby="checking-title">
			<h2 id="checking-title">Still checking <span class="muted">({checking.length})</span></h2>
			<div class="cards">
				{#each checking as r (r.id)}
					<RumourCard rumour={r} incidents={data.incidents} {now} />
				{:else}
					<p class="panel muted">Nothing waiting. New questions from the public appear here.</p>
				{/each}
			</div>
		</section>

		{#if answered.length}
			<section class="lane" aria-labelledby="answered-title">
				<h2 id="answered-title">Answered <span class="muted">({answered.length})</span></h2>
				<div class="cards">
					{#each answered as r (r.id)}
						<RumourCard rumour={r} incidents={data.incidents} {now} />
					{/each}
				</div>
			</section>
		{/if}
	</div>
</div>

<style>
	.page {
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
	/* Phone and tablet: one column. Desktop: "Still checking" and "Answered" side by side. */
	.board {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}
	.lane,
	.cards {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	@media (min-width: 1024px) {
		.board {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 24px;
			align-items: start;
		}
		/* Only one lane: let its cards fill the width in a grid. */
		.board.single {
			grid-template-columns: minmax(0, 1fr);
		}
		.board.single .cards {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
			align-items: start;
		}
		.lane {
			padding: 16px;
			border-radius: 16px;
			background: var(--line-soft);
		}
		.lane h2 {
			padding: 0 4px;
		}
	}
</style>
