<script lang="ts">
	import { untrack } from 'svelte';
	import StatusChip from '../StatusChip.svelte';
	import { timeAgo } from '../../constants.ts';
	import { act } from './toast.svelte.ts';
	import { CHANNEL_LABELS } from './format.ts';

	type Rumour = {
		id: number;
		text: string;
		media_path: string | null;
		status: string;
		verdict: string | null;
		incident_id: number | null;
		channel: string;
		resolved_at: string | null;
		created_at: string;
	};

	let { rumour, incidents, now }: { rumour: Rumour; incidents: { id: number; title: string; location_label: string }[]; now: number } =
		$props();

	let verdict = $state(untrack(() => rumour.verdict ?? ''));
	let incidentId = $state(untrack(() => (rumour.incident_id ? String(rumour.incident_id) : '')));
	let busy = $state<string | null>(null);
	let error = $state<{ message: string; field?: string } | null>(null);

	const isVideo = $derived(/\.(mp4|mov|webm)$/i.test(rumour.media_path ?? ''));
	const linked = $derived(incidents.some((i) => String(i.id) === incidentId));

	const DONE: Record<string, string> = {
		true: 'Marked TRUE. The public page shows your answer.',
		false: 'Marked FALSE. The public page shows the correction.',
		checking: 'Kept as still checking.'
	};

	async function mark(status: 'true' | 'false' | 'checking') {
		busy = status;
		error = null;
		const res = await act(
			`/api/rumours/${rumour.id}`,
			{ status, verdict: verdict.trim() || null, incident_id: incidentId ? Number(incidentId) : null },
			DONE[status]
		);
		busy = null;
		if (!res.ok) error = { message: res.error, field: res.field };
	}
</script>

<article class="panel rumour" aria-labelledby="rumour-{rumour.id}">
	<div class="head">
		<h3 id="rumour-{rumour.id}">“{rumour.text}”</h3>
		<StatusChip status={rumour.status} label={rumour.status === 'checking' ? 'Checking' : rumour.status} />
	</div>
	<p class="muted small">
		Via {CHANNEL_LABELS[rumour.channel] ?? rumour.channel} · {timeAgo(rumour.created_at, now)}
		{#if rumour.resolved_at}{` · answered ${timeAgo(rumour.resolved_at, now)}`}{/if}
	</p>

	{#if rumour.media_path}
		<a class="attachment" href="/uploads/{rumour.media_path}" target="_blank" rel="noopener">
			{#if isVideo}
				<span class="small">Open the video they sent</span>
			{:else}
				<img src="/uploads/{rumour.media_path}" alt="Sent with this rumour" />
				<span class="small">Open full size</span>
			{/if}
		</a>
	{/if}

	<form class="stack" onsubmit={(e) => e.preventDefault()}>
		<div class="field">
			<label for="verdict-{rumour.id}">What is true? <span class="muted">(shown to the public)</span></label>
			<textarea
				id="verdict-{rumour.id}"
				class="textarea"
				rows="2"
				bind:value={verdict}
				placeholder="e.g. Old video from another country. Thika Rd bridges are fine."
				aria-invalid={error?.field === 'verdict' || undefined}
				aria-describedby={error ? `rumour-err-${rumour.id}` : undefined}
			></textarea>
		</div>
		<div class="field">
			<label for="incident-{rumour.id}">Link to a verified incident <span class="muted">(optional)</span></label>
			<select id="incident-{rumour.id}" class="select" bind:value={incidentId}>
				<option value="">Not linked</option>
				{#each incidents as i (i.id)}
					<option value={String(i.id)}>{i.title} · {i.location_label}</option>
				{/each}
				{#if incidentId && !linked}
					<option value={incidentId}>Incident #{incidentId} (no longer public)</option>
				{/if}
			</select>
		</div>
		{#if error}
			<p class="error" id="rumour-err-{rumour.id}" role="alert">{error.message}</p>
		{/if}
		<div class="row wrap">
			<button type="button" class="btn btn-green btn-sm" disabled={!!busy} onclick={() => mark('true')}>
				{busy === 'true' ? 'Saving…' : 'Mark TRUE'}
			</button>
			<button type="button" class="btn btn-red btn-sm" disabled={!!busy} onclick={() => mark('false')}>
				{busy === 'false' ? 'Saving…' : 'Mark FALSE'}
			</button>
			<button type="button" class="btn btn-quiet btn-sm" disabled={!!busy} onclick={() => mark('checking')}>
				{busy === 'checking' ? 'Saving…' : 'Still checking'}
			</button>
		</div>
	</form>
</article>

<style>
	.rumour {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 12px;
	}
	h3 {
		margin: 0;
		font-size: 17px;
		font-weight: 800;
		line-height: 1.35;
	}
	.field label {
		font-size: 14px;
	}
	.attachment {
		display: inline-flex;
		flex-direction: column;
		gap: 6px;
		align-self: flex-start;
		min-height: 44px;
		justify-content: center;
		font-weight: 600;
	}
	.attachment img {
		width: 180px;
		height: 120px;
		object-fit: cover;
		border-radius: 10px;
		background: #5b6472;
	}
</style>
