<script lang="ts">
	import { dayLabel, hourLabel } from './format.ts';

	// ECMWF rain per 3-hour window, with the warning level as a dashed line.
	let { windows, threshold }: { windows: { start: string; mm: number }[]; threshold: number } = $props();

	const max = $derived(Math.max(threshold * 1.3, ...windows.map((w) => w.mm), 1));
	const pct = (mm: number) => `${Math.min(100, (mm / max) * 100)}%`;
	const bars = $derived(
		windows.map((w, i) => ({
			...w,
			hour: hourLabel(w.start),
			day: i === 0 || w.start.slice(0, 10) !== windows[i - 1].start.slice(0, 10) ? dayLabel(w.start) : null,
			over: w.mm >= threshold
		}))
	);
</script>

<figure class="chart">
	<figcaption>Rain expected in the next 48 hours, every 3 hours <span class="muted">(ECMWF model, mm)</span></figcaption>
	{#if windows.length === 0}
		<p class="muted small">No rain data yet. Press <b>Refresh now</b> to pull it from Open-Meteo.</p>
	{:else}
		<div class="plot" style:--cols={bars.length} aria-hidden="true">
			{#each bars as b (b.start)}
				<div class="col">
					{#if b.over}<span class="value">{b.mm}</span>{/if}
					<div class="bar" class:over={b.over} style:height={pct(b.mm)}></div>
					<span class="tip">{b.hour} {dayLabel(b.start)} · {b.mm} mm</span>
				</div>
			{/each}
			<div class="line" style:bottom={pct(threshold)}></div>
			<span class="line-label" style:bottom={pct(threshold)}>Warning level · {threshold} mm</span>
		</div>
		<div class="axis" style:--cols={bars.length} aria-hidden="true">
			{#each bars as b, i (b.start)}
				<span class:odd={i % 2 === 1}>{b.hour}{#if b.day}<b>{b.day}</b>{/if}</span>
			{/each}
		</div>
		<details class="numbers">
			<summary>Show the numbers</summary>
			<table>
				<caption class="sr-only">Rain per 3-hour window. Warning level {threshold} mm.</caption>
				<thead><tr><th scope="col">Window starts</th><th scope="col">Rain (mm)</th><th scope="col">Warning level?</th></tr></thead>
				<tbody>
					{#each bars as b (b.start)}
						<tr><td>{b.hour} {dayLabel(b.start)}</td><td>{b.mm}</td><td>{b.over ? 'Above' : 'Below'}</td></tr>
					{/each}
				</tbody>
			</table>
		</details>
	{/if}
</figure>

<style>
	.chart {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	figcaption {
		font-size: 14px;
		font-weight: 700;
	}
	figcaption .muted {
		font-weight: 500;
	}
	.plot,
	.axis {
		display: grid;
		grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
		gap: 4px;
		padding: 0 4px;
	}
	.plot {
		position: relative;
		height: 180px;
		align-items: end;
		border-bottom: 1px solid var(--line);
	}
	.col {
		position: relative;
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		align-items: center;
	}
	.bar {
		width: 100%;
		min-height: 2px;
		border-radius: 4px 4px 0 0;
		background: #6f8fe0;
	}
	.bar.over {
		background: var(--forecast);
	}
	.value {
		font-size: 11px;
		font-weight: 700;
		color: var(--ink);
		margin-bottom: 2px;
	}
	.tip {
		display: none;
		position: absolute;
		bottom: calc(100% - 28px);
		left: 50%;
		transform: translateX(-50%);
		z-index: 2;
		padding: 4px 8px;
		border-radius: 6px;
		background: var(--ink);
		color: #fff;
		font-size: 12px;
		font-weight: 600;
		white-space: nowrap;
		pointer-events: none;
	}
	.col:hover .tip {
		display: block;
	}
	.col:hover .bar {
		outline: 2px solid var(--ink);
		outline-offset: 1px;
	}
	.line {
		position: absolute;
		left: 0;
		right: 0;
		border-top: 2px dashed var(--orange);
		pointer-events: none;
	}
	.line-label {
		position: absolute;
		right: 4px;
		margin-bottom: 4px;
		padding: 0 4px;
		background: var(--surface);
		font-size: 12px;
		font-weight: 700;
		color: #92400e;
		pointer-events: none;
	}
	.axis span {
		display: flex;
		flex-direction: column;
		align-items: center;
		font-size: 11px;
		color: var(--muted);
		white-space: nowrap;
	}
	.axis b {
		font-size: 11px;
		color: var(--ink);
		text-transform: capitalize;
	}
	.numbers summary {
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
	}
	.numbers table {
		border-collapse: collapse;
		font-size: 13px;
	}
	.numbers th,
	.numbers td {
		padding: 4px 12px 4px 0;
		text-align: left;
		border-bottom: 1px solid var(--line-soft);
	}
	@media (max-width: 700px) {
		.axis span.odd {
			visibility: hidden;
		}
		.value {
			display: none;
		}
	}
	/* Narrow chart beside the zone list (tablet): same thinning as on phones. */
	.chart {
		container-type: inline-size;
	}
	@container (max-width: 480px) {
		.axis span.odd {
			visibility: hidden;
		}
		.value {
			display: none;
		}
	}
</style>
