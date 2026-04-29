const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ENV_FILE = path.join(ROOT, '.env');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] == null) process.env[key] = value;
  }
}

loadEnvFile(ENV_FILE);

const SUPABASE_URL = String(process.env.SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = String(process.env.SUPABASE_ANON_KEY || '').trim();

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Faltan SUPABASE_URL o SUPABASE_ANON_KEY en .env');
  process.exit(1);
}

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

async function rpc(name, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body || {}),
  });
  const text = await res.text();
  let parsed = text;
  try {
    parsed = JSON.parse(text);
  } catch (_) {}
  return { status: res.status, body: parsed };
}

async function main() {
  const checks = [
    ['increment_movie_view', { slug_input: 'diagnostic-movie' }],
    ['get_movie_views', { slug_input: 'diagnostic-movie' }],
    ['get_top_movie_views', { limit_input: 3 }],
    ['increment_series_view', { slug_input: 'diagnostic-series' }],
    ['get_series_views', { slug_input: 'diagnostic-series' }],
    ['get_top_series_views', { limit_input: 3 }],
  ];

  for (const [name, body] of checks) {
    try {
      const result = await rpc(name, body);
      console.log(`\n${name}`);
      console.log(`status: ${result.status}`);
      console.log(JSON.stringify(result.body, null, 2));
    } catch (error) {
      console.log(`\n${name}`);
      console.log(`error: ${error.message}`);
    }
  }
}

main().catch((error) => {
  console.error(error.message || String(error));
  process.exit(1);
});
