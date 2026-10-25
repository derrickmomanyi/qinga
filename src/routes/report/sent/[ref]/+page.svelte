<script lang="ts">
	import TopBar from '#lib/components/public/TopBar.svelte';
	import CallButtons from '#lib/components/CallButtons.svelte';
	import { TYPES } from '#lib/constants.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const summary = $derived([TYPES[data.type].short, data.location, `Ref ${data.ref}`].filter(Boolean).join(' · '));
</script>

<svelte:head>
	<title>Report sent · Qinga</title>
</svelte:head>

<div class="phone">
	<TopBar close smart={false} />

	<main class="content">
		<div class="done">
			<span class="tick">
				<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
			</span>
			<h1 class="big-title">Report sent</h1>
			<span class="muted small-14">{summary}</span>
		</div>

		<section class="card urgent stack" aria-labelledby="help-title">
			<h2 id="help-title" class="h2">Need help right now?</h2>
			<CallButtons type={data.type} deaf />
			<p class="small muted">Calls are free. Don't wait for our alert.</p>
		</section>

		{#if data.type === 'fire'}
			<section class="card stack" aria-labelledby="wait-title">
				<h2 id="wait-title" class="h2">While you wait</h2>
				<ol class="steps">
					<li><span class="n">1</span><span><b>Get out.</b> Leave the building or area fast.</span></li>
					<li><span class="n">2</span><span><b>Stay low.</b> Crawl under smoke, where the air is cleaner.</span></li>
					<li><span class="n">3</span><span><b>Don't go back.</b> Leave your belongings behind.</span></li>
				</ol>
			</section>
		{:else if data.type === 'disaster'}
			<section class="card stack" aria-labelledby="wait-title">
				<h2 id="wait-title" class="h2">While you wait</h2>
				<ol class="steps">
					<li><span class="n">1</span><span><b>Move to higher ground.</b> Get away from rivers and low places.</span></li>
					<li><span class="n">2</span><span><b>Stay out of moving water.</b> Never walk or drive through it.</span></li>
				</ol>
			</section>
		{:else}
			<section class="card stack" aria-labelledby="wait-title">
				<h2 id="wait-title" class="h2">While you wait: SSS</h2>
				<ol class="steps">
					<li><span class="n">1</span><span><b>Safe.</b> Check for traffic, fire or fuel before you go close.</span></li>
					<li><span class="n">2</span><span><b>Stimulate.</b> Tap their shoulders and ask loudly, "Are you okay?"</span></li>
					<li><span class="n">3</span><span><b>Shout.</b> Shout for help and make sure someone has called 999.</span></li>
				</ol>
				<a class="more" href="/learn/first-aid">Read the full first aid guide</a>
			</section>
		{/if}

		<div class="card next">
			<b>What happens next</b><br />
			Our team is checking it with Red Cross.
			{#if data.withPhone}You'll get an SMS when it's confirmed.{:else}Verified alerts show on the home page.{/if}
		</div>

		<a class="btn btn-outline home" href="/">Back to home</a>
	</main>
</div>

<style>
	.content {
		gap: 22px;
		padding-top: 22px;
	}
	.done {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		text-align: center;
	}
	.tick {
		width: 56px;
		height: 56px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		background: var(--ink);
		color: #fff;
	}
	.small-14 {
		font-size: 14px;
	}
	.card {
		padding: 16px;
		border-radius: 16px;
	}
	.urgent {
		border: 2px solid var(--red);
	}
	.h2 {
		font-size: 18px;
		font-weight: 800;
	}
	.steps {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.steps li {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		font-size: 15px;
		line-height: 1.4;
	}
	.n {
		flex: 0 0 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		background: var(--ink);
		color: #fff;
		font-size: 15px;
		font-weight: 800;
	}
	.more {
		align-self: flex-start;
		display: flex;
		align-items: center;
		min-height: 44px;
		font-size: 15px;
		font-weight: 700;
		text-decoration: none;
	}
	.next {
		padding: 14px;
		border-radius: 12px;
		font-size: 15px;
		line-height: 1.45;
	}
	.home {
		margin-top: auto;
		min-height: 54px;
	}
</style>
