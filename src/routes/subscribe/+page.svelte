<script lang="ts">
	import { tick } from 'svelte';
	import TopBar from '#lib/components/public/TopBar.svelte';
	import { post } from '#lib/api.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Desktop value points (phones show the one-line intro instead).
	const POINTS = [
		'Verified alerts only, checked with Red Cross',
		'Natural disasters, accidents and fire near you',
		'English or Kiswahili',
		'Works on any phone. Reply STOP any time.'
	];

	let phone = $state('');
	let areaId = $state('');
	let language = $state<'en' | 'sw'>('en');
	let sending = $state(false);
	let error = $state<string | null>(null);
	let done = $state<{ phone: string; area: string } | null>(null);

	async function subscribe(e: SubmitEvent) {
		e.preventDefault();
		error = null;
		if (!phone.trim()) return fail('Enter your phone number.', 'sub-phone');
		if (!areaId) return fail('Choose your area.', 'sub-area');
		sending = true;
		const res = await post('/api/subscribers', { phone: phone.trim(), area_id: Number(areaId), language });
		sending = false;
		if (!res.ok) return fail(res.error, res.field === 'area_id' ? 'sub-area' : res.field === 'phone' ? 'sub-phone' : undefined);
		done = { phone: phone.trim(), area: data.areas.find((a) => String(a.id) === areaId)?.name ?? '' };
	}

	async function fail(message: string, focusId?: string) {
		error = message;
		await tick();
		if (focusId) document.getElementById(focusId)?.focus();
	}
</script>

<svelte:head>
	<title>SMS alerts · Qinga</title>
</svelte:head>

<div class="phone subscribe-page">
	<TopBar title="SMS alerts" />

	<main class="content">
		{#if done}
			<div class="done" role="status">
				<span class="tick">
					<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
				</span>
				<h1 class="big-title">You're subscribed</h1>
				<p class="ink2">We'll text {done.phone} verified alerts for {done.area}.</p>
				<p class="small muted">Reply STOP any time to stop alerts.</p>
			</div>
			<a class="btn btn-outline done-home" href="/">Back to home</a>
		{:else}
			<div class="split-even sub-split">
				<div class="pitch">
					<div class="intro">
						<h1 class="big-title">Get free SMS alerts</h1>
						<p class="ink2 short-pitch">Verified alerts for natural disasters, accidents and fire near you. Works on any phone.</p>
					</div>

					<!-- Desktop only: the phone keeps the short line above. -->
					<ul class="points">
						{#each POINTS as point (point)}
							<li>
								<span class="dot"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg></span>
								{point}
							</li>
						{/each}
					</ul>

					<figure class="sample">
						<figcaption>What an alert looks like</figcaption>
						<div class="sms">
							<span class="from">QINGA</span>
							<p class="bubble">QINGA (verified): Fire at Gikomba market, shoe section. Fire brigade on site. Keep clear of the market. Emergency: 999.</p>
						</div>
					</figure>
				</div>

				<form class="form" onsubmit={subscribe} novalidate>
					<div class="field">
						<label for="sub-phone">Phone number</label>
						<input id="sub-phone" class="input big" type="tel" inputmode="tel" autocomplete="tel" placeholder="07XX XXX XXX" bind:value={phone} />
					</div>

					<div class="field">
						<label for="sub-area">Your area</label>
						<select id="sub-area" class="select big" bind:value={areaId}>
							<option value="">Choose your area</option>
							{#each data.areas as a (a.id)}<option value={String(a.id)}>{a.name}</option>{/each}
						</select>
					</div>

					<fieldset class="field">
						<legend class="label">Language</legend>
						<div class="grid-2">
							<button type="button" class="choice big" aria-pressed={language === 'en'} onclick={() => (language = 'en')}>English</button>
							<button type="button" class="choice big" aria-pressed={language === 'sw'} onclick={() => (language = 'sw')}>Kiswahili</button>
						</div>
					</fieldset>

					{#if error}<p class="error" role="alert">{error}</p>{/if}

					<div class="stack">
						<button type="submit" class="btn btn-green send" disabled={sending}>{sending ? 'Subscribing…' : 'Subscribe'}</button>
						<p class="small muted center">Reply STOP any time to stop alerts.</p>
					</div>
				</form>
			</div>
		{/if}
	</main>
</div>

<style>
	.content {
		gap: 24px;
		padding-top: 28px;
	}
	.intro {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.ink2 {
		font-size: 15px;
		line-height: 1.45;
		color: var(--ink-2);
	}
	.form {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}
	fieldset {
		margin: 0;
		padding: 0;
		border: 0;
	}
	legend {
		margin-bottom: 8px;
		padding: 0;
	}
	.big {
		min-height: 52px;
		font-size: 16px;
	}
	.send {
		min-height: 56px;
		font-size: 17px;
	}
	.center {
		text-align: center;
	}
	.done {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		text-align: center;
	}
	.tick {
		width: 56px;
		height: 56px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		background: var(--green);
		color: #fff;
	}
	/* Same 24px rhythm as before on phones. */
	.sub-split {
		gap: 24px;
	}
	.points,
	.sample {
		display: none;
	}

	/* Desktop: why subscribe (with a sample alert) on the left, the form in a card on the right. */
	@media (min-width: 1024px) {
		/* The heading below names the page; the site header already links home. */
		.subscribe-page > :global(.topbar) {
			display: none;
		}
		.content {
			padding-top: 48px;
		}
		.sub-split {
			gap: 56px;
		}
		.pitch {
			display: flex;
			flex-direction: column;
			gap: 24px;
		}
		.big-title {
			font-size: 32px;
		}
		.short-pitch {
			display: none;
		}
		.points {
			display: flex;
			flex-direction: column;
			gap: 14px;
			margin: 0;
			padding: 0;
			list-style: none;
		}
		.points li {
			display: flex;
			align-items: center;
			gap: 12px;
			font-size: 17px;
			line-height: 1.4;
		}
		.dot {
			flex: 0 0 26px;
			height: 26px;
			display: flex;
			align-items: center;
			justify-content: center;
			border-radius: 999px;
			background: var(--green-tint);
			color: var(--green);
		}
		.sample {
			display: flex;
			flex-direction: column;
			gap: 10px;
			max-width: 440px;
			margin: 8px 0 0;
		}
		.sample figcaption {
			font-size: 12px;
			font-weight: 700;
			letter-spacing: 0.04em;
			text-transform: uppercase;
			color: var(--muted);
		}
		.sms {
			display: flex;
			flex-direction: column;
			gap: 6px;
			padding: 16px;
			border: 1px solid var(--line);
			border-radius: 18px;
			background: var(--surface);
		}
		.from {
			font-size: 13px;
			font-weight: 800;
			letter-spacing: 0.04em;
		}
		.bubble {
			padding: 10px 14px;
			border-radius: 4px 16px 16px 16px;
			background: var(--bg);
			font-size: 15px;
			line-height: 1.45;
		}
		.form {
			padding: 28px;
			border: 1px solid var(--line);
			border-radius: 18px;
			background: var(--surface);
			box-shadow: 0 1px 2px rgba(20, 23, 28, 0.04);
		}
		.done {
			width: 100%;
			max-width: 560px;
			margin: 24px auto 0;
			padding: 40px 32px;
			border: 1px solid var(--line);
			border-radius: 18px;
			background: var(--surface);
		}
		.done-home {
			align-self: center;
			padding: 0 28px;
		}
	}
</style>
