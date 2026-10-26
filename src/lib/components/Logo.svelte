<script lang="ts">
	// Qinga logo: navy Q with a red location pin inside and red signal waves, then "inga".
	// Redrawn as vector from the brand artwork (navy #04254C, red #E30D1D).
	let {
		size = 32,
		dark = false,
		wordmark = true,
		slogan = false
	}: { size?: number; dark?: boolean; wordmark?: boolean; slogan?: boolean } = $props();

	const uid = $props.id();
	const navy = $derived(dark ? '#FFFFFF' : '#04254C');
	const red = '#E30D1D';
	const tail = '371,522 472,522 595,652 488,652';

	// The mark spans 576 units tall; `size` is the mark's height in pixels.
	const box = $derived(wordmark ? (slogan ? [96, 84, 1564, 732] : [96, 84, 1564, 626]) : [96, 84, 616, 576]);
	const height = $derived((size * box[3]) / 576);
	const width = $derived((size * box[2]) / 576);
</script>

<svg
	class="logo"
	viewBox={box.join(' ')}
	width={width}
	height={height}
	role="img"
	aria-label={slogan ? 'Qinga · Spot Danger, Okoa Maisha' : 'Qinga'}
>
	<defs>
		<mask id="{uid}-gap" maskUnits="userSpaceOnUse" x="0" y="0" width="1800" height="900">
			<rect x="0" y="0" width="1800" height="900" fill="#fff" />
			<polygon points={tail} fill="#000" stroke="#000" stroke-width="22" stroke-linejoin="round" />
		</mask>
	</defs>
	<circle cx="348" cy="402" r="194" fill="none" stroke={navy} stroke-width="96" mask="url(#{uid}-gap)" />
	<polygon points={tail} fill={navy} />
	<path
		d="M346.5 519 L284.2 440.4 A79.5 79.5 0 1 1 408.8 440.4 Z M312.5 391 a34 34 0 1 0 68 0 a34 34 0 1 0 -68 0 Z"
		fill={red}
		fill-rule="evenodd"
	/>
	<path d="M530.1 108.8 A180 180 0 0 1 683.2 262" fill="none" stroke={red} stroke-width="38" stroke-linecap="round" />
	<path d="M520.9 174.1 A114 114 0 0 1 617.9 271.1" fill="none" stroke={red} stroke-width="38" stroke-linecap="round" />
	{#if wordmark}
		<text x="690" y="605" textLength="951" lengthAdjust="spacingAndGlyphs" class="word" fill={navy}>inga</text>
	{/if}
	{#if slogan}
		<text x="276" y="796" textLength="1359" lengthAdjust="spacing" class="slogan" fill={navy}>Spot Danger, Okoa Maisha</text>
	{/if}
</svg>

<style>
	.logo {
		display: block;
		flex: none;
		overflow: visible;
	}
	.word {
		font-family: 'Poppins', 'Public Sans', system-ui, sans-serif;
		font-size: 420px;
		font-weight: 700;
	}
	.slogan {
		font-family: 'Montserrat', 'Public Sans', system-ui, sans-serif;
		font-size: 86px;
		font-weight: 600;
	}
</style>
