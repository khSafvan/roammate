import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiDir = path.resolve(__dirname, '..');

// Read environment from process.env or .dev.vars
let url = process.env.TURSO_DATABASE_URL;
let authToken = process.env.TURSO_AUTH_TOKEN;

const devVarsPath = path.join(apiDir, '.dev.vars');
if (fs.existsSync(devVarsPath)) {
  const content = fs.readFileSync(devVarsPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...valParts] = trimmed.split('=');
    const val = valParts.join('=').trim().replace(/^["']|["']$/g, '');
    if (key.trim() === 'TURSO_DATABASE_URL' && !url) url = val;
    if (key.trim() === 'TURSO_AUTH_TOKEN' && !authToken) authToken = val;
  }
}

if (!url) {
  console.log('ℹ️ TURSO_DATABASE_URL not set in process.env or .dev.vars. Skipping remote migration.');
  process.exit(0);
}

const client = createClient({
  url,
  authToken: authToken || undefined,
});

const migrationsDir = path.join(apiDir, 'migrations');
const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

console.log(`🚀 Running migrations against ${url}...`);

for (const file of files) {
  const filePath = path.join(migrationsDir, file);
  const sql = fs.readFileSync(filePath, 'utf-8');
  console.log(`  Applying ${file}...`);
  // Split statements by semicolon
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await client.execute(statement);
  }
}

console.log('✅ Migrations completed successfully.');
