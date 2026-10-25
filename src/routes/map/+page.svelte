<script lang="ts">
	import { untrack } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import MapView from '#lib/components/MapView.svelte';
	import LiveRefresh from '#lib/components/LiveRefresh.svelte';
	import IncidentChips from '#lib/components/public/IncidentChips.svelte';
	import { CONTACTS, NAIROBI, TYPES, typeOf, type IncidentType } from '#lib/constants.ts';
	import { centerOf } from '#lib/geolocate.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Filter = 'all' | 'disaster' | 'accident' | 'fire';
	const FILTERS: { value: Filter; label: string }[] = [
		{ value: 'all', label: 'All' },
		{ value: 'disaster', label: 'Disasters' },
		{ value: 'accident', label: 'Accidents' },
		{ value: 'fire', label: 'Fire' }
	];
	const CALL_LABEL: Record<IncidentType, string> = {
		fire: 'Call fire brigade',
		accident: 'Call 999',
		disaster: 'Call Red Cross',
		unknown: 'Call 999'
	};

	const focus = Number(page.url.searchParams.get('focus')) || null;
	let filter = $state<Filter>('all');
	let selectedId = $state<number | null>(focus);

	// Closed incidents only show when someone opened the map from that incident.
	const visible = $derived(data.incidents.filter((i) => i.status === 'verified' || i.id === focus));
	const pins = $derived(visible.filter((i) => filter === 'all' || i.type === filter).map((i) => ({ ...i, href: `/incidents/${i.id}` })));
	const zones = $derived(
		filter === 'all' || filter === 'disaster'
			? data.forecasts.map((f) => ({
					lat: f.lat,
					lon: f.lon,
					name: f.area_name,
					kind: f.status === 'approved' ? ('warning' as const) : ('forecast' as const)
				}))
			: []
	);
	const selected = $derived(pins.find((i) => i.id === selectedId) ?? null);
	const primary = $derived(selected ? (CONTACTS[typeOf(selected.type)].find((c) => c.primary) ?? CONTACTS.unknown[0]) : null);

	// The map reads its centre once, when it first draws.
	const start = untrack(() => data.incidents.find((i) => i.id === focus));
	const center = start ? { lat: start.lat, lon: start.lon } : untrack(() => centerOf([...pins, ...zones], NAIROBI));

	let cameFromApp = false;
	afterNavigate(({ from }) => {
		cameFromApp = !!from;
	});
	function close(e: MouseEvent) {
		if (!cameFromApp || e.metaKey || e.ctrlKey) return;
		e.preventDefault();
		history.back();
	}
</script>

<svelte:head>
	<title>Map · Qinga</title>
</svelte:head>

<LiveRefresh entities={['incident', 'forecast']} />

<div class="phone">
	<div class="stage">
		<h1 class="sr-only">Map of alerts</h1>
		<MapView incidents={pins} {zones} height="100dvh" {center} zoom={start ? 15 : 12} {selectedId} onselect={(id) => (selectedId = id)} />

		<div class="top">
			<a class="round" href="/" aria-label="Close map" onclick={close}>
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>
			</a>
			<div class="filters" role="group" aria-label="Filter map">
				{#each FILTERS as f (f.value)}
					<button type="button" class="choice pill" aria-pressed={filter === f.value} onclick={() => (filter = f.value)}>{f.label}</button>
				{/each}
			</div>
		</div>

		<div class="bottom">
			<ul class="legend" aria-label="Map key">
				<li><span class="dot" style:background={TYPES.fire.color}></span>Fire · pulsing = extreme</li>
				<li><span class="dot" style:background={TYPES.accident.color}></span>Accident</li>
				<li><span class="sq" style:background={TYPES.disaster.color}></span>Weather warning</li>
				<li><span class="sq dashed"></span>Forecast</li>
			</ul>

			{#if selected && primary}
				<section class="sheet" aria-label="Selected incident" aria-live="polite">
					<span class="grabber" aria-hidden="true"></span>
					<div class="row head">
						<IncidentChips incident={selected} />
						<button type="button" class="icon-btn plain hide" aria-label="Hide details" onclick={() => (selectedId = null)}>
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
						</button>
					</div>
					<h2>{selected.title}</h2>
					<p>{selected.summary ?? selected.location_label}</p>
					<div class="grid-2">
						<a class="btn btn-red" href="tel:{primary.tel}">{CALL_LABEL[typeOf(selected.type)]}</a>
						<a class="btn btn-outline" href="/incidents/{selected.id}">View details</a>
					</div>
				</section>
			{:else}
				<p class="sheet hint">
					{#if pins.length}Tap a pin to see details.{:else}No verified alerts here right now.{/if}
				</p>
			{/if}
		</div>
	</div>
</div>

<style>
	.stage {
		position: relative;
		height: 100dvh;
		overflow: hidden;
	}
	.stage :global(.map) {
		border: 0;
		border-radius: 0;
	}
	/* Keep Leaflet's zoom buttons and credits clear of the overlays. */
	.stage :global(.leaflet-top.leaflet-left) {
		top: 62px;
	}
	.stage :global(.leaflet-bottom.leaflet-right) {
		top: 62px;
		bottom: auto;
	}
	.top {
		position: absolute;
		top: 12px;
		left: 12px;
		right: 12px;
		z-index: 10;
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.round {
		flex: 0 0 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		border-radius: 999px;
		background: var(--surface);
		color: var(--ink);
		box-shadow: 0 1px 4px rgba(20, 23, 28, 0.25);
	}
	.filters {
		display: flex;
		gap: 6px;
		overflow-x: auto;
		white-space: nowrap;
		padding: 2px;
	}
	.filters .choice {
		flex: 0 0 auto;
		padding: 0 12px;
		border-color: transparent;
		box-shadow: 0 1px 4px rgba(20, 23, 28, 0.2);
	}
	.bottom {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 10;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 10px;
		pointer-events: none;
	}
	.bottom > * {
		pointer-events: auto;
	}
	.legend {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin: 0 0 0 12px;
		padding: 8px 10px;
		list-style: none;
		border-radius: 10px;
		background: var(--surface);
		font-size: 12px;
		color: var(--ink-2);
		box-shadow: 0 1px 4px rgba(20, 23, 28, 0.2);
	}
	.legend li {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.dot,
	.sq {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}
	.sq {
		border-radius: 2px;
	}
	.sq.dashed {
		border: 2px dashed var(--forecast);
	}
	.sheet {
		align-self: stretch;
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 10px 16px calc(22px + env(safe-area-inset-bottom));
		border-radius: 20px 20px 0 0;
		background: var(--surface);
		box-shadow: 0 -4px 16px rgba(20, 23, 28, 0.15);
	}
	.sheet.hint {
		padding-top: 18px;
		text-align: center;
		font-size: 15px;
		color: var(--ink-2);
	}
	.grabber {
		align-self: center;
		width: 40px;
		height: 4px;
		border-radius: 999px;
		background: var(--line);
	}
	.head {
		justify-content: space-between;
	}
	.hide {
		margin: -6px -8px -6px 0;
	}
	.sheet h2 {
		font-size: 20px;
		font-weight: 800;
	}
	.sheet p {
		font-size: 15px;
		color: var(--ink-2);
	}
	.grid-2 {
		margin-top: 4px;
	}
</style>
