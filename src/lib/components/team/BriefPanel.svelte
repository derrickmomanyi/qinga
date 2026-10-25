<script lang="ts">
	import { clock, dayClock } from '../../constants.ts';
	import { act, toast } from './toast.svelte.ts';
	import { plural } from './format.ts';

	type Brief = { id: number; token: string; sent_to: string; created_at: string; opened_at: string | null };

	let {
		incident,
		firstReportAt,
		reportCount,
		hurtMentions,
		reporters,
		mediaCount,
		briefs,
		canSend
	}: {
		incident: { id: number; lat: number; lon: number; location_label: string; casualties: string | null; severity: string | null };
		firstReportAt: string | null;
		reportCount: number;
		hurtMentions: number;
		reporters: number;
		mediaCount: number;
		briefs: Brief[];
		canSend: boolean;
	} = $props();

	let sending = $state(false);
	let error = $state<string | null>(null);

	async function send() {
		sending = true;
		error = null;
		const res = await act(`/api/incidents/${incident.id}/brief`, undefined, 'Brief sent to Red Cross. You will see when they open it.');
		sending = false;
		if (!res.ok) error = res.error;
	}

	async function copy(token: string) {
		try {
			await navigator.clipboard.writeText(`${location.origin}/brief/${token}`);
			toast.show('Brief link copied');
		} catch {
			toast.show('Could not copy. Open the link and copy it from the address bar.');
		}
	}
</script>

<section class="panel brief" aria-labelledby="brief-title">
	<div>
		<h2 id="brief-title">Red Cross brief</h2>
		<p class="small muted">Full details · partners only</p>
	</div>
	<dl>
		<dt>Exact location</dt>
		<dd>{incident.lat.toFixed(4)}, {incident.lon.toFixed(4)} · {incident.location_label}</dd>
		<dt>First report</dt>
		<dd>{clock(firstReportAt)}</dd>
		<dt>People hurt</dt>
		<dd>
			{incident.casualties ?? 'Not said'}{#if reportCount > 1}{` · mentioned in ${hurtMentions} of ${reportCount} reports`}{/if}
		</dd>
		<dt>Severity</dt>
		<dd>{incident.severity ?? 'Not said'}</dd>
		<dt>Photos / video</dt>
		<dd>{mediaCount ? `${plural(mediaCount, 'file')}, full size` : 'None sent'}</dd>
		<dt>Reporters</dt>
		<dd>{reporters ? `${plural(reporters, 'phone number')} for follow-up` : 'All anonymous'}</dd>
	</dl>

	{#if canSend}
		{#if error}<p class="error" role="alert">{error}</p>{/if}
		<button type="button" class="btn btn-red" disabled={sending} onclick={send}>
			{sending ? 'Sending…' : briefs.length ? 'Send the brief again' : 'Send brief to Red Cross'}
		</button>
	{/if}

	{#if briefs.length}
		<ul class="sent">
			{#each briefs as b (b.id)}
				<li>
					<b>Sent {dayClock(b.created_at)}</b>
					<span class="small">{b.sent_to}</span>
					<span class="small" class:opened={b.opened_at}>{b.opened_at ? `Opened ${dayClock(b.opened_at)}` : 'Not opened yet'}</span>
					<span class="row wrap links">
						<a class="small" href="/brief/{b.token}" target="_blank" rel="noopener" data-sveltekit-preload-data="off">Open as Red Cross (demo)</a>
						<button type="button" class="btn btn-quiet btn-sm" onclick={() => copy(b.token)}>Copy link</button>
					</span>
				</li>
			{/each}
		</ul>
		<p class="small muted">Opening the link counts as Red Cross having seen it.</p>
	{/if}
</section>

<style>
	.brief {
		display: flex;
		flex-direction: column;
		gap: 12px;
		border: 2px solid var(--red);
	}
	dl {
		display: grid;
		grid-template-columns: 120px minmax(0, 1fr);
		gap: 8px 12px;
		margin: 0;
		font-size: 14px;
		line-height: 1.4;
	}
	dt {
		color: var(--muted);
	}
	dd {
		margin: 0;
		overflow-wrap: anywhere;
	}
	.sent {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.sent li {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 10px 12px;
		border-radius: 10px;
		background: var(--bg);
		font-size: 14px;
	}
	.opened {
		color: var(--green);
		font-weight: 700;
	}
	.links {
		margin-top: 4px;
		gap: 12px;
	}
	.links a {
		font-weight: 600;
		min-height: 44px;
		display: inline-flex;
		align-items: center;
	}
</style>
