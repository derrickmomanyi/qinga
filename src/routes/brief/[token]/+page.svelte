<script lang="ts">
	import Logo from '#lib/components/Logo.svelte';
	import StatusChip from '#lib/components/StatusChip.svelte';
	import { TYPES, dayClock, typeOf } from '#lib/constants.ts';
	import { forecastWindow, mediaUrl } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const osm = (lat: number, lon: number) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`;
	const coords = (lat: number, lon: number) => `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
	const CHANNEL: Record<string, string> = { app: 'Web app', quick: 'Quick report (web)', sms: 'SMS', whatsapp: 'WhatsApp' };
	const MODEL: Record<string, string> = { ecmwf_ifs025: 'ECMWF', icon_seamless: 'ICON', gfs_seamless: 'GFS' };
</script>

<svelte:head>
	<title>Responder brief · Qinga</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="sheet" class:wide={data.kind === 'incident'}>
	<header class="head">
		<Logo size={30} />
		<div class="grow">
			<p class="kicker">Responder brief</p>
			<p class="small muted">For {data.brief.sentTo} · sent {dayClock(data.brief.createdAt)} · private link, do not forward</p>
		</div>
		<button type="button" class="btn btn-dark btn-sm print" onclick={() => window.print()}>
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V3h12v6" /><rect x="4" y="9" width="16" height="8" rx="1" /><path d="M7 14h10v7H7z" /></svg>
			Print
		</button>
	</header>

	{#if data.kind === 'incident'}
		{@const i = data.incident}
		<main class="body">
			<div class="title-row">
				<h1>{i.title}</h1>
				<div class="chips">
					<StatusChip status={i.status} />
					{#if i.extreme}<StatusChip status="extreme" />{/if}
				</div>
			</div>
			{#if i.summary}<p class="lead">{i.summary}</p>{/if}
			{#if i.advice}<p>Public advice: {i.advice}</p>{/if}

			<div class="sections">
				<section class="details">
					<h2>Details</h2>
					<dl class="facts">
						<dt>Type</dt>
						<dd>{TYPES[typeOf(i.type)].label}{i.subtype ? ` · ${i.subtype}` : ''}</dd>
						<dt>Severity</dt>
						<dd>{i.severity ?? 'Not given'}{i.extreme ? ' · marked extreme' : ''}</dd>
						<dt>People hurt</dt>
						<dd>{i.casualties ?? 'Not given'}</dd>
						<dt>Location</dt>
						<dd>{i.location_label}</dd>
						<dt>Coordinates</dt>
						<dd><a href={osm(i.lat, i.lon)} target="_blank" rel="noopener">{coords(i.lat, i.lon)}</a> (OpenStreetMap)</dd>
						<dt>First reported</dt>
						<dd>{dayClock(i.created_at)}</dd>
						<dt>Verified</dt>
						<dd>
							{#if i.verified_at}
								{dayClock(i.verified_at)}{data.verifiedBy ? ` by ${data.verifiedBy} (Qinga)` : ''}{i.confirmed_by ? ` · confirmed by ${i.confirmed_by}` : ''}
							{:else}
								Not yet verified
							{/if}
						</dd>
						{#if i.closed_at}
							<dt>Closed</dt>
							<dd>{dayClock(i.closed_at)}</dd>
						{/if}
					</dl>
				</section>

				<section class="reports-col">
					<h2>Reports ({data.reports.length})</h2>
					<ol class="reports">
						{#each data.reports as r (r.id)}
							<li class="report">
								<p class="report-head">
									<b>{dayClock(r.created_at)}</b> · {CHANNEL[r.channel] ?? r.channel} · Ref {r.ref}
								</p>
								<p>
									{#if r.phone && r.phoneDisplay}
										Phone: <a href="tel:{r.phone}">{r.phoneDisplay}</a>
									{:else}
										Phone: anonymous
									{/if}
								</p>
								{#if r.note}<p class="note">“{r.note}”</p>{/if}
								<p class="small muted">
									{[r.subtype, r.severity, r.casualties ? `hurt: ${r.casualties}` : null].filter(Boolean).join(' · ') || 'No details given'}
								</p>
								{#if r.location_label || (r.lat != null && r.lon != null)}
									<p class="small">
										{r.location_label ?? ''}
										{#if r.lat != null && r.lon != null}
											<a href={osm(r.lat, r.lon)} target="_blank" rel="noopener">{coords(r.lat, r.lon)}</a>
										{/if}
									</p>
								{/if}
								{#if r.media_path}
									<p class="small"><a href={mediaUrl(r.media_path)} target="_blank" rel="noopener">Open {r.media_type === 'video' ? 'video' : 'photo'}</a> (not blurred)</p>
								{/if}
							</li>
						{/each}
					</ol>
				</section>

				{#if data.updates.length}
					<section class="updates-col">
						<h2>Updates</h2>
						<ul class="updates">
							{#each data.updates as u (u.id)}
								<li><b>{dayClock(u.created_at)}</b> · {u.text}</li>
							{/each}
						</ul>
					</section>
				{/if}
			</div>
		</main>
	{:else}
		{@const f = data.forecast}
		<main class="body">
			<div class="title-row">
				<h1>Heavy rain forecast · {f.area_name}</h1>
				<div class="chips"><StatusChip status={f.status === 'approved' ? 'warning' : f.status} /></div>
			</div>
			<section>
				<h2>Details</h2>
				<dl class="facts">
					<dt>When</dt>
					<dd>{forecastWindow(f.window_start, f.window_end)} (Nairobi time)</dd>
					<dt>Peak rain</dt>
					<dd>{f.peak_mm} mm in 3 hours</dd>
					<dt>Models agreeing</dt>
					<dd>{f.agree} of 3</dd>
					{#if data.models.length}
						<dt>By model</dt>
						<dd>
							<ul class="models">
								{#each data.models as m (m.model)}
									<li>{MODEL[m.model] ?? m.model}: {m.peak} mm</li>
								{/each}
							</ul>
						</dd>
					{/if}
					<dt>Area centre</dt>
					<dd><a href={osm(f.lat, f.lon)} target="_blank" rel="noopener">{coords(f.lat, f.lon)}</a> (OpenStreetMap)</dd>
					{#if f.approved_at}
						<dt>Warning sent</dt>
						<dd>{dayClock(f.approved_at)}</dd>
					{/if}
				</dl>
			</section>
		</main>
	{/if}
</div>

<style>
	:global(body) {
		background: var(--bg);
	}
	.sheet {
		width: calc(100% - 48px);
		max-width: 820px;
		margin: 24px auto;
		padding: 28px 32px 36px;
		border: 1px solid var(--line);
		border-radius: 14px;
		background: var(--surface);
	}
	@media (max-width: 600px) {
		.sheet {
			width: auto;
			margin: 0;
			padding: 18px 16px 28px;
			border: 0;
			border-radius: 0;
		}
	}
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 14px;
		padding-bottom: 16px;
		border-bottom: 2px solid var(--ink);
	}
	.grow {
		flex: 1;
		min-width: 200px;
	}
	.kicker {
		font-size: 13px;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--red);
	}
	.body {
		display: flex;
		flex-direction: column;
		gap: 22px;
		padding-top: 20px;
		font-size: 15px;
		line-height: 1.5;
	}
	.title-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}
	h1 {
		font-size: 26px;
		font-weight: 800;
		line-height: 1.2;
	}
	h2 {
		margin-bottom: 10px;
		font-size: 13px;
		font-weight: 800;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.chips {
		display: flex;
		gap: 6px;
	}
	.lead {
		font-size: 17px;
	}
	.facts {
		display: grid;
		grid-template-columns: 150px minmax(0, 1fr);
		gap: 8px 16px;
		margin: 0;
	}
	.facts dt {
		color: var(--muted);
	}
	.facts dd {
		margin: 0;
		font-weight: 600;
	}
	@media (max-width: 480px) {
		.facts {
			grid-template-columns: minmax(0, 1fr);
			gap: 2px;
		}
		.facts dd {
			margin-bottom: 8px;
		}
	}
	.reports {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.report {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 12px 14px;
		border: 1px solid var(--line);
		border-radius: 10px;
		break-inside: avoid;
	}
	.note {
		font-style: italic;
	}
	.updates,
	.models {
		margin: 0;
		padding-left: 18px;
	}
	.sections {
		display: flex;
		flex-direction: column;
		gap: 22px;
	}

	/* Desktop: a wider sheet with the facts beside the reports. */
	@media (min-width: 1024px) {
		.sheet {
			margin: 32px auto 48px;
			padding: 32px 40px 40px;
		}
		.sheet.wide {
			max-width: 1120px;
		}
		h1 {
			font-size: 28px;
		}
		.sections {
			display: grid;
			grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
			grid-template-rows: auto 1fr;
			grid-template-areas: 'details reports' 'updates reports';
			gap: 22px 40px;
			align-items: start;
		}
		.details {
			grid-area: details;
		}
		.reports-col {
			grid-area: reports;
		}
		.updates-col {
			grid-area: updates;
		}
		.facts {
			grid-template-columns: 128px minmax(0, 1fr);
		}
	}

	@media print {
		:global(body) {
			background: #fff;
		}
		.sheet,
		.sheet.wide {
			width: auto;
			margin: 0;
			padding: 0;
			border: 0;
			max-width: none;
		}
		.sections {
			display: flex;
		}
		h2 {
			break-after: avoid;
		}
		.print {
			display: none;
		}
		a {
			color: inherit;
		}
	}
</style>
