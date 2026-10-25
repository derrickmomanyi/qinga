<script lang="ts">
	import { onMount } from 'svelte';
	import 'leaflet/dist/leaflet.css';
	import type { Map as LeafletMap, LayerGroup } from 'leaflet';
	import { NAIROBI, TYPES, typeOf } from '../constants.ts';

	export type MapIncident = { id: number; type: string; lat: number; lon: number; title: string; extreme?: number | boolean; href?: string };
	export type MapZone = { lat: number; lon: number; name: string; kind: 'forecast' | 'warning' };

	let {
		incidents = [],
		zones = [],
		height = '200px',
		zoom = 12,
		center = NAIROBI,
		interactive = true,
		selectedId = null,
		onselect
	}: {
		incidents?: MapIncident[];
		zones?: MapZone[];
		height?: string;
		zoom?: number;
		center?: { lat: number; lon: number };
		interactive?: boolean;
		selectedId?: number | null;
		onselect?: (id: number) => void;
	} = $props();

	let el: HTMLDivElement;
	let map: LeafletMap | undefined;
	let layer: LayerGroup | undefined;
	let L: typeof import('leaflet') | undefined;

	const icons: Record<string, string> = {
		fire: '<path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8.5z"/>',
		accident: '<path d="M3 17h18v-3l-2-5H5l-2 5z"/>',
		disaster: '<path d="M7 15a4 4 0 1 1 1-7.9A5 5 0 0 1 17.6 9 3.5 3.5 0 0 1 17 15z"/>',
		unknown: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'
	};

	function draw() {
		if (!L || !map || !layer) return;
		layer.clearLayers();
		for (const z of zones) {
			L.circle([z.lat, z.lon], {
				radius: 1200,
				color: '#1D4ED8',
				weight: 2,
				dashArray: z.kind === 'forecast' ? '6 6' : undefined,
				fillColor: '#2563EB',
				fillOpacity: z.kind === 'forecast' ? 0.06 : 0.2
			})
				.bindTooltip(`${z.kind === 'forecast' ? 'Forecast' : 'Warning'}: heavy rain · ${z.name}`)
				.addTo(layer);
		}
		for (const i of incidents) {
			const t = TYPES[typeOf(i.type)];
			const iconColor = i.type === 'accident' ? '#14171C' : '#FFFFFF';
			const size = i.id === selectedId ? 38 : 30;
			const html = `<div class="q-pin ${i.extreme ? 'q-pulse' : ''}" style="width:${size}px;height:${size}px;background:${t.color};color:${iconColor}">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${icons[typeOf(i.type)]}</svg></div>`;
			const marker = L.marker([i.lat, i.lon], {
				icon: L.divIcon({ html, className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2] }),
				title: i.title,
				keyboard: true
			}).addTo(layer);
			if (onselect) marker.on('click', () => onselect(i.id));
			else if (i.href) marker.bindPopup(`<a href="${i.href}" style="font-weight:700">${i.title}</a>`);
		}
	}

	onMount(() => {
		let cancelled = false;
		import('leaflet').then((mod) => {
			if (cancelled) return;
			L = mod.default ?? mod;
			map = L.map(el, {
				zoomControl: interactive,
				dragging: interactive,
				scrollWheelZoom: interactive,
				attributionControl: true
			}).setView([center.lat, center.lon], zoom);
			L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
				maxZoom: 19,
				attribution: '&copy; OpenStreetMap contributors'
			}).addTo(map);
			layer = L.layerGroup().addTo(map);
			draw();
		});
		return () => {
			cancelled = true;
			map?.remove();
		};
	});

	$effect(() => {
		// Redraw when the data changes (live updates).
		void incidents;
		void zones;
		void selectedId;
		draw();
	});
</script>

<div class="map" bind:this={el} style:height role="region" aria-label="Map of incidents and weather warnings"></div>

<style>
	.map {
		width: 100%;
		border-radius: 14px;
		overflow: hidden;
		border: 1px solid var(--line);
		background: #e8ebef;
		z-index: 0;
	}
</style>
