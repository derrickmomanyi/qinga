<script lang="ts">
	import { untrack } from 'svelte';
	import { act } from './toast.svelte.ts';

	// Updates and the all-clear go to the same people as the first public SMS.
	let { incidentId, alertSent }: { incidentId: number; alertSent: boolean } = $props();

	let text = $state('');
	let sendSms = $state(untrack(() => alertSent));
	let posting = $state(false);
	let updateError = $state<string | null>(null);

	let allClear = $state(untrack(() => alertSent));
	let confirming = $state(false);
	let closing = $state(false);
	let closeError = $state<string | null>(null);

	async function postUpdate(e: SubmitEvent) {
		e.preventDefault();
		posting = true;
		updateError = null;
		const res = await act<{ recipients: number }>(
			`/api/incidents/${incidentId}/update`,
			{ text: text.trim(), send_sms: alertSent && sendSms },
			(d) => (d.recipients ? `Update posted and sent to ${d.recipients} people` : 'Update posted on the app')
		);
		posting = false;
		if (res.ok) text = '';
		else updateError = res.error;
	}

	async function close() {
		closing = true;
		closeError = null;
		const res = await act<{ recipients: number }>(
			`/api/incidents/${incidentId}/close`,
			{ all_clear: alertSent && allClear },
			(d) => (d.recipients ? `Incident closed. All-clear sent to ${d.recipients} people.` : 'Incident closed.')
		);
		closing = false;
		confirming = false;
		if (!res.ok) closeError = res.error;
	}
</script>

<form class="box stack" onsubmit={postUpdate} aria-labelledby="update-title">
	<h2 id="update-title">Post update</h2>
	<div class="field">
		<label for="update-text">What changed?</label>
		<textarea id="update-text" class="textarea" rows="2" required bind:value={text} placeholder="e.g. One lane reopened."></textarea>
	</div>
	{#if alertSent}
		<label class="check"><input type="checkbox" bind:checked={sendSms} />Also SMS people who got the alert</label>
	{:else}
		<p class="small muted">No public SMS has gone out yet, so this update shows on the app only.</p>
	{/if}
	{#if updateError}<p class="error" role="alert">{updateError}</p>{/if}
	<button class="btn btn-dark btn-sm" disabled={posting || !text.trim()}>{posting ? 'Posting…' : 'Post update'}</button>
</form>

<div class="box stack" role="group" aria-labelledby="close-title">
	<h2 id="close-title">Close incident</h2>
	{#if alertSent}
		<label class="check"><input type="checkbox" bind:checked={allClear} />Send all-clear SMS</label>
	{/if}
	{#if closeError}<p class="error" role="alert">{closeError}</p>{/if}
	{#if confirming}
		<p class="small"><b>Close this incident{alertSent && allClear ? ' and send the all-clear' : ''}?</b> It leaves the public map.</p>
		<div class="row wrap">
			<button type="button" class="btn btn-dark btn-sm" disabled={closing} onclick={close}>{closing ? 'Closing…' : 'Yes, close it'}</button>
			<button type="button" class="btn btn-quiet btn-sm" disabled={closing} onclick={() => (confirming = false)}>Cancel</button>
		</div>
	{:else}
		<button type="button" class="btn btn-outline btn-sm" onclick={() => (confirming = true)}>Close incident</button>
	{/if}
</div>

<style>
	.box {
		padding: 16px;
		border: 1px solid var(--line);
		border-radius: 12px;
	}
	h2 {
		font-size: 15px;
		font-weight: 800;
	}
	.field label {
		font-size: 14px;
	}
	.box > .btn {
		align-self: flex-start;
	}
</style>
