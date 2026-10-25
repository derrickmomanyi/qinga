<script lang="ts">
	import { untrack } from 'svelte';
	import { dayClock } from '#lib/constants.ts';
	import StatusChip from '#lib/components/StatusChip.svelte';
	import RainChart from '#lib/components/team/RainChart.svelte';
	import ForecastApprove from '#lib/components/team/ForecastApprove.svelte';
	import { act } from '#lib/components/team/toast.svelte.ts';
	import { windowLabel } from '#lib/components/team/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const agreeing = $derived(data.zone ? data.zone.peaks.filter((p) => p.peak >= data.threshold).length : 0);
	const f = $derived(data.forecast);

	let refreshing = $state(false);
	let refreshError = $state<string | null>(null);

	async function refresh() {
		refreshing = true;
		refreshError = null;
		const res = await act<{ zones: number }>('/api/forecasts/refresh', undefined, (d) => `Live rain fetched for ${d.zones} watch zones`);
		refreshing = false;
		if (!res.ok) refreshError = res.error;
	}

	let threshold = $state(untrack(() => data.threshold));
	let saving = $state(false);
	let thresholdError = $state<string | null>(null);

	async function saveThreshold(e: SubmitEvent) {
		e.preventDefault();
		saving = true;
		thresholdError = null;
		const res = await act('/api/settings', { rain_threshold_mm_3h: Number(threshold) }, `Warning level set to ${threshold} mm in 3 hours`);
		saving = false;
		if (!res.ok) thresholdError = res.error;
	}
</script>

<svelte:head>
	<title>Qinga · Forecasts</title>
</svelte:head>

