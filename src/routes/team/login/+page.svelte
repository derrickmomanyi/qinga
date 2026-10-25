<script lang="ts">
	import { goto } from '$app/navigation';
	import Logo from '#lib/components/Logo.svelte';
	import { post } from '#lib/api.ts';

	let email = $state('');
	let password = $state('');
	let error = $state<string | null>(null);
	let busy = $state(false);

	async function signIn(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		error = null;
		const res = await post('/api/auth/login', { email: email.trim(), password });
		if (!res.ok) {
			busy = false;
			error = res.error;
			return;
		}
		await goto('/team');
	}

	const ticks = ['Verify reports with Red Cross on the ground', 'Send SMS alerts in minutes', 'See who handled every incident'];
</script>

<svelte:head>
	<title>Qinga · Team sign in</title>
</svelte:head>

<div class="login">
	<section class="brand">
		<div class="mark">
			<Logo size={60} dark full />
			<span class="slogan">Spot the danger! Okoa maisha!</span>
		</div>
		<div class="pitch">
			<h1>Verified emergency alerts for Kenya</h1>
			<ul>
				{#each ticks as t (t)}
					<li>
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
							><path d="M5 12l5 5L20 7" /></svg
						>{t}
					</li>
				{/each}
			</ul>
		</div>
		<div class="partners">
			<span>With our partners</span>
			<span class="logo-slot">[Red Cross logo]</span>
			<span class="logo-slot">[AMREF logo]</span>
		</div>
	</section>

	<section class="form-side">
		<form class="form" onsubmit={signIn}>
			<div>
				<h2>Welcome back</h2>
				<p class="lead">For the Qinga team and partners.</p>
			</div>
			<div class="field">
				<label for="email">Work email</label>
				<input
					id="email"
					class="input"
					type="email"
					autocomplete="username"
					required
					placeholder="name@organisation.org"
					bind:value={email}
					aria-describedby={error ? 'login-error' : undefined}
				/>
			</div>
			<div class="field">
				<label for="password">Password</label>
				<input
					id="password"
					class="input"
					type="password"
					autocomplete="current-password"
					required
					bind:value={password}
					aria-describedby={error ? 'login-error' : undefined}
				/>
			</div>
			{#if error}<p class="error" id="login-error" role="alert">{error}</p>{/if}
			<button class="btn btn-red btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
			<p class="note">New partner? Ask the Qinga team for an account. The public doesn't need one.</p>
			<p class="note small">Demo accounts are listed in the README.</p>
		</form>
	</section>
</div>

<style>
	.login {
		min-height: 100dvh;
		display: flex;
		flex-wrap: wrap;
		background: var(--surface);
	}
	.brand {
		flex: 1 1 480px;
		min-width: 0;
		padding: 64px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 48px;
		background: var(--ink);
		color: #fff;
	}
	.mark {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.slogan {
		font-size: 16px;
		font-weight: 700;
		color: #fca5a5;
	}
	.pitch {
		display: flex;
		flex-direction: column;
		gap: 24px;
		max-width: 520px;
	}
	h1 {
		font-size: 44px;
		font-weight: 800;
		line-height: 1.1;
		letter-spacing: -0.02em;
	}
	ul {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 14px;
		font-size: 18px;
		line-height: 1.4;
		color: #e2e8f0;
	}
	li {
		display: flex;
		gap: 12px;
	}
	li svg {
		flex: none;
	}
	.partners {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 16px;
		font-size: 14px;
		color: #cbd5e1;
	}
	.logo-slot {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 150px;
		height: 52px;
		border: 1.5px dashed #64748b;
		border-radius: 10px;
		font-size: 13px;
	}
	.form-side {
		flex: 1 1 480px;
		min-width: 0;
		padding: 64px 24px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.form {
		width: 100%;
		max-width: 420px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
	h2 {
		font-size: 28px;
		font-weight: 800;
	}
	.lead {
		margin-top: 6px;
		font-size: 15px;
		color: var(--ink-2);
	}
	.field label {
		font-size: 14px;
	}
	.input {
		min-height: 50px;
	}
	.btn-block {
		min-height: 54px;
	}
	.note {
		font-size: 14px;
		line-height: 1.5;
		color: var(--muted);
	}
	.note.small {
		font-size: 13px;
		margin-top: -12px;
	}
	@media (max-width: 600px) {
		.brand {
			padding: 32px 20px;
			gap: 32px;
		}
		h1 {
			font-size: 32px;
		}
		.form-side {
			padding: 40px 16px;
		}
	}
</style>
