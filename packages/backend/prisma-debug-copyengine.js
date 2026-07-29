const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const envPath = path.resolve(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('.env missing');
  process.exit(1);
}
dotenv.config({ path: envPath });
console.log('DATABASE_URL', process.env.DATABASE_URL);
process.env.PRISMA_CLIENT_ENGINE_TYPE = 'library';
const { PrismaClient } = require('@prisma/client');
const client = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
console.log('engine name', client._engine?.name);
console.log('engine ctor', client._engine?.constructor?.name);
console.log('cfg copyEngine', client._engineConfig?.copyEngine);
console.log('cfg keys', Object.keys(client._engineConfig || {}));
console.log('cfg entries', JSON.stringify(Object.entries(client._engineConfig || {}).filter(([k])=>['copyEngine','adapter','datasources','relativeEnvPaths','generator','inlineDatasources','overrideDatasources'].includes(k)), null,2));
console.log('engine config inlineDatasources', JSON.stringify(client._engineConfig?.inlineDatasources, null, 2));
console.log('engine config overrideDatasources', JSON.stringify(client._engineConfig?.overrideDatasources, null, 2));
console.log('engine config generator', JSON.stringify(client._engineConfig?.generator?.config, null, 2));
console.log('engine sett copyEngine', client._engineConfig?.copyEngine);
console.log('engine full config keys', Object.keys(client._engine?.config || {}));
console.log('engine config overrideDatasources', JSON.stringify(client._engine?.config?.overrideDatasources, null, 2));
console.log('engine config inlineDatasources', JSON.stringify(client._engine?.config?.inlineDatasources, null, 2));
console.log('engine config generator', JSON.stringify(client._engine?.config?.generator?.config, null, 2));
