# Qinga prototype

Verified emergency alerts for Nairobi (disasters, accidents, fire). Design source: the "Qinga" Claude design canvas (claude.ai/artifact/VKCe94a7ZWYauaB97JhRpL).

## Commands
- `npm run dev` (port 5173) · `npm run check` · `npm run build` then `npm start`
- `npm run reset-data` deletes `data/` so the next start reseeds dummy data

## Conventions
- SvelteKit 3: no `$lib` alias. Import with `#lib/...` and include the extension (`#lib/server/incidents/incidents.service.ts`, `#lib/components/Logo.svelte`). Server modules use relative imports.
- `Handle` is in `@sveltejs/kit/hooks`; use `refreshAll` from `$app/navigation`.
- Layering: routes stay thin (validate with `shared/validation.ts`, call a service, respond with `respond()`). Business rules live in `src/lib/server/<domain>/*.service.ts`, SQL in `*.selectors.ts` or services. Providers (SMS, weather, geocoding) sit behind `src/lib/server/providers/`.
- Every state change goes through `audit.record(...)`, which also feeds the live SSE stream.
- Public screens stay very simple (little text). The team desk carries the detail; Red Cross gets the full brief.
- Brand: UI red `#B91C1C`, green `#15803D`, black `#14171C`; Public Sans. Logo (navy `#04254C` + red `#E30D1D`, Q with pin and signal waves, slogan "Spot Danger, Okoa Maisha") is vector in `src/lib/components/Logo.svelte`; wordmark uses Poppins 700, slogan Montserrat 700.
- Plain CSS: shared classes are in `src/app.css`, and page styles are scoped in components.
