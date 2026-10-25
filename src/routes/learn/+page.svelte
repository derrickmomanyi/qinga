<script lang="ts">
	import TopBar from '#lib/components/public/TopBar.svelte';
	import { TYPES } from '#lib/constants.ts';

	type Tip = { title: string; short: string; more: string[]; paths: string[]; tint: string; ink: string };

	const blue = { tint: TYPES.disaster.tint, ink: TYPES.disaster.ink };
	const TIPS: Tip[] = [
		{
			title: 'Fire',
			short: 'Get out fast, stay low under smoke, then call the fire brigade.',
			more: ["Feel a door before you open it. If it's hot, use another way out.", "Don't go back for belongings.", 'Fire brigade: 020 222 2181 or 999.'],
			paths: ['M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8.5z'],
			tint: TYPES.fire.tint,
			ink: TYPES.fire.ink
		},
		{
			title: 'Floods',
			short: 'Move to higher ground. Never walk or drive through moving water.',
			more: ['Ankle-deep moving water can knock you down.', 'Switch off power at the mains if water comes in.', 'Keep children away from rivers and drains.'],
			paths: ['M2 10c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2', 'M2 16c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2'],
			...blue
		},
		{
			title: 'Landslides',
			short: 'When heavy rain is forecast, keep away from steep slopes and riverbanks.',
			more: ['Watch for new cracks in the ground, leaning trees or muddy water.', 'If you hear rumbling, move away from the slope fast.'],
			paths: ['M3 20l6-9 4 5 3-4 5 8z'],
			...blue
		},
		{
			title: 'Storms and lightning',
			short: 'Go indoors. Stay away from open fields and tall trees.',
			more: ['Stay out of water and away from metal fences.', 'Wait 30 minutes after the last thunder before going out.'],
			paths: ['M13 2L4 14h7l-1 8 9-12h-7z'],
			...blue
		}
	];

	function saveAll() {
		document.querySelectorAll<HTMLDetailsElement>('details.tip').forEach((d) => (d.open = true));
		window.print();
	}

	// Desktop shows every tip in full, so the cards don't fold.
	let wide = $state(false);
	$effect(() => {
		const mq = window.matchMedia('(min-width: 1024px)');
		const sync = () => {
			wide = mq.matches;
			if (wide) document.querySelectorAll<HTMLDetailsElement>('details.tip').forEach((d) => (d.open = true));
		};
		sync();
		mq.addEventListener('change', sync);
		return () => mq.removeEventListener('change', sync);
	});
</script>

<svelte:head>
	<title>Safety tips · Qinga</title>
</svelte:head>

