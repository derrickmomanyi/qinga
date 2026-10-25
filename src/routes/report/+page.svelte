<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import TopBar from '#lib/components/public/TopBar.svelte';
	import TypeIcon from '#lib/components/TypeIcon.svelte';
	import { post, getJson } from '#lib/api.ts';
	import { geolocate } from '#lib/geolocate.ts';
	import { CASUALTIES, REPORT_TYPES, SEVERITIES, SHORTCODE_LABEL, TYPES, WHATSAPP_LABEL, type IncidentType } from '#lib/constants.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const MAX_BYTES = 25 * 1024 * 1024;
	const KIND: Record<string, string> = { disaster: 'disaster', accident: 'accident', fire: 'fire' };

	// Details
	let type = $state<IncidentType | null>(null);
	let subtype = $state<string | null>(null);
	let severity = $state<string | null>(null);
	let casualties = $state<string | null>(null);
	let note = $state('');
	let file = $state<File | null>(null);
	let preview = $state<string | null>(null);

	// Where
	let place = $state<{ lat: number; lon: number; name: string } | null>(null);
	let areaId = $state('');
	let landmark = $state('');
	let locating = $state(false);
	let locError = $state<string | null>(null);

	// Who
	let phone = $state('');
	let anonymous = $state(false);

	// Sending
	let sending = $state(false);
	let error = $state<string | null>(null);

	// Quick report
	let quick = $state<'idle' | 'locating' | 'need-area' | 'sending'>('idle');
	let quickArea = $state('');
	let quickError = $state<string | null>(null);

	const areaName = $derived(data.areas.find((a) => String(a.id) === areaId)?.name ?? null);

	function chooseType(t: IncidentType) {
		if (type !== t) subtype = null;
		type = t;
	}

	function addContact(form: FormData) {
		if (anonymous) form.set('anonymous', 'on');
		else if (phone.trim()) form.set('phone', phone.trim());
	}

	function sent(ref: string) {
		return goto(`/report/sent/${encodeURIComponent(ref)}`);
	}

	async function quickReport() {
		quickError = null;
		quick = 'locating';
		let coords;
		try {
			coords = await geolocate();
		} catch {
			quick = 'need-area';
			await tick();
			document.getElementById('quick-area')?.focus();
			return;
		}
		await sendQuick({ lat: String(coords.lat), lon: String(coords.lon) });
	}

	async function sendQuick(where: Record<string, string>) {
		quick = 'sending';
		const form = new FormData();
		form.set('quick', 'true');
		for (const [k, v] of Object.entries(where)) form.set(k, v);
		addContact(form);
		const res = await post<{ ref: string }>('/api/reports', form);
		if (res.ok) return sent(res.data.ref);
		quickError = res.error;
		quick = where.area_id ? 'need-area' : 'idle';
	}

	function sendQuickWithArea(e: SubmitEvent) {
		e.preventDefault();
		if (!quickArea) {
			quickError = 'Choose your area.';
			return;
		}
		sendQuick({ area_id: quickArea });
	}

	async function useMyLocation() {
		locError = null;
		locating = true;
		try {
			const coords = await geolocate();
			let name = 'Your location';
			try {
				const g = await getJson<{ name?: string; areaId?: number | null; areaName?: string | null }>(
					`/api/geocode?lat=${coords.lat}&lon=${coords.lon}`
				);
				name = g.name || g.areaName || name;
				if (g.areaId) areaId = String(g.areaId);
			} catch {
				// Keep the generic name; the coordinates are what matter.
			}
			place = { ...coords, name };
		} catch {
			locError = "We couldn't get your location. Choose your area instead.";
		} finally {
			locating = false;
		}
	}

	function changePlace() {
		place = null;
		areaId = '';
	}

	function pickFile(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const picked = input.files?.[0] ?? null;
		error = null;
		if (picked && picked.size > MAX_BYTES) {
			error = 'Photo or video must be under 25 MB.';
			input.value = '';
			return;
		}
		if (preview) URL.revokeObjectURL(preview);
		file = picked;
		preview = picked ? URL.createObjectURL(picked) : null;
	}

	function removeFile() {
		if (preview) URL.revokeObjectURL(preview);
		file = null;
		preview = null;
		const input = document.getElementById('media') as HTMLInputElement | null;
		if (input) input.value = '';
	}

	onDestroy(() => {
		if (preview) URL.revokeObjectURL(preview);
	});

	const FIELD_TARGET: Record<string, string> = {
		type: 'type-disaster',
		subtype: 'type-disaster',
		media: 'media',
		phone: 'phone',
		location: 'use-location',
		lat: 'use-location',
		lon: 'use-location',
		area_id: 'area',
		location_label: 'landmark',
		note: 'note'
	};

	async function fail(message: string, field?: string) {
		error = message;
		sending = false;
		await tick();
		const target = field ? document.getElementById(FIELD_TARGET[field] ?? field) : null;
		(target ?? document.getElementById('form-error'))?.focus();
	}

	async function send(e: SubmitEvent) {
		e.preventDefault();
		error = null;
		if (!type) return fail('Choose what happened.', 'type');
		if (!place && !areaId) return fail('Tell us where: use your location or choose your area.', 'lat');

		sending = true;
		const form = new FormData();
		form.set('type', type);
		if (subtype) form.set('subtype', subtype);
		if (severity) form.set('severity', severity);
		if (casualties) form.set('casualties', casualties);
		if (note.trim()) form.set('note', note.trim());
		if (place) {
			form.set('lat', String(place.lat));
			form.set('lon', String(place.lon));
		}
		if (areaId) form.set('area_id', areaId);
		// Landmark plus the place name we found (or the chosen area), e.g. "near the footbridge, Roysambu".
		const where = place ? (place.name === 'Your location' ? null : place.name) : areaName;
		const label = [landmark.trim(), where].filter(Boolean).join(', ');
		if (label) form.set('location_label', label);
		addContact(form);
		if (file) form.set('media', file);

		const res = await post<{ ref: string }>('/api/reports', form);
		if (res.ok) return sent(res.data.ref);
		return fail(res.error, res.field);
	}
