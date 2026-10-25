<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { clock } from '../../constants.ts';
	import { CHANNEL_LABELS } from './format.ts';

	export type DeskReport = {
		id: number;
		ref: string;
		channel: string;
		note: string | null;
		severity: string | null;
		casualties: string | null;
		subtype: string | null;
		location_label: string | null;
		media_path: string | null;
		media_type: string | null;
		created_at: string;
		reporter: string;
		earlier_false: number;
	};

	let { reports }: { reports: DeskReport[] } = $props();

	// Media is blurred on screen until someone chooses to look.
	const revealed = new SvelteSet<number>();
	const toggle = (id: number) => (revealed.has(id) ? revealed.delete(id) : revealed.add(id));

	const facts = (r: DeskReport) =>
		[r.subtype, `Severity: ${r.severity ?? 'not said'}`, `People hurt: ${r.casualties ?? 'not said'}`, r.location_label]
			.filter(Boolean)
			.join(' · ');
</script>

<ol class="reports">
	{#each reports as r (r.id)}
		<li class="report">
			<div class="meta">
				<b>{clock(r.created_at)}</b>
				<span>{CHANNEL_LABELS[r.channel] ?? r.channel}</span>
				<span>{r.reporter}</span>
				<span class="muted">{r.ref}</span>
				{#if r.earlier_false > 0}
					<span class="warn">{r.earlier_false} earlier false {r.earlier_false === 1 ? 'report' : 'reports'}</span>
				{/if}
			</div>
			{#if r.note}<p class="note">{r.note}</p>{/if}
			<p class="facts small muted">{facts(r)}</p>
			{#if r.media_path}
				{@const shown = revealed.has(r.id)}
				<div class="media">
					<div class="frame">
						{#if r.media_type === 'video'}
							<video
								class="media-thumb"
								class:blurred={!shown}
								src="/uploads/{r.media_path}"
								controls={shown}
								muted
								playsinline
								preload="metadata"
								aria-label="Video from report {r.ref}"
							>
								<track kind="captions" />
							</video>
						{:else}
							<img class="media-thumb" class:blurred={!shown} src="/uploads/{r.media_path}" alt="Photo from report {r.ref}" />
						{/if}
					</div>
					<button type="button" class="btn btn-quiet btn-sm" aria-pressed={shown} onclick={() => toggle(r.id)}>
						{shown ? 'Blur again' : 'Show original'}
					</button>
				</div>
			{/if}
		</li>
	{/each}
</ol>

<style>
	.reports {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.report {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 12px 14px;
		border: 1px solid var(--line);
		border-radius: 12px;
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 12px;
		font-size: 14px;
	}
	.warn {
		color: #991b1b;
		font-weight: 700;
	}
	.note {
		font-size: 15px;
		line-height: 1.45;
	}
	.media {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 10px;
	}
	.frame {
		width: 220px;
		max-width: 100%;
		height: 150px;
		overflow: hidden;
		border-radius: 10px;
	}
</style>
