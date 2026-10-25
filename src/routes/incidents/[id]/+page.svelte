<script lang="ts">
	import { page } from '$app/state';
	import TopBar from '#lib/components/public/TopBar.svelte';
	import IncidentChips from '#lib/components/public/IncidentChips.svelte';
	import CallButtons from '#lib/components/CallButtons.svelte';
	import MapView from '#lib/components/MapView.svelte';
	import TypeIcon from '#lib/components/TypeIcon.svelte';
	import LiveRefresh from '#lib/components/LiveRefresh.svelte';
	import { TYPES, clock, typeOf } from '#lib/constants.ts';
	import { isVideo, mediaUrl, whatsappShare } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const incident = $derived(data.incident);
	const type = $derived(typeOf(incident.type));
	const t = $derived(TYPES[type]);
	const latest = $derived(data.updates[0] ?? null);
	const shareText = $derived(`${incident.title}. ${incident.summary ?? ''} Verified by Qinga: ${page.url.origin}${page.url.pathname}`.replace(/\s+/g, ' '));
	const pin = $derived([{ id: incident.id, type: incident.type, lat: incident.lat, lon: incident.lon, title: incident.title, extreme: incident.extreme }]);

	async function share() {
		const url = `${page.url.origin}${page.url.pathname}`;
		if (navigator.share) {
			try {
				await navigator.share({ title: incident.title, text: incident.summary ?? undefined, url });
				return;
			} catch {
				// Cancelled or not allowed: fall back to WhatsApp.
			}
		}
		window.open(whatsappShare(shareText), '_blank', 'noopener');
	}
</script>

<svelte:head>
	<title>{incident.title} · Qinga</title>
</svelte:head>

<LiveRefresh entities={['incident']} />

<div class="phone">
	<TopBar>
		<button type="button" class="icon-btn" aria-label="Share" onclick={share}>
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3" /><path d="M7 8l5-5 5 5" /><path d="M5 13v7h14v-7" /></svg>
		</button>
	</TopBar>

	<figure class="photo" style:background={data.photo ? '#4B5563' : t.tint} style:color={data.photo ? '#fff' : t.ink}>
		{#if data.photo}
			{#if isVideo(data.photo.path, data.photo.type)}
				<video src={mediaUrl(data.photo.path)} class="media-thumb blurred" muted playsinline preload="metadata" aria-hidden="true"></video>
			{:else}
				<img src={mediaUrl(data.photo.path)} alt="" class="media-thumb blurred" />
			{/if}
			<figcaption>Photo from a reporter · blurred for privacy</figcaption>
		{:else}
			<TypeIcon type={incident.type} size={48} stroke={1.6} />
			<figcaption class="sr-only">No photo</figcaption>
		{/if}
	</figure>

	<main class="content">
		<div class="stack">
			<IncidentChips {incident} all />
			<h1 class="big-title">{incident.title}</h1>
			{#if incident.summary}<p class="lead">{incident.summary}</p>{/if}
			{#if incident.advice}<p class="advice">{incident.advice}</p>{/if}
			{#if incident.status === 'closed'}<p class="closed">This is over. {clock(incident.closed_at)}</p>{/if}
		</div>

		{#if incident.verified_at}
			<div class="verified">
				<span class="check-dot">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
				</span>
				<span>
					Verified with Kenya Red Cross · {clock(incident.verified_at)}
					{#if incident.confirmed_by}<br /><span class="small">Confirmed by {incident.confirmed_by}</span>{/if}
				</span>
			</div>
		{/if}

		<section class="card" aria-label="Details">
			<dl class="details">
				<dt>What happened</dt>
				<dd>{incident.subtype ?? t.label}</dd>
				<dt>Where</dt>
				<dd>{incident.location_label}</dd>
				{#if incident.severity}
					<dt>How serious</dt>
					<dd>{incident.severity}</dd>
				{/if}
				{#if incident.casualties}
					<dt>People hurt</dt>
					<dd>{incident.casualties}</dd>
				{/if}
			</dl>
		</section>

		<div class="map-wrap">
			<MapView incidents={pin} height="140px" center={{ lat: incident.lat, lon: incident.lon }} zoom={15} interactive={false} />
			<a class="expand" href="/map?focus={incident.id}" aria-label="Full screen map">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5" /><path d="M20 9V4h-5" /><path d="M4 15v5h5" /><path d="M20 15v5h-5" /></svg>
			</a>
		</div>

		{#if latest}
			<div class="card latest" aria-live="polite">
				<span class="eyebrow">Latest · {clock(latest.created_at)}</span>
				{latest.text}
			</div>
		{/if}

		<section class="stack" aria-labelledby="call-title">
			<h2 id="call-title" class="h2">Who to call</h2>
			<CallButtons type={incident.type} />
			{#if type === 'accident'}
				<a class="more" href="/learn/first-aid">At the scene? First aid: Safe, Stimulate, Shout</a>
			{/if}
		</section>

		<a class="btn btn-outline share" href={whatsappShare(shareText)} target="_blank" rel="noopener">Share on WhatsApp</a>
	</main>
</div>

<style>
	.photo {
		position: relative;
		height: 170px;
		margin: 0;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.photo .media-thumb {
		position: absolute;
		inset: 0;
		border-radius: 0;
		transform: scale(1.1);
	}
	.photo figcaption:not(.sr-only) {
		position: relative;
		padding: 4px 10px;
		border-radius: 999px;
		background: rgba(20, 23, 28, 0.7);
		color: #fff;
		font-size: 13px;
		font-weight: 600;
	}
	.content {
		gap: 18px;
	}
	.lead {
		font-size: 17px;
		line-height: 1.45;
	}
	.advice {
		font-size: 15px;
		line-height: 1.45;
		color: var(--ink-2);
	}
	.closed {
		font-weight: 700;
		color: var(--ink-2);
	}
	.verified {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		font-size: 14px;
		line-height: 1.45;
		color: var(--ink-2);
	}
	.check-dot {
		flex: 0 0 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		background: var(--green);
		color: #fff;
	}
	.details {
		display: grid;
		grid-template-columns: 110px minmax(0, 1fr);
		gap: 8px 12px;
		margin: 0;
		font-size: 15px;
		line-height: 1.4;
	}
	.details dt {
		color: var(--muted);
	}
	.details dd {
		margin: 0;
		font-weight: 600;
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
	.latest {
		font-size: 15px;
		line-height: 1.45;
	}
	.eyebrow {
		display: block;
		margin-bottom: 4px;
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.h2 {
		font-size: 16px;
		font-weight: 800;
	}
	.more {
		display: flex;
		align-items: center;
		min-height: 44px;
		font-size: 15px;
		font-weight: 700;
		text-decoration: none;
	}
	.share {
		margin-top: auto;
		min-height: 54px;
	}
</style>
