<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { page } from '$app/state';
	import PublicNav from '#lib/components/public/PublicNav.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// The team desk has its own header; the Red Cross brief is a printable document.
	const publicPage = $derived(!page.url.pathname.startsWith('/team') && !page.url.pathname.startsWith('/brief'));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Qinga · Spot Danger, Okoa Maisha</title>
</svelte:head>

{#if publicPage}
	<PublicNav />
{/if}

{@render children()}
