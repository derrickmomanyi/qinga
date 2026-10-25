# Qinga — Spot the danger! Okoa maisha!

A working prototype of **Qinga**, a verified emergency-alert service for Nairobi. People report floods and other natural disasters, road accidents and fires. The Qinga team checks each report with **Kenya Red Cross** on the ground, then sends short SMS alerts to people nearby. Red Cross gets the full details.

The data is dummy data, but every flow really works: reports, grouping, verification, SMS alerts with delivery tracking, live weather forecasts, rumour checks, Red Cross briefs and the audit report.

## Run it

Requires **Node 22.13+** (it uses Node's built-in SQLite).

```bash
npm install
npm run dev          # http://localhost:5173
```

The first start creates `data/qinga.db` with dummy data: about 420 subscribers, sample incidents and rumours. To start again from clean data, run `npm run reset-data` and restart.

Production build:

```bash
npm run build
npm start            # node build, port 3000 (PORT=...)
```

## Deploy

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/derrickmomanyi/qinga)

`render.yaml` sets up a free Render web service. Render asks for a `DEMO_PASSWORD` for the team accounts. The free plan sleeps after 15 minutes idle, so the first visit takes about a minute, and it resets to fresh dummy data on every restart. For data that persists, use a paid instance with a disk and set `QINGA_DATA_DIR` to the disk's mount path.

## Demo accounts (team desk at `/team`)

| Email | Role |
|---|---|
| wanjiku@qinga.test | Qinga team |
| brian@qinga.test | Qinga team |
| redcross@qinga.test | Kenya Red Cross partner |

The password for all three is `qinga-demo`. Set `DEMO_PASSWORD` before the first start to change it. Use your own password for any public deployment.

## What to try

| Where | What happens |
|---|---|
| `/` | Live map (OpenStreetMap): pins coded by type (fire, accident, weather), and extreme fires pulse |
| `/report` | Quick report (location only) or the full form with photo/video; emergency numbers show straight away |
| `/simulator` | A demo phone. Text `ACCIDENT Thika Rd Roysambu`, `JOIN Mathare`, `STOP` or `CHECK <rumour>` and watch the replies |
| `/team` | Verification desk: pick up a report, confirm with Red Cross, send the SMS alert, send the Red Cross brief, post updates, close |
| `/team/forecasts` | Live Open-Meteo rain forecasts for 8 Nairobi zones from 3 models. Lower the threshold to demo a warning on a dry day |
| `/team/rumours` | Mark WhatsApp rumours true or false; corrections appear on `/rumours` |
| `/team/reports` | Who received each report, who processed it, who confirmed it, SMS delivery counts. Download as CSV |

## How it is built

- **SvelteKit 3** (Svelte 5, TypeScript) with the Node adapter. One app serves the public screens, the team desk and the JSON API.
- **SQLite** through Node's built-in `node:sqlite`, with no database server to run.
- **Open-Meteo** for live rain forecasts (ECMWF, ICON, GFS), **OpenStreetMap / Nominatim** for maps and street names, **Leaflet** for the map.
- **SMS**: a built-in simulator by default, which records every message and simulates delivery reports. Set `AT_USERNAME` and `AT_API_KEY` to send through **Africa's Talking** instead; the `sandbox` username works for testing. See `.env.example`.
- **Live updates**: server-sent events (`/api/stream`) refresh open pages when anything changes.

```
src/lib/server/
  db/          connection, schema, dummy-data seed
  shared/      validation, phone numbers, geo, HTTP helpers
  providers/   sms (SmsProvider base + simulator + Africa's Talking), weather (Open-Meteo), geocoding (Nominatim)
  <domain>/    *.service.ts = business rules · *.selectors.ts = queries
               incidents, reports, messaging, subscribers, forecasts, rumours, briefs, inbound, reporting, auth, audit
src/routes/
  api/         thin JSON endpoints: validate → call a service → respond
  team/        verification desk (signed in)
  …            public phone screens
```

## API (main endpoints)

| Method & path | Purpose |
|---|---|
| `POST /api/reports` | Public report (multipart, optional photo/video) |
| `POST /api/inbound/sms` | Incoming SMS (Africa's Talking callback format or JSON) |
| `POST /api/inbound/whatsapp` | Incoming WhatsApp message (simulated) |
| `POST /api/sms/delivery` | SMS delivery report callback |
| `POST /api/subscribers` | Sign up for alerts |
| `GET/POST /api/rumours` | Rumour list / submit a rumour |
| `GET /api/forecasts`, `GET /api/weather` | Active forecasts / live weather |
| `POST /api/incidents/:id/{pickup,verify,reject,alert,update,close,brief}` | Team actions |
| `POST /api/forecasts/{refresh,:id/approve,:id/dismiss}`, `POST /api/settings` | Forecast workflow |
| `GET /api/reports-log.csv` | Audit report |
| `GET /api/stream` | Live updates (SSE) |

## Not real yet

- SMS shortcode and WhatsApp number are **TBC**. WhatsApp is simulated.
- Photo blurring is shown in the interface; automatic face and number-plate blurring is not implemented.
- Area centre points and all people, phone numbers and incidents are made up.
- Emergency numbers: Nairobi Fire 020 222 2181 (nairobi.go.ke), 999/112, Red Cross 1199. Confirm them with partners before launch.