<div class="cols">
	<section class="zones" aria-labelledby="zones-title">
		<h2 id="zones-title">Watch zones · Nairobi</h2>
		{#each data.zones as z (z.id)}
			<a class="queue-item zone" href="?zone={z.id}" aria-current={data.zone?.id === z.id ? 'true' : undefined}>
				<span class="zone-row">
					<b>{z.name}</b>
					{#if z.status === 'forecast'}
						<StatusChip status="forecast" label="Forecast" />
					{:else if z.status === 'approved'}
						<StatusChip status="warning" label="Warning sent" />
					{:else}
						<span class="small muted">Watching</span>
					{/if}
				</span>
				{#if z.peak !== null}<span class="small muted">Wettest 3 h: {z.peak} mm</span>{/if}
			</a>
		{:else}
			<p class="panel muted">No watch zones set up.</p>
		{/each}
	</section>

	<section class="panel main" aria-label="Selected zone">
		{#if data.zone}
			<div>
				{#if f?.status === 'forecast'}
					<StatusChip status="forecast" label="Forecast · needs approval" />
				{:else if f?.status === 'approved'}
					<StatusChip status="warning" label="Warning sent" />
				{/if}
				<h1>{f ? `Heavy rain likely · ${data.zone.name}` : data.zone.name}</h1>
				<p class="small muted">
					{#if f}
						{windowLabel(f.window_start, f.window_end)} · {f.peak_mm} mm in 3 h · created automatically {dayClock(f.created_at)} · updates every hour
					{:else}
						Watching. A forecast opens here by itself when {data.modelsNeeded} of 3 models pass the warning level.
					{/if}
				</p>
			</div>

			<RainChart windows={data.zone.windows} threshold={data.threshold} />

			{#if data.zone.peaks.length}
				<div class="models">
					{#each data.zone.peaks as p (p.model)}
						{@const above = p.peak >= data.threshold}
						<span class="model" class:above>
							<b>{p.label}</b>
							{p.peak} mm · {windowLabel(p.start, p.end)} · {above ? 'above warning level' : 'below'}
						</span>
					{/each}
					<span class="agree">{agreeing} of 3 models agree</span>
				</div>
			{/if}

			<div class="engine">
				<p class="small">
					<b>Live from Open-Meteo</b> · fetched {dayClock(data.zone.fetched_at ?? data.engine.lastFetch)}
				</p>
				{#if data.engine.lastError}
					<p class="error">Last refresh failed: {data.engine.lastError}</p>
				{/if}
				{#if refreshError}<p class="error" role="alert">{refreshError}</p>{/if}
				<div class="engine-row">
					<button type="button" class="btn btn-outline btn-sm" disabled={refreshing} onclick={refresh}>
						{refreshing ? 'Fetching live data…' : 'Refresh now'}
					</button>
					<form class="threshold" onsubmit={saveThreshold}>
						<div class="field">
							<label for="threshold">Warning level (mm in 3 h)</label>
							<div class="row">
								<input id="threshold" class="input" type="number" min="0.5" max="200" step="0.5" required bind:value={threshold} aria-describedby="threshold-help" />
								<button class="btn btn-dark btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
							</div>
						</div>
					</form>
				</div>
				<p id="threshold-help" class="small muted">
					A forecast opens when {data.modelsNeeded} of 3 models pass this level. Lower it to demo the flow on a dry day.
				</p>
				{#if thresholdError}<p class="error" role="alert">{thresholdError}</p>{/if}
			</div>
		{:else}
			<p class="muted">No watch zones yet.</p>
		{/if}
	</section>

	<section class="panel side" aria-labelledby="send-title">
		<div>
			<h2 id="send-title">Public SMS</h2>
			<p class="small muted">Goes out only when you approve</p>
		</div>
		{#if f?.status === 'forecast' && data.message && data.zone}
			{#key f.id}
				<ForecastApprove forecastId={f.id} zoneName={data.zone.name} message={data.message} recipients={data.recipients} />
			{/key}
		{:else if f?.status === 'approved'}
			<p class="sent">
				<b>Warning sent {dayClock(f.approved_at)}</b>
				<span class="small">Heavy rain {windowLabel(f.window_start, f.window_end)} in {f.area_name}.</span>
			</p>
			{#each data.sent as s (s.id)}
				<p class="small">SMS {dayClock(s.created_at)}: <b>{s.delivered} of {s.recipients}</b> delivered{s.failed ? ` · ${s.failed} failed` : ''}</p>
			{/each}
		{:else}
			<p class="small muted">Nothing to approve for this zone. When the models agree on heavy rain, a draft warning appears here.</p>
		{/if}
	</section>
</div>

<style>
	.zones {
		flex: 1 1 280px;
		max-width: 340px;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.zones h2 {
		margin-bottom: 4px;
		font-size: 15px;
		font-weight: 800;
	}
	.zone {
		min-height: 52px;
		justify-content: center;
	}
	.zone-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		font-size: 15px;
	}
	.zone:hover {
		border-color: var(--ink);
	}
	.main {
		flex: 999 1 480px;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	h1 {
		margin-top: 8px;
		font-size: 22px;
		font-weight: 800;
	}
	h1 + p {
		margin-top: 4px;
		font-size: 14px;
	}
	.models {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
	}
	.model {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 40px;
		padding: 6px 12px;
		border-radius: 10px;
		background: var(--bg);
		font-size: 14px;
		color: var(--ink-2);
	}
	.model.above {
		color: var(--ink);
		box-shadow: inset 3px 0 0 var(--forecast);
	}
	.agree {
		font-size: 14px;
		font-weight: 700;
	}
	.engine {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 16px;
		border-radius: 12px;
		background: var(--bg);
	}
	.engine-row {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 12px;
	}
	.threshold .field label {
		font-size: 14px;
	}
	.threshold .input {
		width: 110px;
		min-height: 44px;
	}
	.side {
		flex: 1 1 340px;
		max-width: 420px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.sent {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 12px 14px;
		border-radius: 10px;
		background: #fff7ed;
		border-left: 4px solid var(--orange);
		font-size: 14px;
	}
	@media (max-width: 860px) {
		.zones,
		.side {
			max-width: none;
		}
	}
</style>
