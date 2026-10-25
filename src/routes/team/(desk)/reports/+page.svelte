<script lang="ts">
	import { goto } from '$app/navigation';
	import { TYPES, clock, dayClock, typeOf } from '#lib/constants.ts';
	import StatusChip from '#lib/components/StatusChip.svelte';
	import { ALERT_KINDS, channelList, plural } from '#lib/components/team/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const PERIOD_LABELS = { today: 'Today', week: 'This week', month: 'This month' } as const;
	const at = $derived(data.period === 'today' ? clock : dayClock);
	const n = (v: number | null) => (v ?? 0).toLocaleString('en-KE');

	type Entry = { action: string; actor: string; detail: string | null };

	// Plain-language line for each audit event: text before the actor, the actor (bold), then the rest.
	function describe(e: Entry): [string, string, string] {
		const d = e.detail ?? '';
		switch (e.action) {
			case 'report_received':
				return ['First report received from ', e.actor, d ? ` · ${d}` : ''];
			case 'report_grouped':
				return ['Another report grouped with it from ', e.actor, d ? ` · ${d}` : ''];
			case 'held':
				return ['Held automatically: ', '', d];
			case 'picked_up':
				return ['Picked up by ', e.actor, d ? ` · ${d}` : ''];
			case 'verified':
				return ['Marked verified by ', e.actor, d ? ` · ${d}` : ''];
			case 'rejected':
				return ['Rejected by ', e.actor, d ? `: ${d}` : ''];
			case 'brief_sent':
				return ['Red Cross brief sent by ', e.actor, d ? ` · ${d}` : ''];
			case 'brief_opened':
				return ['Brief opened by ', e.actor, ''];
			case 'alert_sent':
				return ['Public SMS sent by ', e.actor, d ? `: ${d}` : ''];
			case 'update_posted':
				return ['Update posted by ', e.actor, d ? `: “${d}”` : ''];
			case 'update_sms_sent':
				return ['Update SMS sent by ', e.actor, d ? `: ${d}` : ''];
			case 'all_clear_sent':
				return ['All-clear SMS sent by ', e.actor, d ? `: ${d}` : ''];
			case 'closed':
				return ['Closed by ', e.actor, d ? ` · ${d}` : ''];
			default:
				return [`${e.action.replace(/_/g, ' ')} · `, e.actor, d ? ` · ${d}` : ''];
		}
	}

	function processed(r: (typeof data.rows)[number]): [string, string] {
		if (r.verified_by_name) return [r.verified_by_name, `Verified ${at(r.verified_at)}`];
		if (r.rejected_by_name) return [r.rejected_by_name, `Rejected ${at(r.rejected_at)}`];
		if (r.status === 'verifying') return ['Being checked', 'Waiting for Red Cross'];
		return ['Not picked up yet', ''];
	}

	const rowHref = (id: number) => `?period=${data.period}&id=${id}#trail`;
</script>

<svelte:head>
	<title>Qinga · Reports</title>
</svelte:head>

