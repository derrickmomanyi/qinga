<script lang="ts">
	// SMS textarea with a 160-character counter (longer messages go out as several SMS).
	let {
		id,
		label,
		value = $bindable(''),
		rows = 4,
		lang
	}: { id: string; label: string; value?: string; rows?: number; lang?: string } = $props();

	const length = $derived(value.length);
	const parts = $derived(length <= 160 ? 1 : Math.ceil(length / 153));
</script>

<div class="field">
	<label for={id}>{label}</label>
	<textarea {id} class="textarea" {rows} {lang} bind:value aria-describedby="{id}-count"></textarea>
	<span id="{id}-count" class="count" class:over={length > 160}>
		{length} / 160{#if length > 160}{` · goes out as ${parts} SMS`}{/if}
	</span>
</div>

<style>
	.field label {
		font-size: 14px;
	}
	.textarea {
		font-size: 14px;
	}
	.count {
		align-self: flex-end;
		font-size: 13px;
		color: var(--muted);
	}
	.count.over {
		color: #92400e;
		font-weight: 700;
	}
</style>
