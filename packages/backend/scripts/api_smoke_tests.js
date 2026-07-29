const { execSync } = require('child_process');
const fs = require('fs');

const BASE = 'http://localhost:3008/api';
const JWT = process.env.TEST_JWT || '';

function run(cmd) {
  try {
    return execSync(cmd, { stdio: 'pipe' }).toString();
  } catch (e) {
    return e.stdout ? e.stdout.toString() + '\n' + e.stderr?.toString() : e.message;
  }
}

function curl(opts) {
  const headers = (opts.headers || []).map(h => `-H "${h}"`).join(' ');
  const data = opts.dataFile ? `--data-binary @${opts.dataFile}` : (opts.data ? `-d '${JSON.stringify(opts.data)}'` : '');
  const cmd = `curl -s -o /dev/stderr -w "%{http_code}" -X ${opts.method || 'GET'} ${headers} ${data} ${opts.url}`;
  return run(cmd);
}

const tests = [
  { name: 'GET /usuarios (admin)', url: `${BASE}/usuarios`, method: 'GET', headers: [`Authorization: Bearer ${JWT}`] },
  { name: 'GET /usuarios/:id', url: `${BASE}/usuarios/8f68ce64-8e40-48d4-baf2-8ac9c6691019`, method: 'GET', headers: [`Authorization: Bearer ${JWT}`] },
  { name: 'PUT /usuarios/:id update email', url: `${BASE}/usuarios/8f68ce64-8e40-48d4-baf2-8ac9c6691019`, method: 'PUT', headers: [`Authorization: Bearer ${JWT}`, 'Content-Type: application/json'], dataFile: 'scripts/update_user_payload.json' },
  { name: 'GET /consejos', url: `${BASE}/consejos`, method: 'GET', headers: [] },
  { name: 'GET /campesinos', url: `${BASE}/campesinos`, method: 'GET', headers: [] },
];

for (const t of tests) {
  process.stdout.write(`Running: ${t.name}... `);
  const httpCode = curl(t);
  console.log(httpCode);
}
