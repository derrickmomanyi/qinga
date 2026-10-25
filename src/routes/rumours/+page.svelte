<script lang="ts">
	import { onDestroy } from 'svelte';
	import { refreshAll } from '$app/navigation';
	import TopBar from '#lib/components/public/TopBar.svelte';
	import StatusChip from '#lib/components/StatusChip.svelte';
	import LiveRefresh from '#lib/components/LiveRefresh.svelte';
	import { post } from '#lib/api.ts';
	import { WHATSAPP_LABEL } from '#lib/constants.ts';
	import { whatsappShare } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let text = $state('');
	let file = $state<File | null>(null);
	let preview = $state<string | null>(null);
	let sending = $state(false);
	let error = $state<string | null>(null);
	let done = $state(false);

	function pickFile(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const picked = input.files?.[0] ?? null;
		if (preview) URL.revokeObjectURL(preview);
		file = picked;
		preview = picked ? URL.createObjectURL(picked) : null;
	}

	function clearFile() {
		if (preview) URL.revokeObjectURL(preview);
		file = null;
		preview = null;
	}

	onDestroy(clearFile);

	async function check(e: SubmitEvent) {
		e.preventDefault();
		error = null;
		if (!text.trim() && !file) {
			error = 'Paste the message, or add a screenshot.';
			document.getElementById('rumour')?.focus();
			return;
		}
		sending = true;
		const form = new FormData();
		form.set('text', text.trim());
		if (file) form.set('media', file);
		const res = await post<{ id: number }>('/api/rumours', form);
		sending = false;
		if (!res.ok) {
			error = res.error;
			return;
		}
		done = true;
		text = '';
		clearFile();
		refreshAll();
	}

	const correction = (r: { text: string; verdict: string | null }) =>
		whatsappShare(`FALSE: "${r.text}". ${r.verdict ?? ''} Checked by Qinga with Kenya Red Cross.`.replace(/\s+/g, ' '));
</script>

<svelte:head>
	<title>Is this true? · Qinga</title>
</svelte:head>

<LiveRefresh entities={['rumour']} />

<div class="phone rumours-page">
	<TopBar title="Is this true?" />

	<main class="content">
		<div class="split-even">
			<div class="check-col">
				<div class="stack intro">
					<h1 class="title">Heard something? Check it here.</h1>
					<p class="muted-ink">We check with Red Cross and tell you what's true.</p>
				</div>

				{#if done}
					<div class="card thanks" role="status">
						<b>Thanks. We're checking it.</b>
						<span class="muted-ink">It will show below when we know.</span>
						<button type="button" class="btn btn-outline btn-sm" onclick={() => (done = false)}>Check something else</button>
					</div>
				{:else}
					<form class="stack check-form" onsubmit={check}>
						<label for="rumour" class="sr-only">Message or link to check</label>
						<textarea id="rumour" class="textarea" rows="3" placeholder="Paste the message or link" bind:value={text}></textarea>
						{#if file && preview}
							<div class="shot">
								<img src={preview} alt="Your screenshot" />
								<span class="grow small">{file.name}</span>
								<button type="button" class="icon-btn plain" aria-label="Remove screenshot" onclick={clearFile}>
									<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>
								</button>
							</div>
						{/if}
						<div class="grid-2">
							<div class="pick">
								<input id="shot" type="file" accept="image/*" class="sr-only" onchange={pickFile} />
								<label for="shot" class="btn btn-outline">
									<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-8 8" /></svg>
									Screenshot
								</label>
							</div>
							<button type="submit" class="btn btn-red" disabled={sending}>{sending ? 'Sending…' : 'Check'}</button>
						</div>
						{#if error}<p class="error" role="alert">{error}</p>{/if}
						<p class="small muted center">Or forward it on WhatsApp to {WHATSAPP_LABEL}</p>
					</form>
				{/if}
			</div>

			<section class="stack recent" aria-labelledby="recent-title">
				<h2 id="recent-title" class="h2">Recently checked</h2>
				{#each data.rumours as r (r.id)}
					{#if r.status === 'true' && r.incident_id}
						<a class="card item link" href="/incidents/{r.incident_id}">
							<StatusChip status="true" />
							<span class="item-title">{r.text}</span>
							<span class="verdict">{r.verdict}</span>
						</a>
					{:else}
						<div class="card item">
							<StatusChip status={r.status} />
							<span class="item-title">{r.text}</span>
							<span class="verdict">{r.status === 'checking' ? 'Our team is checking with Red Cross.' : r.verdict}</span>
							{#if r.status === 'false'}
								<a class="correction" href={correction(r)} target="_blank" rel="noopener">Share the correction</a>
							{/if}
						</div>
					{/if}
				{:else}
					<p class="muted">Nothing checked yet.</p>
				{/each}
			</section>
		</div>
	</main>
</div>

<style>
	.content {
		gap: 20px;
		padding-top: 20px;
	}
	.intro {
		gap: 6px;
	}
	.title {
		font-size: 24px;
		font-weight: 800;
		line-height: 1.2;
	}
	.muted-ink {
		font-size: 15px;
		line-height: 1.45;
		color: var(--ink-2);
	}
	.textarea {
		resize: none;
	}
	.pick label {
		width: 100%;
		min-height: 50px;
		font-size: 15px;
		border-width: 1.5px;
	}
	.pick input:focus-visible + label {
		outline: 3px solid var(--ink);
		outline-offset: 2px;
	}
	.grid-2 .btn {
		min-height: 50px;
		font-size: 15px;
	}
	.shot {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 6px 6px 6px 8px;
		border: 1px solid var(--line);
		border-radius: 12px;
		background: var(--surface);
	}
	.shot img {
		width: 44px;
		height: 44px;
		object-fit: cover;
		border-radius: 8px;
	}
	.grow {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.center {
		text-align: center;
	}
	.thanks {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 8px;
		border: 2px solid var(--green);
	}
	.h2 {
		font-size: 16px;
		font-weight: 800;
	}
	.item {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 6px;
	}
	.item.link {
		color: var(--ink);
		text-decoration: none;
	}
	.item-title {
		font-size: 16px;
		font-weight: 700;
		line-height: 1.3;
	}
	.verdict {
		font-size: 14px;
		line-height: 1.4;
		color: var(--ink-2);
	}
	.correction {
		display: flex;
		align-items: center;
		min-height: 44px;
		font-size: 14px;
		font-weight: 700;
		text-decoration: none;
	}
	.check-col {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	/* Desktop: check form on the left (stays in view), recent checks on the right. */
	@media (min-width: 1024px) {
		.split-even {
			gap: 48px;
		}
		.check-col {
			position: sticky;
			top: calc(var(--nav-h) + 24px);
			gap: 24px;
		}
		.intro {
			gap: 10px;
		}
		.intro .muted-ink {
			font-size: 17px;
		}
		.check-form {
			gap: 14px;
			padding: 20px;
			border: 1px solid var(--line);
			border-radius: 16px;
			background: var(--surface);
		}
		.check-form .textarea {
			min-height: 140px;
		}
		.thanks {
			padding: 20px;
		}
		.recent {
			gap: 12px;
		}
		.h2 {
			font-size: 20px;
		}
		.item {
			padding: 16px 18px;
		}
		.item.link:hover {
			border-color: var(--ink);
		}
	}
</style>
