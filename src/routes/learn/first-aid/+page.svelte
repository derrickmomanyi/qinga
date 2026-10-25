<script lang="ts">
	import TopBar from '#lib/components/public/TopBar.svelte';

	const STEPS = [
		{ name: 'Safe', text: "Look for danger first: traffic, fire, leaking fuel, broken glass. Don't become another casualty.", red: true },
		{ name: 'Stimulate', text: 'Tap their shoulders and ask loudly, "Are you okay?" See if they respond.', red: false },
		{ name: 'Shout', text: 'Shout for help. Make sure someone calls 999 or Red Cross 1199.', red: true }
	];
</script>

<svelte:head>
	<title>First aid · Qinga</title>
</svelte:head>

<div class="phone">
	<TopBar title="First aid" href="/learn" />

	<main class="content">
		<div class="intro">
			<h1 class="big-title">At an accident: SSS</h1>
			<p class="ink2">Three steps before help arrives.</p>
		</div>

		<ol class="steps">
			{#each STEPS as step, i (step.name)}
				<li class="card step">
					<span class="letter" class:red={step.red} aria-hidden="true">S</span>
					<span><b>{i + 1}. {step.name}</b><br />{step.text}</span>
				</li>
			{/each}
		</ol>

		<section class="then">
			<h2>Then</h2>
			<ul>
				<li>Stay with them and keep them warm.</li>
				<li>Don't move them unless they're in danger.</li>
				<li>Don't give food or drink.</li>
			</ul>
		</section>

		<div class="grid-2">
			<a class="btn btn-red" href="tel:999">Call 999</a>
			<a class="btn btn-outline" href="tel:1199">Red Cross 1199</a>
		</div>

		<p class="small muted center">Want to learn more? Kenya Red Cross runs first aid courses.</p>
	</main>
</div>

<style>
	.content {
		gap: 16px;
		padding-top: 20px;
	}
	.intro {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.ink2 {
		font-size: 15px;
		color: var(--ink-2);
	}
	.steps {
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.step {
		display: flex;
		gap: 14px;
		padding: 16px;
		font-size: 15px;
		line-height: 1.45;
	}
	.step b {
		font-size: 18px;
	}
	.letter {
		flex: 0 0 52px;
		height: 52px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 14px;
		background: var(--ink);
		color: #fff;
		font-size: 26px;
		font-weight: 800;
	}
	.letter.red {
		background: var(--red);
	}
	.then {
		padding: 16px;
		border-radius: 14px;
		background: var(--ink);
		color: #fff;
	}
	.then h2 {
		margin-bottom: 8px;
		font-size: 16px;
		font-weight: 800;
	}
	.then ul {
		margin: 0;
		padding-left: 20px;
		font-size: 15px;
		line-height: 1.6;
	}
	.grid-2 .btn {
		min-height: 56px;
	}
	.center {
		text-align: center;
	}
</style>
