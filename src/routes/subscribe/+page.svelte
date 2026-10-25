<script lang="ts">
	import { tick } from 'svelte';
	import TopBar from '#lib/components/public/TopBar.svelte';
	import { post } from '#lib/api.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

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

<div class="phone">
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
			<a class="btn btn-outline" href="/">Back to home</a>
		{:else}
			<div class="intro">
				<h1 class="big-title">Get free SMS alerts</h1>
				<p class="ink2">Verified alerts for natural disasters, accidents and fire near you. Works on any phone.</p>
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
</style>
