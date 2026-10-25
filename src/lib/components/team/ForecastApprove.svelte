<script lang="ts">
	import { untrack } from 'svelte';
	import { act } from './toast.svelte.ts';
	import SmsField from './SmsField.svelte';

	let {
		forecastId,
		zoneName,
		message,
		recipients
	}: { forecastId: number; zoneName: string; message: { en: string; sw: string }; recipients: number } = $props();

	let en = $state(untrack(() => message.en));
	let sw = $state(untrack(() => message.sw));
	let notifyRedCross = $state(true);
	let busy = $state<'approve' | 'dismiss' | null>(null);
	let error = $state<string | null>(null);

	async function approve(e: SubmitEvent) {
		e.preventDefault();
		busy = 'approve';
		error = null;
		const res = await act<{ recipients: number; sent: number; failed: number }>(
			`/api/forecasts/${forecastId}/approve`,
			{ body: en.trim(), body_sw: sw.trim() || null, notify_red_cross: notifyRedCross },
			(d) => `Warning sent to ${d.recipients} people in ${zoneName}${notifyRedCross ? ' · Red Cross briefed' : ''}`
		);
		busy = null;
		if (!res.ok) error = res.error;
	}

	async function dismiss() {
		busy = 'dismiss';
		error = null;
		const res = await act(`/api/forecasts/${forecastId}/dismiss`, undefined, `Forecast for ${zoneName} dismissed. Nothing was sent.`);
		busy = null;
		if (!res.ok) error = res.error;
	}
</script>

<form class="stack" onsubmit={approve}>
	<SmsField id="fc-en" label="English" bind:value={en} lang="en" />
	<SmsField id="fc-sw" label="Kiswahili" bind:value={sw} lang="sw" />
	<p class="small muted">
		To ~{recipients.toLocaleString('en-KE')}
		{recipients === 1 ? 'person' : 'people'} subscribed in and around {zoneName}. Each gets their language.
	</p>
	<label class="check"><input type="checkbox" bind:checked={notifyRedCross} />Also send the full forecast to Red Cross</label>
	{#if error}<p class="error" role="alert">{error}</p>{/if}
	<button class="btn btn-orange" disabled={!!busy || !en.trim()}>{busy === 'approve' ? 'Sending…' : 'Approve warning & send SMS'}</button>
	<button type="button" class="btn btn-quiet" disabled={!!busy} onclick={dismiss}>{busy === 'dismiss' ? 'Dismissing…' : 'Dismiss forecast'}</button>
</form>

<style>
	.check {
		font-size: 14px;
	}
	.check input {
		accent-color: var(--red);
	}
</style>
