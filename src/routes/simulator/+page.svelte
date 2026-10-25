<script lang="ts">
	import { tick } from 'svelte';
	import TopBar from '#lib/components/public/TopBar.svelte';
	import Logo from '#lib/components/Logo.svelte';
	import { getJson, post } from '#lib/api.ts';
	import { geolocate } from '#lib/geolocate.ts';
	import { SHORTCODE_LABEL, WHATSAPP_LABEL, clock } from '#lib/constants.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Channel = 'sms' | 'whatsapp';
	type Message = { id: number; direction: 'in' | 'out'; channel: Channel; body: string; status: string; created_at: string };

	const QUICK_FILLS = ['ACCIDENT Thika Rd Roysambu', 'FIRE Gikomba market', 'JOIN Mathare', 'STOP', 'CHECK Fire at Toi market'];

	let phone = $state('0712 000 111');
	let tab = $state<Channel>('sms');
	let messages = $state<Message[]>([]);
	let loadError = $state<string | null>(null);

	let text = $state('');
	let sending = $state(false);
	let sendError = $state<string | null>(null);

	// WhatsApp extras
	let location = $state<{ lat: number; lon: number; name: string } | null>(null);
	let locating = $state(false);
	let locError = $state<string | null>(null);
	let photo = $state<File | null>(null);

	let log = $state<HTMLDivElement>();

	const shown = $derived(
		messages
			.filter((m) => m.channel === tab)
			.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id)
	);
	const validNumber = $derived(phone.replace(/\D/g, '').length >= 9);

	let request = 0;
	async function refresh() {
		const number = phone.trim();
		const id = ++request;
		if (number.replace(/\D/g, '').length < 9) {
			messages = [];
			return;
		}
		try {
			const res = await getJson<{ messages: Message[] }>(`/api/messages?phone=${encodeURIComponent(number)}`);
			if (id !== request) return;
			messages = res.messages;
			loadError = null;
		} catch {
			if (id === request) loadError = "Couldn't load messages.";
		}
	}

	// Poll every 2 s while the page is open; restart when the number changes.
	$effect(() => {
		void phone;
		refresh();
		const timer = setInterval(() => {
			if (!document.hidden) refresh();
		}, 2000);
		return () => clearInterval(timer);
	});

	// Keep the newest message in view.
	$effect(() => {
		void shown.length;
		void tab;
		tick().then(() => {
			if (log) log.scrollTop = log.scrollHeight;
		});
	});

	async function send(e: SubmitEvent) {
		e.preventDefault();
		sendError = null;
		const body = text.trim();
		const hasExtras = tab === 'whatsapp' && (photo || location);
		if (!validNumber) {
			sendError = 'Enter a phone number first.';
			document.getElementById('sim-phone')?.focus();
			return;
		}
		if (!body && !hasExtras) return;

		sending = true;
		let res;
		if (tab === 'sms') {
			res = await post<{ reply: string }>('/api/inbound/sms', { from: phone.trim(), text: body });
		} else {
			const form = new FormData();
			form.set('from', phone.trim());
			form.set('text', body);
			if (location) {
				form.set('lat', String(location.lat));
				form.set('lon', String(location.lon));
			}
			if (photo) form.set('media', photo);
			res = await post<{ reply: string }>('/api/inbound/whatsapp', form);
		}
		sending = false;
		if (!res.ok) {
			sendError = res.error;
			return;
		}
		text = '';
		location = null;
		removePhoto();
		await refresh();
	}

	async function fill(value: string) {
		text = value;
		await tick();
		document.getElementById('compose')?.focus();
	}

	async function shareLocation() {
		locError = null;
		locating = true;
		try {
			const coords = await geolocate();
			location = { ...coords, name: 'My location' };
		} catch {
			locError = "Couldn't get your location. Pick an area.";
		} finally {
			locating = false;
		}
	}

	function pickArea(e: Event) {
		const select = e.currentTarget as HTMLSelectElement;
		const area = data.areas.find((a) => String(a.id) === select.value);
		if (area) location = { lat: area.lat, lon: area.lon, name: area.name };
		select.value = '';
	}

	function pickPhoto(e: Event) {
		photo = (e.currentTarget as HTMLInputElement).files?.[0] ?? null;
	}

	function removePhoto() {
		photo = null;
		const input = document.getElementById('sim-photo') as HTMLInputElement | null;
		if (input) input.value = '';
	}
</script>

<svelte:head>
	<title>Text Qinga · demo phone</title>
</svelte:head>

