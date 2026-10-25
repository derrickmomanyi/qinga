import { existsSync } from 'node:fs';

// Load .env for local runs (production hosts set real environment variables).
if (existsSync('.env')) process.loadEnvFile('.env');
