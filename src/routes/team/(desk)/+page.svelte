<script lang="ts">
	import { onMount } from 'svelte';
	import { CONTACTS, TYPES, clock, dayClock, timeAgo, typeOf } from '#lib/constants.ts';
	import TypeIcon from '#lib/components/TypeIcon.svelte';
	import StatusChip from '#lib/components/StatusChip.svelte';
	import MapView from '#lib/components/MapView.svelte';
	import StatusStepper from '#lib/components/team/StatusStepper.svelte';
	import ReportList from '#lib/components/team/ReportList.svelte';
	import VerifyForms from '#lib/components/team/VerifyForms.svelte';
	import AlertComposer from '#lib/components/team/AlertComposer.svelte';
	import BriefPanel from '#lib/components/team/BriefPanel.svelte';
	import FollowUpForms from '#lib/components/team/FollowUpForms.svelte';
	import { act } from '#lib/components/team/toast.svelte.ts';
	import { ALERT_KINDS, channelList, plural } from '#lib/components/team/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Keeps "x min ago" fresh between live refreshes.
	let now = $state(Date.now());
	onMount(() => {
		const timer = setInterval(() => (now = Date.now()), 30_000);
		return () => clearInterval(timer);
	});

	const s = $derived(data.selected);
	const status = $derived(s?.incident.status ?? '');
	const open = $derived(['new', 'held', 'verifying', 'verified'].includes(status));
	const canVerify = $derived(['new', 'held', 'verifying'].includes(status));
	const firstAlert = $derived(s ? [...s.alerts].reverse().find((a) => a.kind === 'alert') : undefined);
	const firstReportAt = $derived(s?.reports[0]?.created_at ?? null);
	const redCross = CONTACTS.disaster.find((c) => c.label.includes('Red Cross')) ?? { tel: '1199', number: '1199' };

	let pickingUp = $state(false);
	let pickupError = $state<string | null>(null);

	async function pickUp(id: number) {
		pickingUp = true;
		pickupError = null;
		const res = await act(`/api/incidents/${id}/pickup`, undefined, 'Picked up. Call Red Cross to confirm it.');
		pickingUp = false;
		if (!res.ok) pickupError = res.error;
	}

	function alertLine(a: { delivered: number; recipients: number; failed: number; radius_km: number | null }) {
		const parts = [`${a.delivered.toLocaleString('en-KE')} of ${a.recipients.toLocaleString('en-KE')} delivered`];
		if (a.failed) parts.push(`${a.failed} failed`);
		if (a.radius_km) parts.push(`${a.radius_km} km`);
		return parts.join(' · ');
	}

	function queueMeta(row: (typeof data.queue)[number]) {
		const parts = [plural(row.report_count, 'report')];
		if (row.media_count) parts.push(plural(row.media_count, 'photo/video', 'photos/videos'));
		if (row.channels) parts.push(`via ${channelList(row.channels)}`);
		parts.push(timeAgo(row.first_report_at ?? row.created_at, now));
		return parts.join(' · ');
	}
</script>

<svelte:head>
	<title>Qinga · Incidents</title>
</svelte:head>

