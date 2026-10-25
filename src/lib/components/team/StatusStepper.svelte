<script lang="ts">
	// New → Verifying → Verified → Closed, with Held replacing New and Rejected ending the flow.
	let { status }: { status: string } = $props();

	const LABELS: Record<string, string> = {
		new: 'New',
		held: 'Held',
		verifying: 'Verifying',
		verified: 'Verified',
		rejected: 'Rejected',
		closed: 'Closed'
	};

	const steps = $derived.by(() => {
		const first = status === 'held' ? 'held' : 'new';
		const order = status === 'rejected' ? [first, 'verifying', 'rejected'] : [first, 'verifying', 'verified', 'closed'];
		const current = order.indexOf(status);
		return order.map((key, i) => ({
			key,
			label: LABELS[key],
			state: i < current ? 'done' : i === current ? 'current' : 'todo'
		}));
	});
</script>

<ol class="stepper" aria-label="Status">
	{#each steps as s (s.key)}
		<li class="step {s.state} s-{s.key}" aria-current={s.state === 'current' ? 'step' : undefined}>
			{#if s.state === 'done'}<span class="tick" aria-hidden="true">✓</span>{/if}{s.label}
			{#if s.state === 'done'}<span class="sr-only"> (done)</span>{/if}
		</li>
	{/each}
</ol>

<style>
	.stepper {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: 12px;
		font-weight: 700;
	}
	.step {
		padding: 6px 10px;
		border: 1.5px solid transparent;
		border-radius: 999px;
		background: var(--bg);
		color: var(--muted);
	}
	.step.done {
		background: var(--green-tint);
		color: var(--green);
	}
	.tick {
		margin-right: 4px;
	}
	.current.s-new {
		background: var(--red);
		color: #fff;
	}
	.current.s-held {
		border: 1.5px dashed var(--red);
		background: var(--surface);
		color: #991b1b;
	}
	.current.s-verifying {
		background: var(--orange);
		color: #fff;
	}
	.current.s-verified {
		background: var(--green);
		color: #fff;
	}
	.current.s-closed {
		background: var(--ink);
		color: #fff;
	}
	.current.s-rejected {
		border-color: var(--ink-2);
		background: var(--surface);
		color: var(--ink-2);
	}
</style>
