<script lang="ts">
	import { untrack } from 'svelte';
	import { getJson } from '../../api.ts';
	import { act } from './toast.svelte.ts';
	import SmsField from './SmsField.svelte';

	let {
		incidentId,
		message,
		lastRadius
	}: { incidentId: number; message: { en: string; sw: string }; lastRadius: number | null } = $props();

	const RADII = [1, 2, 3, 5];

	let en = $state(untrack(() => message.en));
	let sw = $state(untrack(() => message.sw));
	let radius = $state(untrack(() => (lastRadius && RADII.includes(lastRadius) ? lastRadius : 3)));
	let count = $state<number | null>(null);
	let countFailed = $state(false);
	let sending = $state(false);
	let error = $state<string | null>(null);

	// Live count of subscribers inside the chosen radius.
	$effect(() => {
		const url = `/api/incidents/${incidentId}/recipients?radius_km=${radius}`;
		let cancelled = false;
		count = null;
		countFailed = false;
		getJson<{ count: number }>(url)
			.then((d) => !cancelled && (count = d.count))
			.catch(() => !cancelled && (countFailed = true));
		return () => (cancelled = true);
	});

	async function send(e: SubmitEvent) {
		e.preventDefault();
		sending = true;
		error = null;
		const res = await act<{ recipients: number; sent: number; failed: number }>(
			`/api/incidents/${incidentId}/alert`,
			{ body: en.trim(), body_sw: sw.trim() || null, radius_km: radius },
			(d) => `SMS sent to ${d.recipients} people · ${d.sent} accepted, ${d.failed} failed`
		);
		sending = false;
		if (!res.ok) error = res.error;
	}

	const people = $derived(count === null ? (countFailed ? 'people' : '…') : `${count.toLocaleString('en-KE')} ${count === 1 ? 'person' : 'people'}`);
</script>

<form class="stack" onsubmit={send}>
	<SmsField id="sms-en" label="English" bind:value={en} lang="en" />
	<SmsField id="sms-sw" label="Kiswahili" bind:value={sw} lang="sw" />
	<div class="field">
		<label for="sms-radius">Send to people within</label>
		<select id="sms-radius" class="select" bind:value={radius}>
			{#each RADII as r (r)}<option value={r}>{r} km</option>{/each}
		</select>
		<span class="small muted" aria-live="polite">
			{#if countFailed}Couldn't count recipients right now.{:else}Reaches {people} who subscribed nearby.{/if}
		</span>
	</div>
	<p class="small muted">Each subscriber gets the version in their language.</p>
	{#if error}<p class="error" role="alert">{error}</p>{/if}
	<button class="btn btn-red" disabled={sending || !en.trim()}>
		{sending ? 'Sending…' : `Send SMS to ${people}`}
	</button>
</form>

<style>
	.field label {
		font-size: 14px;
	}
</style>
