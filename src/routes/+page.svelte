<script lang="ts">
	import Logo from '#lib/components/Logo.svelte';
	import MapView from '#lib/components/MapView.svelte';
	import TypeIcon from '#lib/components/TypeIcon.svelte';
	import StatusChip from '#lib/components/StatusChip.svelte';
	import LiveRefresh from '#lib/components/LiveRefresh.svelte';
	import IncidentChips from '#lib/components/public/IncidentChips.svelte';
	import { NAIROBI, TYPES, typeOf } from '#lib/constants.ts';
	import { forecastWindow } from '#lib/format.ts';
	import { centerOf } from '#lib/geolocate.ts';
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// On desktop the map is large, so it can be panned and zoomed; on phones it stays a static preview.
	let wide = $state(false);
	onMount(() => {
		const mq = matchMedia('(min-width: 1024px)');
		const sync = () => (wide = mq.matches);
		sync();
		mq.addEventListener('change', sync);
		return () => mq.removeEventListener('change', sync);
	});

	const pins = $derived(
		data.incidents.filter((i) => i.status === 'verified').map((i) => ({ ...i, href: `/incidents/${i.id}` }))
	);
	const zones = $derived(
		data.forecasts.map((f) => ({
			lat: f.lat,
			lon: f.lon,
			name: f.area_name,
			kind: f.status === 'approved' ? ('warning' as const) : ('forecast' as const)
		}))
	);
	// Approved warnings before automatic forecasts.
	const weather = $derived([...data.forecasts].sort((a, b) => Number(b.status === 'approved') - Number(a.status === 'approved')));
	const empty = $derived(data.incidents.length === 0 && data.forecasts.length === 0);
</script>

<svelte:head>
	<title>Qinga · Verified alerts for Nairobi</title>
</svelte:head>

<LiveRefresh entities={['incident', 'forecast']} />

