<script lang="ts">
	import type { Snippet } from 'svelte';
	import { afterNavigate } from '$app/navigation';

	// Public page header: back (or close) button, optional title, optional actions on the right.
	// The back button returns to the previous page when the person came from inside the app,
	// otherwise it goes to `href` (e.g. someone who opened a link from an SMS).
	let {
		title,
		href = '/',
		close = false,
		smart = true,
		heading = false,
		children
	}: { title?: string; href?: string; close?: boolean; smart?: boolean; heading?: boolean; children?: Snippet } = $props();

	let cameFromApp = false;
	afterNavigate(({ from }) => {
		cameFromApp = !!from;
	});

	function back(e: MouseEvent) {
		if (!smart || !cameFromApp || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		e.preventDefault();
		history.back();
	}
</script>

<header class="topbar">
	<div class="row lead">
		<a class="icon-btn plain" {href} aria-label={close ? 'Close' : 'Back'} onclick={back}>
			{#if close}
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>
			{:else}
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
			{/if}
		</a>
		{#if title}
			{#if heading}<h1>{title}</h1>{:else}<span class="title">{title}</span>{/if}
		{/if}
	</div>
	{@render children?.()}
</header>

<style>
	.lead {
		gap: 8px;
		min-width: 0;
	}
	.title {
		font-size: 17px;
		font-weight: 800;
	}
	/* Desktop: the site header handles navigation, so pages show just their title. */
	@media (min-width: 1024px) {
		.lead > a {
			display: none;
		}
	}
</style>