<div class="desk">
	<section class="queue" aria-labelledby="queue-title">
		<h2 id="queue-title">Incoming</h2>

		{#each data.pendingForecasts as f (f.id)}
			<a class="queue-item forecast" href="/team/forecasts?zone={f.area_id}">
				<span class="top"><b>Forecast</b><span class="chip chip-forecast">Needs approval</span></span>
				<span class="where">Heavy rain · {f.area_name}</span>
				<span class="meta">Created automatically · {timeAgo(f.created_at, now)}</span>
			</a>
		{/each}

		{#each data.queue as row (row.id)}
			{@const t = TYPES[typeOf(row.type)]}
			<a
				class="queue-item q-{row.status}"
				href="?id={row.id}#incident"
				aria-current={s?.incident.id === row.id ? 'true' : undefined}
			>
				<span class="top">
					<span class="type">
						<span class="icon" style:background={t.tint} style:color={t.ink}><TypeIcon type={row.type} size={16} /></span>
						<b>{row.subtype ?? t.short}</b>
					</span>
					<StatusChip status={row.status} />
				</span>
				<span class="where">{row.location_label}</span>
				{#if row.status === 'held'}
					<span class="meta reason">Held: {row.held_reason ?? 'this number sent false reports before'}</span>
				{:else if row.status === 'rejected' && row.rejected_reason}
					<span class="meta">{row.rejected_reason}</span>
				{/if}
				<span class="meta">{queueMeta(row)}</span>
			</a>
		{:else}
			<p class="panel muted">No reports right now. New ones appear here by themselves.</p>
		{/each}
	</section>

	<section class="panel incident" id="incident" aria-label="Selected incident">
		{#if s}
			{@const inc = s.incident}
			<div class="incident-head">
				<div>
					<h1>{inc.title}</h1>
					<p class="muted small">
						{inc.location_label} · {plural(s.reports.length, 'report')} · first {timeAgo(firstReportAt ?? inc.created_at, now)}
					</p>
				</div>
				<StatusStepper status={inc.status} />
			</div>

			{#if inc.status === 'held'}
				{@const reason = data.queue.find((q) => q.id === inc.id)?.held_reason ?? 'This number has sent false reports before'}
				<p class="notice held">
					<b>Held for a closer look.</b>
					{reason.replace(/\.?$/, '.')} Check carefully before verifying.
				</p>
			{/if}

			<div class="evidence">
				<div class="reports-col">
					<h2>Reports</h2>
					<ReportList reports={s.reports} />
				</div>
				<div class="map-col">
					{#key inc.id}
						<MapView
							incidents={[{ id: inc.id, type: inc.type, lat: inc.lat, lon: inc.lon, title: inc.title, extreme: inc.extreme }]}
							center={{ lat: inc.lat, lon: inc.lon }}
							zoom={15}
							height="200px"
							selectedId={inc.id}
						/>
					{/key}
				</div>
			</div>

			<p class="privacy">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
					><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /></svg
				>
				Faces and number plates are blurred before anything goes public.
			</p>

			{#if canVerify}
				<div class="confirm">
					<h2>Confirm with Red Cross</h2>
					<div class="row wrap">
						{#if inc.status !== 'verifying'}
							<button type="button" class="btn btn-dark btn-sm" disabled={pickingUp} onclick={() => pickUp(inc.id)}>
								{pickingUp ? 'Picking up…' : 'Pick up'}
							</button>
						{/if}
						<a class="btn btn-outline btn-sm" href="tel:{redCross.tel}">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
								><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg
							>
							Call Red Cross Nairobi desk ({redCross.number})
						</a>
					</div>
					{#if inc.status === 'verifying'}<p class="small muted">Someone on the team is checking this now.</p>{/if}
					{#if pickupError}<p class="error" role="alert">{pickupError}</p>{/if}
				</div>
				{#key inc.id}
					<VerifyForms incident={inc} />
				{/key}
			{:else}
				<dl class="summary">
					{#if inc.status === 'rejected'}
						<dt>Rejected</dt>
						<dd>{[dayClock(inc.rejected_at), inc.rejected_reason].filter(Boolean).join(' · ')}</dd>
					{:else}
						<dt>Verified</dt>
						<dd>{[dayClock(inc.verified_at), inc.confirmed_by && `confirmed by ${inc.confirmed_by}`].filter(Boolean).join(' · ')}</dd>
						{#if inc.summary}<dt>Public summary</dt><dd>{inc.summary}</dd>{/if}
						{#if inc.advice}<dt>Advice</dt><dd>{inc.advice}</dd>{/if}
						<dt>Severity</dt>
						<dd>{inc.severity ?? 'Not set'}{#if inc.extreme}{' · '}<b>Extreme</b> (pulses on the map){/if}</dd>
						{#if inc.status === 'closed'}<dt>Closed</dt><dd>{dayClock(inc.closed_at)}</dd>{/if}
					{/if}
				</dl>
			{/if}

			{#if inc.status === 'verified'}
				{#key inc.id}
					<FollowUpForms incidentId={inc.id} alertSent={!!firstAlert} />
				{/key}
			{/if}

			{#if s.updates.length}
				<div class="stack">
					<h2>Updates</h2>
					<ul class="updates">
						{#each s.updates as u (u.id)}
							<li><b>{clock(u.created_at)}</b> {u.text}</li>
						{/each}
					</ul>
				</div>
			{/if}
		{:else}
			<p class="muted">
				{data.requestedId ? 'That incident was not found.' : 'Nothing to check. Pick an incident from the list when one comes in.'}
			</p>
		{/if}
	</section>

	{#if s}
		{@const inc = s.incident}
		<aside class="side" aria-label="Alerts and Red Cross">
			<section class="panel sms" aria-labelledby="sms-title">
				<div>
					<h2 id="sms-title">Public SMS</h2>
					<p class="small muted">Short and simple · {s.subscriberTotal.toLocaleString('en-KE')} subscribers in total</p>
				</div>
				{#if inc.status === 'verified'}
					{#key inc.id}
						<AlertComposer incidentId={inc.id} message={s.message} lastRadius={firstAlert?.radius_km ?? null} />
					{/key}
				{:else if open}
					<p class="small muted">Who to call is added for each type: fire, accident or flood.</p>
					<button type="button" class="btn btn-quiet" disabled>Send SMS · after verifying</button>
				{:else if !s.alerts.length}
					<p class="small muted">No SMS was sent for this incident.</p>
				{/if}

				{#if s.alerts.length}
					<h3>Sent</h3>
					<ul class="alerts">
						{#each s.alerts as a (a.id)}
							<li>
								<b>{ALERT_KINDS[a.kind] ?? a.kind} · {clock(a.created_at)}</b>
								<span>{alertLine(a)}</span>
								<details>
									<summary>Message</summary>
									<p>{a.body}</p>
									{#if a.body_sw}<p lang="sw">{a.body_sw}</p>{/if}
								</details>
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<BriefPanel
				incident={inc}
				{firstReportAt}
				reportCount={s.reports.length}
				hurtMentions={s.hurtMentions}
				reporters={s.reporters}
				mediaCount={s.mediaCount}
				briefs={s.briefs}
				canSend={open}
			/>
		</aside>
	{/if}
</div>

<style>
	/* Phone: one column. Tablet: queue | incident (alerts panel under the incident). Desktop: three columns. */
	.desk {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 20px;
		align-items: start;
	}
	@media (min-width: 760px) {
		.desk {
			grid-template-columns: 250px minmax(0, 1fr);
		}
		.desk .side {
			grid-column: 2;
		}
		.queue {
			position: sticky;
			top: 16px;
			max-height: calc(100dvh - 32px);
			overflow-y: auto;
			padding-bottom: 4px;
		}
	}
	@media (min-width: 1200px) {
		.desk {
			grid-template-columns: 290px minmax(0, 1fr) minmax(320px, 380px);
		}
		.desk .side {
			grid-column: auto;
		}
	}
	.queue {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.queue h2 {
		margin-bottom: 4px;
		font-size: 15px;
		font-weight: 800;
	}
	.queue-item .top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
	}
	.type {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: 15px;
	}
	.icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border-radius: 8px;
	}
	.where {
		font-size: 14px;
	}
	.meta {
		font-size: 13px;
		color: var(--muted);
	}
	.queue-item.q-held {
		border: 1.5px dashed var(--red);
	}
	.queue-item.q-held[aria-current='true'] {
		border: 2px dashed var(--red);
	}
	.reason {
		color: #991b1b;
	}
	.queue-item.q-rejected,
	.queue-item.q-closed {
		color: var(--muted);
	}
	.queue-item.forecast {
		border: 1.5px dashed var(--forecast);
	}
	.queue-item:hover {
		border-color: var(--ink);
	}

	.incident {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 16px;
		scroll-margin-top: 12px;
	}
	.incident-head {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: flex-start;
		gap: 12px;
	}
	h1 {
		font-size: 22px;
		font-weight: 800;
	}
	.incident-head p {
		margin-top: 4px;
		font-size: 14px;
	}
	.incident h2,
	.side h3 {
		font-size: 15px;
		font-weight: 800;
	}
	.notice.held {
		padding: 12px 14px;
		border: 1.5px dashed var(--red);
		border-radius: 12px;
		color: #991b1b;
		font-size: 14px;
	}
	.evidence {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
	}
	.reports-col {
		flex: 3 1 320px;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.map-col {
		flex: 2 1 220px;
		min-width: 0;
		padding-top: 28px;
	}
	.privacy {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		color: var(--ink-2);
	}
	.privacy svg {
		flex: none;
	}
	.confirm {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 16px;
		border-radius: 12px;
		background: var(--bg);
	}
	.summary {
		display: grid;
		grid-template-columns: 130px minmax(0, 1fr);
		gap: 8px 12px;
		margin: 0;
		padding: 16px;
		border-radius: 12px;
		background: var(--bg);
		font-size: 14px;
		line-height: 1.45;
	}
	.summary dt {
		color: var(--muted);
	}
	.summary dd {
		margin: 0;
	}
	.updates {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 6px;
		font-size: 14px;
	}

	.side {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
	.sms {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.alerts {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.alerts li {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 10px 12px;
		border-radius: 10px;
		background: var(--bg);
		font-size: 14px;
	}
	.alerts summary {
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
	}
	.alerts details p {
		font-size: 13px;
		line-height: 1.45;
		margin-top: 4px;
	}

	@media (max-width: 860px) {
		.map-col {
			padding-top: 0;
		}
	}
</style>
