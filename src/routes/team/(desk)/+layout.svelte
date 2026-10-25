<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Logo from '#lib/components/Logo.svelte';
	import LiveRefresh from '#lib/components/LiveRefresh.svelte';
	import Toast from '#lib/components/team/Toast.svelte';
	import { post } from '#lib/api.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const nav = $derived([
		{ href: '/team', label: 'Incidents', count: 0, hint: '' },
		{ href: '/team/forecasts', label: 'Forecasts', count: data.counts.forecasts, hint: 'need approval', tone: 'forecast' },
		{ href: '/team/rumours', label: 'Rumours', count: data.counts.rumours, hint: 'still checking', tone: 'grey' },
		{ href: '/team/reports', label: 'Reports', count: 0, hint: '' }
	]);

	let signingOut = $state(false);

	async function signOut() {
		signingOut = true;
		await post('/api/auth/logout');
		await goto('/team/login');
	}
</script>

<div class="team">
	<header class="team-header">
		<div class="inner">
			<a class="brand" href="/team" aria-label="Qinga team desk home">
				<Logo size={30} />
				<span class="muted small">Team</span>
			</a>
			<nav class="team-nav" aria-label="Sections">
				{#each nav as item (item.href)}
					<a href={item.href} aria-current={page.url.pathname === item.href ? 'page' : undefined}>
						{item.label}
						{#if item.count}
							<span class="badge {item.tone}">{item.count}<span class="sr-only"> {item.hint}</span></span>
						{/if}
					</a>
				{/each}
			</nav>
			<span class="duty small">On duty: <b>{data.user.name}</b> · {data.user.org}</span>
			<button type="button" class="btn btn-quiet btn-sm" disabled={signingOut} onclick={signOut}>Sign out</button>
		</div>
	</header>

	<main class="team-main">
		{@render children()}
	</main>
</div>

<LiveRefresh />
<Toast />

<style>
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 44px;
		color: var(--ink);
		text-decoration: none;
	}
	.brand .muted {
		font-size: 14px;
	}
	.duty {
		font-size: 14px;
		color: var(--muted);
	}
	.duty b {
		color: var(--ink);
	}
	.badge.forecast {
		background: var(--forecast);
	}
	.badge.grey {
		background: var(--muted);
	}
	.team-nav a[aria-current='page'] .badge {
		background: #fff;
		color: var(--ink);
	}
	/* Phone: brand, duty and sign out on the first row; sections on their own row below. */
	@media (max-width: 700px) {
		.team-header .inner {
			gap: 8px 12px;
			padding: 8px 16px;
		}
		.team-main {
			padding-left: 16px;
			padding-right: 16px;
		}
		.team-nav {
			order: 3;
			flex: 1 1 100%;
			flex-wrap: nowrap;
			gap: 2px;
			overflow-x: auto;
		}
		.team-nav a {
			flex: none;
			padding: 0 10px;
		}
		.duty {
			flex: 1;
			text-align: right;
		}
	}
	@media print {
		.team-header {
			display: none;
		}
	}
</style>
