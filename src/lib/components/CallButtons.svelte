<script lang="ts">
	import { CONTACTS, typeOf } from '../constants.ts';

	let { type, deaf = false }: { type: string; deaf?: boolean } = $props();
	const contacts = $derived(CONTACTS[typeOf(type)]);
</script>

<div class="stack">
	{#each contacts as c (c.tel)}
		<a class="call" class:primary={c.primary} href="tel:{c.tel}">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
			</svg>
			<span><small>{c.label}</small><b>Call {c.number}</b></span>
		</a>
	{/each}
	{#if deaf}
		<a class="call" href="/simulator">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="M4 5h16v11H9l-5 4z" />
				<path d="M8 10h8" />
			</svg>
			<span><small>Deaf or can't call?</small><b>SMS Qinga</b></span>
		</a>
	{/if}
</div>
