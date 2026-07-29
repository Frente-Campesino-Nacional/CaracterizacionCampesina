const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const envPath = path.resolve(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('.env not found', envPath);
  process.exit(1);
}
dotenv.config({ path: envPath });
process.env.PRISMA_CLIENT_ENGINE_TYPE = 'library';
const { PrismaClient } = require('@prisma/client');
console.log('DATABASE_URL', process.env.DATABASE_URL);
const client = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
const cfg = client._engineConfig;
console.log('overrideDatasources', JSON.stringify(cfg.overrideDatasources, null, 2));
console.log('inlineDatasources', JSON.stringify(cfg.inlineDatasources, null, 2));
console.log('env parsed keys', Object.keys(cfg.env).filter(k => k.includes('DATABASE') || k.includes('PRISMA') || k.includes('NODE') || k.includes('PATH')));
console.log('engine constructor', client._engine?.constructor?.name);
console.log('engine name', client._engine?.name);
console.log('copyEngine', cfg.copyEngine);
function Nt({ inlineDatasources, overrideDatasources, env, clientVersion }) {
  const datasource = Object.keys(inlineDatasources)[0];
  const inline = inlineDatasources[datasource]?.url;
  const override = overrideDatasources[datasource]?.url;
  let resolved;
  if (override) {
    resolved = override;
  } else if (inline?.value) {
    resolved = inline.value;
  } else if (inline?.fromEnvVar) {
    resolved = env[inline.fromEnvVar];
  }
  console.log('datasource', datasource);
  console.log('inline', inline);
  console.log('override', override);
  console.log('resolved', resolved);
  console.log('starts prisma://', resolved?.startsWith('prisma://'));
  console.log('starts prisma+postgres://', resolved?.startsWith('prisma+postgres://'));
  console.log('resolved typeof', typeof resolved);
  return resolved;
}
const resolvedUrl = Nt({ inlineDatasources: cfg.inlineDatasources, overrideDatasources: cfg.overrideDatasources, env: cfg.env, clientVersion: cfg.clientVersion });
console.log('resolvedUrl', resolvedUrl);
console.log('n', !!(resolvedUrl?.startsWith('prisma://') || resolvedUrl?.startsWith('prisma+postgres://')));
