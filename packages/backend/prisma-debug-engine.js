const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const envPath = path.resolve(__dirname, '.env');
console.log('cwd', process.cwd());
console.log('envPath', envPath);
if (!fs.existsSync(envPath)) {
  console.error('.env missing');
  process.exit(1);
}
console.log('loading .env');
dotenv.config({ path: envPath });
console.log('before override env DATABASE_URL', process.env.DATABASE_URL);
process.env.PRISMA_CLIENT_ENGINE_TYPE = 'library';
process.env.PRISMA_CLI_QUERY_ENGINE_TYPE = 'library';
process.env.PRISMA_CLIENT_ENGINE_ENDPOINT = '';
process.env.PRISMA_CLIENT_DATA_PROXY_CLIENT_VERSION = '';
console.log('set PRISMA_CLIENT_ENGINE_TYPE', process.env.PRISMA_CLIENT_ENGINE_TYPE);
console.log('set PRISMA_CLI_QUERY_ENGINE_TYPE', process.env.PRISMA_CLI_QUERY_ENGINE_TYPE);
console.log('DATABASE_URL', process.env.DATABASE_URL);
const { PrismaClient } = require('@prisma/client');
const client = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
console.log('client created');
console.log('engine name', client._engine?.name);
console.log('engine constructor', client._engine?.constructor?.name);
console.log('engine config generator config', JSON.stringify(client._engineConfig?.generator?.config));
console.log('engine config inlineDatasources', JSON.stringify(client._engineConfig?.inlineDatasources));
console.log('engine config overrideDatasources', JSON.stringify(client._engineConfig?.overrideDatasources));
console.log('engine env DATABASE_URL', client._engine?.env?.DATABASE_URL);
client.$connect().then(() => {
  console.log('connected');
  return client.$disconnect();
}).catch((e) => {
  console.error('connect error', e.message);
  console.error('stack', e.stack);
  process.exit(1);
});
