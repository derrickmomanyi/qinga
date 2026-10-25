export const SCHEMA = /* sql */ `
CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY,
	name TEXT NOT NULL,
	email TEXT UNIQUE NOT NULL,
	password_hash TEXT NOT NULL,
	role TEXT NOT NULL DEFAULT 'team',
	org TEXT NOT NULL DEFAULT 'Qinga'
);

CREATE TABLE IF NOT EXISTS sessions (
	id TEXT PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS areas (
	id INTEGER PRIMARY KEY,
	name TEXT UNIQUE NOT NULL,
	lat REAL NOT NULL,
	lon REAL NOT NULL,
	watch INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS incidents (
	id INTEGER PRIMARY KEY,
	type TEXT NOT NULL,
	subtype TEXT,
	title TEXT NOT NULL,
	location_label TEXT NOT NULL,
	area_id INTEGER REFERENCES areas(id),
	lat REAL NOT NULL,
	lon REAL NOT NULL,
	status TEXT NOT NULL DEFAULT 'new',
	severity TEXT,
	casualties TEXT,
	extreme INTEGER NOT NULL DEFAULT 0,
	summary TEXT,
	advice TEXT,
	verified_by INTEGER REFERENCES users(id),
	confirmed_by TEXT,
	verified_at TEXT,
	rejected_by INTEGER REFERENCES users(id),
	rejected_reason TEXT,
	rejected_at TEXT,
	closed_by INTEGER REFERENCES users(id),
	closed_at TEXT,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
	id INTEGER PRIMARY KEY,
	ref TEXT UNIQUE NOT NULL,
	incident_id INTEGER NOT NULL REFERENCES incidents(id),
	type TEXT NOT NULL,
	subtype TEXT,
	severity TEXT,
	casualties TEXT,
	note TEXT,
	lat REAL,
	lon REAL,
	area_id INTEGER REFERENCES areas(id),
	location_label TEXT,
	phone TEXT,
	anonymous INTEGER NOT NULL DEFAULT 0,
	channel TEXT NOT NULL,
	media_path TEXT,
	media_type TEXT,
	created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS incident_updates (
	id INTEGER PRIMARY KEY,
	incident_id INTEGER NOT NULL REFERENCES incidents(id),
	text TEXT NOT NULL,
	user_id INTEGER REFERENCES users(id),
	created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subscribers (
	id INTEGER PRIMARY KEY,
	phone TEXT UNIQUE NOT NULL,
	area_id INTEGER NOT NULL REFERENCES areas(id),
	language TEXT NOT NULL DEFAULT 'en',
	active INTEGER NOT NULL DEFAULT 1,
	source TEXT NOT NULL DEFAULT 'web',
	created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS forecasts (
	id INTEGER PRIMARY KEY,
	area_id INTEGER NOT NULL REFERENCES areas(id),
	window_start TEXT NOT NULL,
	window_end TEXT NOT NULL,
	peak_mm REAL NOT NULL,
	agree INTEGER NOT NULL,
	models TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'forecast',
	approved_by INTEGER REFERENCES users(id),
	approved_at TEXT,
	dismissed_by INTEGER REFERENCES users(id),
	dismissed_at TEXT,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS zone_weather (
	area_id INTEGER PRIMARY KEY REFERENCES areas(id),
	fetched_at TEXT NOT NULL,
	data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alerts (
	id INTEGER PRIMARY KEY,
	incident_id INTEGER REFERENCES incidents(id),
	forecast_id INTEGER REFERENCES forecasts(id),
	kind TEXT NOT NULL,
	body TEXT NOT NULL,
	body_sw TEXT,
	radius_km REAL,
	recipients INTEGER NOT NULL DEFAULT 0,
	delivered INTEGER NOT NULL DEFAULT 0,
	failed INTEGER NOT NULL DEFAULT 0,
	user_id INTEGER REFERENCES users(id),
	created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sms_messages (
	id INTEGER PRIMARY KEY,
	alert_id INTEGER REFERENCES alerts(id),
	direction TEXT NOT NULL,
	channel TEXT NOT NULL DEFAULT 'sms',
	phone TEXT NOT NULL,
	body TEXT NOT NULL,
	status TEXT NOT NULL,
	provider TEXT NOT NULL,
	provider_id TEXT,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS briefs (
	id INTEGER PRIMARY KEY,
	incident_id INTEGER REFERENCES incidents(id),
	forecast_id INTEGER REFERENCES forecasts(id),
	token TEXT UNIQUE NOT NULL,
	sent_to TEXT NOT NULL,
	user_id INTEGER REFERENCES users(id),
	created_at TEXT NOT NULL,
	opened_at TEXT
);

CREATE TABLE IF NOT EXISTS rumours (
	id INTEGER PRIMARY KEY,
	text TEXT NOT NULL,
	media_path TEXT,
	status TEXT NOT NULL DEFAULT 'checking',
	verdict TEXT,
	incident_id INTEGER REFERENCES incidents(id),
	channel TEXT NOT NULL DEFAULT 'app',
	resolved_by INTEGER REFERENCES users(id),
	resolved_at TEXT,
	created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
	id INTEGER PRIMARY KEY,
	entity TEXT NOT NULL,
	entity_id INTEGER,
	action TEXT NOT NULL,
	actor TEXT NOT NULL,
	detail TEXT,
	created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
	key TEXT PRIMARY KEY,
	value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reports_incident ON reports(incident_id);
CREATE INDEX IF NOT EXISTS idx_reports_phone ON reports(phone);
CREATE INDEX IF NOT EXISTS idx_events_entity ON events(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_sms_phone ON sms_messages(phone);
CREATE INDEX IF NOT EXISTS idx_sms_alert ON sms_messages(alert_id);
CREATE INDEX IF NOT EXISTS idx_sms_provider_id ON sms_messages(provider_id);
CREATE INDEX IF NOT EXISTS idx_alerts_incident ON alerts(incident_id);
CREATE INDEX IF NOT EXISTS idx_forecasts_area ON forecasts(area_id, status);
`;