<div class="phone">
	<TopBar title="Safety tips" />

	<main class="content">
		<div class="intro">
			<h1 class="big-title">Be ready</h1>
			<p class="ink2 lead-text">Short tips you can read without data.</p>
		</div>

		<div class="tiles">
			<a class="card tip-row first-aid" href="/learn/first-aid">
				<span class="tile" style:background={TYPES.accident.tint} style:color={TYPES.accident.ink}>
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 17h18v-3l-2-5H5l-2 5z" /><circle cx="7.5" cy="17.5" r="1.5" /><circle cx="16.5" cy="17.5" r="1.5" /></svg>
				</span>
				<span class="text"><b>Accident first aid</b><br />Safe, Stimulate, Shout.</span>
				<span class="sss" aria-hidden="true">
					<span class="s red"><i>S</i>Safe</span>
					<span class="s"><i>S</i>Stimulate</span>
					<span class="s red"><i>S</i>Shout</span>
				</span>
				<svg class="chev" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
			</a>

			{#each TIPS as tip (tip.title)}
				<details class="card tip">
					<summary class="tip-row" onclick={(e) => wide && e.preventDefault()}>
						<span class="tile" style:background={tip.tint} style:color={tip.ink}>
							<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{#each tip.paths as d (d)}<path {d} />{/each}</svg>
						</span>
						<span class="text"><b>{tip.title}</b><br />{tip.short}</span>
						<svg class="chev" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
					</summary>
					<ul>
						{#each tip.more as line (line)}<li>{line}</li>{/each}
					</ul>
				</details>
			{/each}
		</div>

		<button type="button" class="btn btn-outline save" onclick={saveAll}>Save all tips</button>
	</main>
</div>

<style>
	.content {
		gap: 12px;
		padding-top: 20px;
	}
	.intro {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-bottom: 4px;
	}
	.ink2 {
		font-size: 15px;
		color: var(--ink-2);
	}
	.tip-row {
		display: flex;
		align-items: center;
		gap: 12px;
		color: var(--ink);
		text-decoration: none;
	}
	summary.tip-row {
		list-style: none;
		cursor: pointer;
	}
	summary.tip-row::-webkit-details-marker {
		display: none;
	}
	.tile {
		flex: 0 0 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 12px;
	}
	.text {
		flex: 1;
		font-size: 14px;
		line-height: 1.4;
		color: var(--ink-2);
	}
	.text b {
		font-size: 16px;
		color: var(--ink);
	}
	.chev {
		flex: 0 0 auto;
		transition: transform 0.15s;
	}
	details[open] .chev {
		transform: rotate(90deg);
	}
	.tip ul {
		margin: 12px 0 0 56px;
		padding-left: 18px;
		font-size: 15px;
		line-height: 1.55;
	}
	.save {
		margin-top: 6px;
	}
	.tiles {
		gap: 12px;
	}
	.sss {
		display: none;
	}

	/* Desktop: tips as a grid of open cards, first aid spans two columns. */
	@media (min-width: 1024px) {
		.content {
			display: grid;
			grid-template-columns: minmax(0, 1fr) auto;
			align-items: end;
			gap: 24px;
			padding-top: 8px;
		}
		.intro {
			grid-column: 1;
			grid-row: 1;
			margin: 0;
		}
		/* The page header already names the page; keep the heading for screen readers. */
		.intro h1 {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip: rect(0 0 0 0);
			white-space: nowrap;
		}
		.ink2 {
			font-size: 17px;
		}
		.save {
			grid-column: 2;
			grid-row: 1;
			margin: 0;
			min-height: 44px;
			font-size: 15px;
		}
		.tiles {
			grid-column: 1 / -1;
			gap: 20px;
		}
		.tile {
			flex-basis: 48px;
			height: 48px;
		}
		.first-aid {
			grid-column: span 2;
			display: grid;
			grid-template-columns: auto minmax(0, 1fr) auto;
			grid-template-areas: 'tile text chev' 'sss sss sss';
			align-items: center;
			gap: 18px 16px;
			padding: 22px 24px;
			border-color: var(--ink);
			background: var(--ink);
			color: #fff;
		}
		.first-aid .tile {
			grid-area: tile;
			width: 56px;
			height: 56px;
			border-radius: 14px;
		}
		.first-aid .text {
			grid-area: text;
			font-size: 16px;
			color: #e2e8f0;
		}
		.first-aid .text b {
			font-size: 22px;
			color: #fff;
		}
		.first-aid .chev {
			grid-area: chev;
		}
		.sss {
			grid-area: sss;
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 12px;
		}
		.s {
			display: flex;
			align-items: center;
			gap: 12px;
			padding: 10px;
			border-radius: 12px;
			background: rgba(255, 255, 255, 0.08);
			font-size: 16px;
			font-weight: 700;
		}
		.s i {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 44px;
			height: 44px;
			border: 1.5px solid #fff;
			border-radius: 10px;
			font-size: 22px;
			font-style: normal;
			font-weight: 800;
		}
		.s.red i {
			border-color: var(--red);
			background: var(--red);
		}
		.first-aid:hover {
			box-shadow: 0 4px 14px rgba(20, 23, 28, 0.18);
		}
		.tip {
			padding: 18px;
		}
		summary.tip-row {
			align-items: flex-start;
			cursor: default;
		}
		.tip .chev {
			display: none;
		}
		.tip .text b {
			display: inline-block;
			margin-bottom: 2px;
			font-size: 17px;
		}
		/* Show the extra tips before the page script opens the cards (no jump on load). */
		details.tip::details-content {
			content-visibility: visible;
		}
		.tip ul {
			margin: 14px 0 0;
			padding: 14px 0 0 20px;
			border-top: 1px solid var(--line-soft);
			font-size: 15px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.chev {
			transition: none;
		}
	}
	@media print {
		.save,
		.chev {
			display: none;
		}
	}
</style>
