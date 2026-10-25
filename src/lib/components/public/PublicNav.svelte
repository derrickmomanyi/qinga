<script lang="ts">
	import { page } from '$app/state';
	import Logo from '#lib/components/Logo.svelte';

	// Desktop / large-tablet header for the public site. Phones use each page's own top bar.
	const links = [
		{ href: '/', label: 'Live map' },
		{ href: '/rumours', label: 'Is this true?' },
		{ href: '/learn', label: 'Safety tips' },
		{ href: '/simulator', label: 'Demo phone' }
	];

	const current = (href: string) =>
		href === '/' ? page.url.pathname === '/' || page.url.pathname.startsWith('/map') : page.url.pathname.startsWith(href);
</script>

<header class="public-nav">
	<div class="inner">
		<a class="brand" href="/" aria-label="Qinga home"><Logo size={34} /></a>
		<nav aria-label="Main">
			{#each links as link (link.href)}
				<a href={link.href} aria-current={current(link.href) ? 'page' : undefined}>{link.label}</a>
			{/each}
		</nav>
		<div class="actions">
			<a class="team-link" href="/team">Team desk</a>
			<a class="btn btn-green btn-sm" href="/subscribe">Get SMS alerts</a>
			<a class="btn btn-red btn-sm" href="/report">Report</a>
		</div>
	</div>
</header>

<style>
	.public-nav {
		display: none;
		position: sticky;
		top: 0;
		z-index: 900;
		background: var(--surface);
		border-bottom: 1px solid var(--line);
	}
	@media (min-width: 1024px) {
		.public-nav {
			display: block;
		}
	}
	.inner {
		max-width: 1440px;
		height: var(--nav-h);
		margin: 0 auto;
		padding: 0 24px;
		display: flex;
		align-items: center;
		gap: 28px;
	}
	.brand {
		display: inline-flex;
		color: inherit;
		text-decoration: none;
	}
	nav {
		display: flex;
		gap: 4px;
		flex: 1;
	}
	nav a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 0 14px;
		border-radius: 8px;
		color: var(--ink);
		font-size: 15px;
		font-weight: 600;
		text-decoration: none;
	}
	nav a:hover {
		background: var(--bg);
	}
	nav a[aria-current='page'] {
		background: var(--ink);
		color: #fff;
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.team-link {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 0 10px;
		color: var(--muted);
		font-size: 14px;
		font-weight: 600;
		text-decoration: none;
	}
	.team-link:hover {
		color: var(--ink);
	}
</style>