<div class="page">
	<div class="head">
		<div>
			<h1>Reports</h1>
			<p class="muted">Who received each incident, who handled it, and who got the alert · {PERIOD_LABELS[data.period].toLowerCase()}.</p>
		</div>
		<div class="row wrap no-print">
			<form method="GET" class="row">
				<label for="period" class="sr-only">Period</label>
				<select
					id="period"
					name="period"
					class="select"
					value={data.period}
					onchange={(e) => goto(`?period=${e.currentTarget.value}`)}
				>
					{#each Object.entries(PERIOD_LABELS) as [value, label] (value)}
						<option {value}>{label}</option>
					{/each}
				</select>
				<noscript><button class="btn btn-quiet btn-sm">Show</button></noscript>
			</form>
			<a class="btn btn-outline btn-sm" href="/api/reports-log.csv?period={data.period}" download>Download CSV</a>
			<button type="button" class="btn btn-dark btn-sm" onclick={() => window.print()}>Print / PDF</button>
		</div>
	</div>

	<div class="table-wrap">
		<table class="data">
			<thead>
				<tr>
					<th scope="col">Incident</th>
					<th scope="col">Received</th>
					<th scope="col">Processed by</th>
					<th scope="col">Confirmed by</th>
					<th scope="col">Public SMS</th>
					<th scope="col">Red Cross brief</th>
					<th scope="col">Status</th>
				</tr>
			</thead>
			<tbody>
				{#each data.rows as r (r.id)}
					{@const selected = data.selected?.id === r.id}
					{@const [who, when] = processed(r)}
					<tr class:selected>
						<td>
							<a class="pick" href={rowHref(r.id)} aria-current={selected ? 'true' : undefined}>
								<b>{TYPES[typeOf(r.type)].short}</b>
								<span>{r.location_label}</span>
							</a>
						</td>
						<td>
							<span class="nw">{at(r.first_report_at ?? r.created_at)}</span><br />
							<span class="muted">{channelList(r.channels) || 'No reports'} · {plural(r.report_count, 'report')}</span>
						</td>
						<td>{who}{#if when}<br /><span class="muted nw">{when}</span>{/if}</td>
						<td>
							{#if r.confirmed_by}{r.confirmed_by}
							{:else if r.status === 'rejected'}<span class="muted">Not needed</span>
							{:else}<span class="muted">Waiting for Red Cross</span>{/if}
						</td>
						<td>
							{#if r.alert_at}
								<span class="nw">{at(r.alert_at)}</span><br /><span class="muted nw">{n(r.alert_delivered)} of {n(r.alert_recipients)} delivered</span>
							{:else}<span class="muted">Not sent</span>{/if}
						</td>
						<td>
							{#if r.brief_at}
								<span class="nw">{at(r.brief_at)}</span><br /><span class="muted nw">{r.brief_opened_at ? `Opened ${at(r.brief_opened_at)}` : 'Not opened yet'}</span>
							{:else}<span class="muted">Not sent</span>{/if}
						</td>
						<td>
							<StatusChip status={r.status} />
							{#if r.status === 'rejected' && r.rejected_reason}<br /><span class="muted small">{r.rejected_reason}</span>{/if}
							{#if r.status === 'closed' && r.closed_at}<br /><span class="muted small">{at(r.closed_at)}</span>{/if}
						</td>
					</tr>
				{:else}
					<tr><td colspan="7" class="muted">No incidents in this period.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if data.selected}
		{@const sel = data.selected}
		<div class="details" id="trail">
			<section class="panel trail" aria-labelledby="trail-title">
				<h2 id="trail-title">Full trail · {sel.title}</h2>
				<p class="small muted">{sel.location_label}</p>
				<ol>
					{#each sel.trail as e (e.id)}
						{@const [before, actor, after] = describe(e)}
						<li><b class="time">{at(e.created_at)}</b><span>{before}{#if actor}<b>{actor}</b>{/if}{after}</span></li>
					{:else}
						<li class="muted">No events recorded.</li>
					{/each}
				</ol>
			</section>

			<section class="panel received" aria-labelledby="received-title">
				<h2 id="received-title">Who received it</h2>
				{#each sel.deliveries as d (d.created_at + d.kind)}
					<div class="item">
						<b>{ALERT_KINDS[d.kind] ?? d.kind} · {at(d.created_at)}</b>
						<span>{n(d.recipients)} sent · {n(d.delivered)} delivered · {n(d.failed)} failed</span>
					</div>
				{/each}
				{#each sel.briefs as b (b.id)}
					<div class="item">
						<b>Red Cross brief · {at(b.created_at)}</b>
						<span>Sent to {b.sent_to} · {b.opened_at ? `opened ${at(b.opened_at)}` : 'not opened yet'}</span>
					</div>
				{/each}
				{#if !sel.deliveries.length && !sel.briefs.length}
					<p class="muted small">Nothing was sent for this incident.</p>
				{/if}
			</section>
		</div>
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
	.head {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}
	h1 {
		font-size: 24px;
		font-weight: 800;
	}
	.head p {
		margin-top: 4px;
		font-size: 14px;
	}
	.select {
		min-height: 44px;
		width: auto;
		font-weight: 600;
		font-size: 14px;
	}
	.pick {
		display: flex;
		flex-direction: column;
		min-height: 44px;
		color: var(--ink);
		text-decoration: none;
	}
	.pick b {
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.pick[aria-current='true'] b {
		text-decoration-thickness: 2px;
	}
	/* Phone and tablet: trail, then who received it. Desktop: side by side. */
	.details {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 20px;
		align-items: start;
		scroll-margin-top: 12px;
	}
	@media (min-width: 1024px) {
		.details {
			grid-template-columns: minmax(0, 1fr) minmax(300px, 400px);
		}
		/* Desktop: the table fits the page, no sideways scrolling. */
		table.data {
			min-width: 0;
		}
		td:first-child {
			min-width: 160px;
		}
	}
	/* Tablet and up: times and counts never split over two lines. */
	@media (min-width: 768px) {
		.nw {
			white-space: nowrap;
		}
	}
	/* Small desktop: tighter cells so all seven columns fit. */
	@media (min-width: 1024px) and (max-width: 1279px) {
		table.data th,
		table.data td {
			padding-left: 10px;
			padding-right: 10px;
		}
	}
	@media (min-width: 1280px) {
		/* Room for every time, name and count on one line; incident and status may wrap. */
		td:nth-child(n + 2):nth-child(-n + 6) {
			white-space: nowrap;
		}
	}
	.trail ol {
		margin: 14px 0 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 12px;
		font-size: 14px;
		line-height: 1.4;
	}
	.trail li {
		display: flex;
		gap: 14px;
	}
	.time {
		flex: 0 0 96px;
	}
	.received {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.item {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 12px 14px;
		border-radius: 10px;
		background: var(--bg);
		font-size: 14px;
	}
	@media (max-width: 760px) {
		.time {
			flex-basis: 72px;
		}
	}
	@media print {
		.no-print {
			display: none;
		}
		.table-wrap {
			overflow: visible;
			border: none;
		}
		table.data {
			min-width: 0;
			font-size: 11px;
		}
		.panel {
			break-inside: avoid;
		}
	}
</style>
