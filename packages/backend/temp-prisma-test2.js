const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const envPath = path.resolve(__dirname, '.env');
console.log('cwd', process.cwd());
console.log('script dir', __dirname);
console.log('envPath', envPath);
console.log('exists', fs.existsSync(envPath));
console.log('env before', process.env.DATABASE_URL || '<unset>');
const result = dotenv.config({ path: envPath });
console.log('dotenv parse result', result.error ? String(result.error) : JSON.stringify(result.parsed));
console.log('env after', process.env.DATABASE_URL || '<unset>');
console.log('require.resolve @prisma/client', require.resolve('@prisma/client'));
const pkg = require('@prisma/client/package.json');
console.log('@prisma/client version', pkg.version);
const { PrismaClient } = require('@prisma/client');
const client = new PrismaClient();
console.log('client created');
console.log('client constructor props:');
console.log('constructor config keys:', Object.keys(client));
if (client._engineConfig) {
  console.log('_engineConfig keys', Object.keys(client._engineConfig));
  console.log('previewFeatures', client._engineConfig.previewFeatures);
  console.log('relativeEnvPaths', client._engineConfig.relativeEnvPaths);
  console.log('activeProvider', client._engineConfig.activeProvider);
  console.log('datasources', client._engineConfig.datasources);
}
if (client._config) {
  console.log('_config keys', Object.keys(client._config));
  console.log('_config', client._config);
}
client.$connect().then(() => {
  console.log('connected');
  return client.$disconnect();
}).catch((e) => {
  console.error('connect error', e);
  if (e.clientVersion) console.error('error clientVersion', e.clientVersion);
  process.exit(1);
});