</script>

<svelte:head>
	<title>Report · Qinga</title>
</svelte:head>

<div class="phone">
	<TopBar title="Report" heading />

	<main class="content">
		<!-- Quick report: location only, details later. -->
		<div class="stack">
			<button type="button" class="quick" onclick={quickReport} disabled={quick === 'locating' || quick === 'sending'}>
				<span class="bolt">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>
				</span>
				<span class="grow">
					<b>Quick report</b><br />
					<span class="sub" aria-live="polite">
						{#if quick === 'locating'}Finding your location…{:else if quick === 'sending'}Sending…{:else}No time? Send your location now. Add details later.{/if}
					</span>
				</span>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
			</button>

			{#if quick === 'need-area' || (quick === 'sending' && quickArea)}
				<form class="card stack" onsubmit={sendQuickWithArea}>
					<label for="quick-area" class="label">We couldn't get your location. Where are you?</label>
					<select id="quick-area" class="select" bind:value={quickArea}>
						<option value="">Choose your area</option>
						{#each data.areas as a (a.id)}<option value={String(a.id)}>{a.name}</option>{/each}
					</select>
					<button type="submit" class="btn btn-red" disabled={quick === 'sending'}>
						{quick === 'sending' ? 'Sending…' : 'Send quick report'}
					</button>
				</form>
			{/if}
			{#if quickError}<p class="error" role="alert">{quickError}</p>{/if}
		</div>

		<div class="divider"><span></span>or tell us more<span></span></div>

		<form class="stack form" onsubmit={send} novalidate>
			<section class="stack" aria-labelledby="what-title">
				<h2 id="what-title" class="section-title">What happened?</h2>
				<div class="grid-3">
					{#each REPORT_TYPES as t (t)}
						<button type="button" id="type-{t}" class="choice type" aria-pressed={type === t} onclick={() => chooseType(t)}>
							<span class="type-icon" class:on={type === t}><TypeIcon type={t} size={26} /></span>
							{TYPES[t].label}
						</button>
					{/each}
				</div>
			</section>

			{#if type && TYPES[type].subtypes.length}
				<section class="stack" aria-labelledby="kind-title">
					<h2 id="kind-title" class="section-title">What kind of {KIND[type]}?</h2>
					<div class="row wrap pills">
						{#each TYPES[type].subtypes as s (s)}
							<button type="button" class="choice pill" aria-pressed={subtype === s} onclick={() => (subtype = subtype === s ? null : s)}>{s}</button>
						{/each}
					</div>
				</section>
			{/if}

			<section class="stack" aria-labelledby="serious-title">
				<h2 id="serious-title" class="section-title">How serious?</h2>
				<div class="grid-3">
					{#each SEVERITIES as s (s)}
						<button type="button" class="choice" aria-pressed={severity === s} onclick={() => (severity = severity === s ? null : s)}>{s}</button>
					{/each}
				</div>
			</section>

			<section class="stack" aria-labelledby="hurt-title">
				<h2 id="hurt-title" class="section-title">People hurt</h2>
				<div class="grid-5">
					{#each CASUALTIES as c (c)}
						<button type="button" class="choice tight" aria-pressed={casualties === c} onclick={() => (casualties = casualties === c ? null : c)}>{c}</button>
					{/each}
				</div>
			</section>

			<section class="stack" aria-labelledby="media-title">
				<h2 id="media-title" class="section-title">Photo or video</h2>
				<div class="grid-2">
					{#if file && preview}
						<div class="media">
							{#if file.type.startsWith('video/')}
								<video src={preview} muted playsinline controls class="media-thumb"></video>
							{:else}
								<img src={preview} alt="What you're sending" class="media-thumb" />
							{/if}
							<button type="button" class="remove" aria-label="Remove photo or video" onclick={removeFile}>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>
							</button>
						</div>
					{/if}
					<div class="add">
						<input id="media" type="file" accept="image/*,video/*" class="sr-only" onchange={pickFile} />
						<label for="media">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
							{file ? 'Change' : 'Add photo or video'}
						</label>
					</div>
				</div>
			</section>

			<section class="stack" aria-labelledby="where-title">
				<h2 id="where-title" class="section-title">Where?</h2>
				{#if place}
					<div class="place">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="9" r="2.5" /></svg>
						<span class="grow">{place.name}</span>
						<button type="button" class="link-btn" onclick={changePlace}>Change</button>
					</div>
				{:else}
					<button type="button" id="use-location" class="btn btn-quiet" onclick={useMyLocation} disabled={locating}>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="9" r="2.5" /></svg>
						{locating ? 'Finding you…' : 'Use my location'}
					</button>
					{#if locError}<p class="small hint" role="alert">{locError}</p>{/if}
					<div class="field">
						<label for="area" class="small-label">Or choose your area</label>
						<select id="area" class="select" bind:value={areaId}>
							<option value="">Choose area</option>
							{#each data.areas as a (a.id)}<option value={String(a.id)}>{a.name}</option>{/each}
						</select>
					</div>
				{/if}
				<div class="field">
					<label for="landmark" class="small-label">Landmark (optional)</label>
					<input id="landmark" class="input" bind:value={landmark} placeholder="e.g. near the footbridge" autocomplete="off" />
				</div>
			</section>

			<section class="field">
				<label for="note">Anything else? (optional)</label>
				<textarea id="note" class="textarea" rows="2" bind:value={note} placeholder="What did you see?"></textarea>
			</section>

			<section class="field">
				<label for="phone">Your phone number</label>
				<input id="phone" class="input" type="tel" inputmode="tel" autocomplete="tel" placeholder="07XX XXX XXX" bind:value={phone} disabled={anonymous} />
				<label class="check"><input type="checkbox" bind:checked={anonymous} />Report anonymously</label>
				<p class="small muted">With a number we can call to confirm. Anonymous reports take longer to check.</p>
			</section>

			{#if error}<p id="form-error" class="error" role="alert" tabindex="-1">{error}</p>{/if}

			<button type="submit" class="btn btn-red send" disabled={sending}>{sending ? 'Sending…' : 'Send report'}</button>
		</form>

		<p class="footer">
			No data? SMS <b>{SHORTCODE_LABEL}</b> or WhatsApp <b>{WHATSAPP_LABEL}</b><br />
			<b>In danger now?</b> Call <a href="tel:999">999</a> or <a href="tel:112">112</a>.
		</p>
	</main>
</div>

<style>
	.quick {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		min-height: 68px;
		padding: 12px 14px;
		border: 2px solid var(--red);
		border-radius: 14px;
		background: var(--red-tint);
		color: var(--ink);
		text-align: left;
		line-height: 1.35;
		cursor: pointer;
	}
	.quick:disabled {
		cursor: progress;
	}
	.quick b {
		font-size: 16px;
	}
	.sub {
		font-size: 13px;
		color: var(--ink-2);
	}
	.bolt {
		flex: 0 0 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		background: var(--red);
		color: #fff;
	}
	.grow {
		flex: 1;
		min-width: 0;
	}
	.divider {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 13px;
		font-weight: 600;
		color: var(--muted);
	}
	.divider span {
		flex: 1;
		height: 1px;
		background: var(--line);
	}
	.form {
		gap: 22px;
	}
	.type-icon {
		display: flex;
	}
	.type-icon.on {
		color: var(--red);
	}
	.pills {
		gap: 8px;
	}
	.tight {
		padding: 4px 2px;
		font-size: 13px;
	}
	.media {
		position: relative;
		height: 92px;
	}
	.remove {
		position: absolute;
		top: 6px;
		right: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: 0;
		border-radius: 999px;
		background: rgba(20, 23, 28, 0.8);
		color: #fff;
		cursor: pointer;
	}
	/* Enlarge the tap area of the small remove button to 44px. */
	.remove::after {
		content: '';
		position: absolute;
		inset: -6px;
	}
	.add label {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
		height: 92px;
		border: 2px dashed #9aa3af;
		border-radius: 12px;
		background: var(--surface);
		font-size: 14px;
		font-weight: 600;
		text-align: center;
		cursor: pointer;
	}
	.add input:focus-visible + label {
		outline: 3px solid var(--ink);
		outline-offset: 2px;
	}
	.place {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 56px;
		padding: 6px 6px 6px 12px;
		border: 1px solid var(--line);
		border-radius: 12px;
		background: var(--surface);
		font-size: 15px;
		font-weight: 600;
	}
	.link-btn {
		min-height: 44px;
		padding: 0 10px;
		border: 0;
		background: transparent;
		color: var(--red);
		font-size: 14px;
		font-weight: 700;
		cursor: pointer;
	}
	.small-label {
		font-size: 14px;
		font-weight: 600;
		color: var(--ink-2);
	}
	.hint {
		color: #991b1b;
	}
	.input:disabled {
		background: var(--line-soft);
		color: var(--muted);
	}
	.send {
		min-height: 56px;
		font-size: 17px;
	}
	.footer {
		font-size: 14px;
		line-height: 1.6;
		text-align: center;
		color: var(--ink-2);
	}
	.footer a {
		display: inline-block;
		padding: 10px 2px;
		margin: -10px 0;
		font-weight: 700;
	}
</style>