<div class="phone home">
	<header class="topbar home-top">
		<a href="/" class="home-link"><Logo size={34} /></a>
		<div class="row">
			<a class="icon-btn" href="/learn" aria-label="Safety tips">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h11" /></svg>
			</a>
			<span class="city">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="9" r="2.5" /></svg>
				Nairobi
			</span>
		</div>
	</header>

	<main class="content">
		<section class="map-section" aria-label="Map of active alerts">
			<div class="map-wrap">
				<MapView incidents={pins} {zones} height="190px" zoom={11} center={centerOf([...pins, ...zones], NAIROBI)} interactive={wide} />
				<a class="expand" href="/map" aria-label="Full screen map">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5" /><path d="M20 9V4h-5" /><path d="M4 15v5h5" /><path d="M20 15v5h-5" /></svg>
				</a>
			</div>
			<ul class="legend">
				<li><span class="dot" style:background={TYPES.fire.color}></span>Fire</li>
				<li><span class="dot" style:background={TYPES.accident.color}></span>Accident</li>
				<li><span class="sq" style:background={TYPES.disaster.color}></span>Weather</li>
				<li><span class="sq dashed"></span>Forecast</li>
				<li>Pulsing = extreme</li>
			</ul>
		</section>

		<a class="rumour" href="/rumours">
			<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
			<span class="grow"><b>Heard something on WhatsApp?</b><br /><span class="sub">Check if it's true</span></span>
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
		</a>

		<section class="stack" aria-labelledby="near-title">
			<h1 id="near-title" class="near-title">Near you</h1>

			{#each data.incidents as incident (incident.id)}
				{@const t = TYPES[typeOf(incident.type)]}
				<a class="card alert" href="/incidents/{incident.id}">
					<span class="tile" style:background={t.tint} style:color={t.ink}><TypeIcon type={incident.type} /></span>
					<span class="body">
						<IncidentChips {incident} />
						<span class="title">{incident.title}</span>
						<span class="summary">{incident.summary ?? incident.location_label}</span>
					</span>
				</a>
			{/each}

			{#each weather as f (f.id)}
				{@const approved = f.status === 'approved'}
				<div class="card alert" class:forecast={!approved}>
					<span class="tile" style:background={approved ? TYPES.disaster.tint : '#EFF6FF'} style:color={TYPES.disaster.ink}>
						<TypeIcon type="disaster" />
					</span>
					<span class="body">
						<span class="chips">
							{#if approved}<StatusChip status="warning" />{:else}<StatusChip status="forecast" />{/if}
						</span>
						<span class="title">{approved ? 'Heavy rain' : 'Heavy rain likely'} · {f.area_name}</span>
						<span class="summary">{forecastWindow(f.window_start, f.window_end)}.{approved ? ' Keep away from rivers.' : ''}</span>
					</span>
				</div>
			{/each}

			{#if empty}
				<div class="card empty">
					<b>All clear</b>
					<span class="muted">No verified alerts near you right now.</span>
				</div>
			{/if}
		</section>
	</main>

	<nav class="actions" aria-label="Report or get alerts">
		<a class="btn btn-red" href="/report">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
			Report
		</a>
		<a class="btn btn-green" href="/subscribe">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
			Get SMS alerts
		</a>
	</nav>
</div>

<style>
	.home-link {
		display: inline-flex;
		min-height: 44px;
		align-items: center;
		color: inherit;
		text-decoration: none;
	}
	.city {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 44px;
		padding: 0 12px;
		border: 1px solid var(--line);
		border-radius: 999px;
		font-size: 14px;
		font-weight: 600;
	}
	.content {
		gap: 14px;
		padding-top: 12px;
	}
	.map-wrap {
		position: relative;
	}
	.expand {
		position: absolute;
		right: 10px;
		bottom: 10px;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		border-radius: 10px;
		background: var(--surface);
		color: var(--ink);
		box-shadow: 0 1px 4px rgba(20, 23, 28, 0.25);
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 6px 14px;
		margin: 0;
		padding: 8px 2px 0;
		list-style: none;
		font-size: 12px;
		color: var(--muted);
	}
	.legend li {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.dot,
	.sq {
		width: 12px;
		height: 12px;
		border-radius: 50%;
	}
	.sq {
		border-radius: 3px;
	}
	.sq.dashed {
		border: 2px dashed var(--forecast);
	}
	.rumour {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 56px;
		padding: 10px 14px;
		border-radius: 12px;
		background: var(--ink);
		color: #fff;
		text-decoration: none;
		font-size: 15px;
		line-height: 1.35;
	}
	.rumour .sub {
		font-size: 13px;
		color: #cbd5e1;
	}
	.grow {
		flex: 1;
	}
	.near-title {
		padding-top: 4px;
		font-size: 18px;
		font-weight: 800;
	}
	.alert {
		display: flex;
		gap: 12px;
		color: var(--ink);
		text-decoration: none;
	}
	.alert.forecast {
		border: 1.5px dashed var(--forecast);
	}
	.tile {
		flex: 0 0 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 10px;
	}
	.body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.chips {
		display: flex;
		gap: 6px;
	}
	.title {
		font-size: 16px;
		font-weight: 700;
		line-height: 1.3;
	}
	.summary {
		font-size: 14px;
		line-height: 1.4;
		color: var(--ink-2);
	}
	.empty {
		display: flex;
		flex-direction: column;
		gap: 4px;
		text-align: center;
		padding: 22px 14px;
	}
	.actions {
		position: sticky;
		bottom: 0;
		z-index: 500;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
		padding: 12px 16px calc(16px + env(safe-area-inset-bottom));
		background: var(--surface);
		border-top: 1px solid var(--line);
	}
	.actions .btn {
		padding: 0 10px;
		white-space: nowrap;
	}

	/* Tablet: taller map inside the centred card. */
	@media (min-width: 768px) {
		.map-section :global(.map) {
			height: 300px !important;
		}
	}

	/* Desktop: big live map on the left, alerts on the right; the site header carries Report / Get SMS alerts. */
	@media (min-width: 1024px) {
		.phone.home {
			max-width: 1440px;
			margin: 0 auto;
			border: 0;
			border-radius: 0;
			box-shadow: none;
			overflow: visible;
		}
		.home-top,
		.actions {
			display: none;
		}
		.content {
			display: grid;
			grid-template-columns: minmax(0, 1fr) 420px;
			grid-template-rows: auto 1fr;
			gap: 16px 24px;
			align-items: start;
			padding: 24px;
		}
		.map-section {
			grid-row: 1 / span 2;
			position: sticky;
			top: calc(var(--nav-h) + 24px);
		}
		.map-section :global(.map) {
			height: calc(100dvh - var(--nav-h) - 96px) !important;
			min-height: 460px;
		}
		.near-title {
			padding-top: 8px;
		}
	}
</style>
