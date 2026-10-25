<script lang="ts">
	import { untrack } from 'svelte';
	import { SEVERITIES } from '../../constants.ts';
	import { act } from './toast.svelte.ts';

	let { incident }: { incident: { id: number; summary: string | null; advice: string | null; severity: string | null; extreme: number } } =
		$props();

	let confirmedBy = $state('');
	let summary = $state(untrack(() => incident.summary ?? ''));
	let advice = $state(untrack(() => incident.advice ?? ''));
	let severity = $state(untrack(() => incident.severity ?? ''));
	let extreme = $state(untrack(() => incident.extreme === 1));
	let verifyError = $state<{ message: string; field?: string } | null>(null);
	let verifying = $state(false);

	let reason = $state('');
	let rejectError = $state<string | null>(null);
	let rejecting = $state(false);

	async function verify(e: SubmitEvent) {
		e.preventDefault();
		verifying = true;
		verifyError = null;
		const res = await act(
			`/api/incidents/${incident.id}/verify`,
			{ confirmed_by: confirmedBy.trim(), summary: summary.trim(), advice: advice.trim() || null, severity: severity || null, extreme },
			'Marked verified. You can now send the public SMS.'
		);
		verifying = false;
		if (!res.ok) verifyError = { message: res.error, field: res.field };
	}

	async function reject(e: SubmitEvent) {
		e.preventDefault();
		rejecting = true;
		rejectError = null;
		const res = await act(`/api/incidents/${incident.id}/reject`, { reason: reason.trim() }, 'Report rejected. Nothing goes to the public.');
		rejecting = false;
		if (!res.ok) rejectError = res.error;
	}

	const invalid = (field: string) => (verifyError?.field === field ? true : undefined);
</script>

<form class="box stack" onsubmit={verify} aria-labelledby="verify-title">
	<h2 id="verify-title">Mark verified</h2>
	<div class="field">
		<label for="confirmed-by">Who at Red Cross confirmed?</label>
		<input
			id="confirmed-by"
			class="input"
			required
			bind:value={confirmedBy}
			placeholder="e.g. J. Mwangi, on site"
			autocomplete="off"
			aria-invalid={invalid('confirmed_by')}
		/>
	</div>
	<div class="field">
		<label for="summary">Public summary</label>
		<textarea
			id="summary"
			class="textarea"
			rows="2"
			required
			bind:value={summary}
			placeholder="e.g. Two lanes blocked. Use another route."
			aria-invalid={invalid('summary')}
		></textarea>
	</div>
	<div class="field">
		<label for="advice">Advice <span class="muted">(optional)</span></label>
		<textarea id="advice" class="textarea" rows="2" bind:value={advice} placeholder="e.g. Keep the road clear for ambulances." aria-invalid={invalid('advice')}
		></textarea>
	</div>
	<div class="grid-2 fields">
		<div class="field">
			<label for="severity">Severity</label>
			<select id="severity" class="select" bind:value={severity} aria-invalid={invalid('severity')}>
				<option value="">Not set</option>
				{#each SEVERITIES as s (s)}<option value={s}>{s}</option>{/each}
			</select>
		</div>
		<label class="check extreme"><input type="checkbox" bind:checked={extreme} />Extreme (pulse on map)</label>
	</div>
	{#if verifyError}<p class="error" role="alert">{verifyError.message}</p>{/if}
	<button class="btn btn-green" disabled={verifying}>{verifying ? 'Saving…' : 'Mark verified'}</button>
</form>

<details class="box reject">
	<summary>Reject this report</summary>
	<form class="stack" onsubmit={reject}>
		<div class="field">
			<label for="reject-reason">Why? <span class="muted">(kept in the log)</span></label>
			<textarea id="reject-reason" class="textarea" rows="2" required bind:value={reason} placeholder="e.g. Old photo found online"></textarea>
		</div>
		{#if rejectError}<p class="error" role="alert">{rejectError}</p>{/if}
		<button class="btn btn-quiet" disabled={rejecting}>{rejecting ? 'Saving…' : 'Reject'}</button>
	</form>
</details>

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
	.fields {
		align-items: end;
	}
	.extreme {
		min-height: 48px;
	}
	.btn {
		align-self: flex-start;
	}
	.reject summary {
		min-height: 44px;
		display: flex;
		align-items: center;
		font-size: 15px;
		font-weight: 700;
		cursor: pointer;
	}
	.reject[open] summary {
		margin-bottom: 10px;
	}
	@media (max-width: 520px) {
		.fields {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