<div class="page">
	<TopBar title="Text Qinga" heading />

	<main class="main">
		<p class="banner" role="note">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></svg>
			Demo phone — simulates someone texting Qinga
		</p>

		<div class="layout">
			<section class="device" aria-label="Demo phone">
				<div class="field">
					<label for="sim-phone">Your number</label>
					<input id="sim-phone" class="input" type="tel" inputmode="tel" bind:value={phone} autocomplete="off" />
				</div>

				<div class="tabs" role="tablist" aria-label="Channel">
					<button type="button" role="tab" id="tab-sms" aria-selected={tab === 'sms'} aria-controls="sim-pane" onclick={() => (tab = 'sms')}>SMS</button>
					<button type="button" role="tab" id="tab-whatsapp" aria-selected={tab === 'whatsapp'} aria-controls="sim-pane" onclick={() => (tab = 'whatsapp')}>WhatsApp</button>
				</div>

				<div class="screen" class:wa={tab === 'whatsapp'} id="sim-pane" role="tabpanel" aria-labelledby="tab-{tab}">
					<div class="to">
						{#if tab === 'sms'}
							To: {SHORTCODE_LABEL}
						{:else}
							<span class="wa-avatar"><Logo size={22} wordmark={false} /></span>
							<span><b>Qinga</b><br /><span class="small muted">{WHATSAPP_LABEL}</span></span>
						{/if}
					</div>

					<div class="log" bind:this={log} role="log" aria-live="polite" aria-label="Conversation">
						{#each shown as m (m.id)}
							<div class="msg {m.direction}">
								<span class="bubble">{m.body}</span>
								<span class="meta">{clock(m.created_at)}{m.status === 'failed' ? ' · not delivered' : ''}</span>
							</div>
						{:else}
							<p class="empty">{validNumber ? 'No messages yet. Try one of the examples below.' : 'Enter a phone number to start.'}</p>
						{/each}
					</div>

					{#if tab === 'whatsapp'}
						<div class="extras">
							{#if location}
								<span class="attached">
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="9" r="2.5" /></svg>
									Location: {location.name}
									<button type="button" class="x" aria-label="Remove location" onclick={() => (location = null)}>×</button>
								</span>
							{:else}
								<button type="button" class="btn btn-quiet btn-sm" onclick={shareLocation} disabled={locating}>
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="9" r="2.5" /></svg>
									{locating ? 'Finding…' : 'Share location'}
								</button>
								<label for="sim-area" class="sr-only">Or pick an area as the location</label>
								<select id="sim-area" class="select sm" onchange={pickArea}>
									<option value="">or pick area</option>
									{#each data.areas as a (a.id)}<option value={String(a.id)}>{a.name}</option>{/each}
								</select>
							{/if}
							{#if photo}
								<span class="attached">
									Photo: <span class="fname">{photo.name}</span>
									<button type="button" class="x" aria-label="Remove photo" onclick={removePhoto}>×</button>
								</span>
							{:else}
								<span class="pick">
									<input id="sim-photo" type="file" accept="image/*,video/*" class="sr-only" onchange={pickPhoto} />
									<label for="sim-photo" class="btn btn-quiet btn-sm">
										<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
										Photo
									</label>
								</span>
							{/if}
							{#if locError}<p class="small loc-error" role="alert">{locError}</p>{/if}
						</div>
					{/if}

					<form class="compose" onsubmit={send}>
						<label for="compose" class="sr-only">Message</label>
						<input id="compose" class="input" bind:value={text} placeholder={tab === 'sms' ? 'Text message' : 'Message'} autocomplete="off" />
						<button type="submit" class="btn btn-dark send" disabled={sending} aria-label="Send">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12l16-8-6 16-2-6z" /></svg>
						</button>
					</form>
				</div>

				{#if sendError}<p class="error" role="alert">{sendError}</p>{/if}
				{#if loadError}<p class="small muted">{loadError}</p>{/if}

				<div class="stack">
					<span class="label">Try</span>
					<div class="row wrap fills">
						{#each QUICK_FILLS as q (q)}
							<button type="button" class="choice pill" onclick={() => fill(q)}>{q}</button>
						{/each}
					</div>
				</div>
			</section>

			<aside class="card help" aria-labelledby="help-title">
				<h2 id="help-title" class="section-title">What you can text</h2>
				<dl>
					<dt>ACCIDENT, FIRE or DISASTER + where</dt>
					<dd>Report what's happening. Example: FIRE Gikomba market</dd>
					<dt>JOIN + your area</dt>
					<dd>Get verified alerts for that area. Example: JOIN Mathare</dd>
					<dt>STOP</dt>
					<dd>Stop alerts.</dd>
					<dt>CHECK + the message</dt>
					<dd>Ask if something you heard is true.</dd>
				</dl>
				<p class="small muted">Kiswahili works too: MOTO, AJALI, JIUNGE, ACHA, UKWELI.</p>
				<p class="small muted">On WhatsApp you can also send a photo and your location.</p>
			</aside>
		</div>
	</main>
</div>

<style>
	.page {
		min-height: 100dvh;
		background: var(--bg);
	}
	.main {
		max-width: 980px;
		margin: 0 auto;
		padding: 16px 16px 40px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.banner {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		border: 1.5px dashed var(--ink-2);
		border-radius: 12px;
		background: var(--surface);
		font-size: 14px;
		font-weight: 700;
	}
	.layout {
		display: grid;
		gap: 20px;
		align-items: start;
	}
	@media (min-width: 820px) {
		.layout {
			grid-template-columns: minmax(0, 440px) minmax(0, 1fr);
		}
	}
	.device {
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 0;
	}
	.tabs {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 4px;
		padding: 4px;
		border-radius: 12px;
		background: var(--line-soft);
	}
	.tabs button {
		min-height: 44px;
		border: 0;
		border-radius: 9px;
		background: transparent;
		font-size: 15px;
		font-weight: 600;
		cursor: pointer;
	}
	.tabs button[aria-selected='true'] {
		background: var(--ink);
		color: #fff;
		font-weight: 700;
	}
	/* SMS looks like a basic phone screen; WhatsApp like a smartphone chat. */
	.screen {
		display: flex;
		flex-direction: column;
		border: 10px solid #2b2f36;
		border-radius: 26px;
		background: #dce3d3;
		overflow: hidden;
	}
	.screen.wa {
		border-color: var(--ink);
		background: var(--bg);
	}
	.to {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 44px;
		padding: 8px 12px;
		font-family: 'IBM Plex Mono', ui-monospace, monospace;
		font-size: 13px;
		color: var(--ink-2);
		border-bottom: 1px solid rgba(20, 23, 28, 0.12);
	}
	.wa .to {
		font-family: inherit;
		font-size: 14px;
		line-height: 1.2;
		color: var(--ink);
		background: var(--surface);
	}
	.wa-avatar {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: 1px solid var(--line);
		border-radius: 999px;
	}
	.log {
		height: 360px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 12px;
		font-family: 'IBM Plex Mono', ui-monospace, monospace;
		font-size: 13px;
		line-height: 1.45;
	}
	.wa .log {
		font-family: inherit;
		font-size: 14px;
	}
	.msg {
		display: flex;
		flex-direction: column;
		max-width: 85%;
		gap: 2px;
	}
	.msg.in {
		align-self: flex-end;
		align-items: flex-end;
	}
	.msg.out {
		align-self: flex-start;
	}
	.bubble {
		padding: 8px 10px;
		border-radius: 8px;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.in .bubble {
		background: #fff;
	}
	.out .bubble {
		background: #c3ccb8;
	}
	.wa .in .bubble {
		background: #dcfce7;
	}
	.wa .out .bubble {
		background: var(--surface);
	}
	.meta {
		font-size: 11px;
		color: var(--ink-2);
	}
	.empty {
		margin: auto;
		text-align: center;
		color: var(--ink-2);
	}
	.extras {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		padding: 8px 10px;
		border-top: 1px solid var(--line);
		background: var(--surface);
	}
	.select.sm {
		width: auto;
		min-height: 44px;
		font-size: 14px;
	}
	.pick input:focus-visible + label {
		outline: 3px solid var(--ink);
		outline-offset: 2px;
	}
	.attached {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		max-width: 100%;
		padding: 0 4px 0 10px;
		border-radius: 999px;
		background: var(--green-tint);
		font-size: 13px;
		font-weight: 600;
	}
	.fname {
		max-width: 140px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.x {
		width: 44px;
		height: 44px;
		border: 0;
		background: transparent;
		font-size: 20px;
		cursor: pointer;
	}
	.loc-error {
		flex-basis: 100%;
		color: #991b1b;
	}
	.compose {
		display: flex;
		gap: 8px;
		padding: 10px;
		border-top: 1px solid rgba(20, 23, 28, 0.12);
		background: var(--surface);
	}
	.send {
		flex: 0 0 52px;
		padding: 0;
	}
	.fills {
		gap: 8px;
	}
	.fills .choice {
		font-family: 'IBM Plex Mono', ui-monospace, monospace;
		font-size: 13px;
	}
	.help {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 18px;
	}
	.help dl {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.help dt {
		margin-top: 8px;
		font-family: 'IBM Plex Mono', ui-monospace, monospace;
		font-size: 14px;
		font-weight: 700;
	}
	.help dd {
		margin: 0;
		font-size: 14px;
		line-height: 1.45;
		color: var(--ink-2);
	}
</style>
