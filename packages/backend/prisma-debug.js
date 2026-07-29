const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const envPath = path.resolve(__dirname, '.env');
console.log('cwd', process.cwd());
console.log('envPath', envPath);
console.log('env exists', fs.existsSync(envPath));
if (fs.existsSync(envPath)) {
  console.log('env first lines:', fs.readFileSync(envPath, 'utf8').split(/\r?\n/).slice(0, 8).join('\n'));
}
console.log('before DATABASE_URL', process.env.DATABASE_URL || '<unset>');
const res = dotenv.config({ path: envPath });
console.log('dotenv result', res.error ? String(res.error) : JSON.stringify(res.parsed));
console.log('after DATABASE_URL', process.env.DATABASE_URL || '<unset>');
console.log('relevant env vars:');
Object.keys(process.env)
  .filter((k) => /^(DATABASE|PRISMA|NODE|NPM|PATH)/.test(k))
  .sort()
  .forEach((k) => console.log(`${k}=${process.env[k]}`));
console.log('require.resolve @prisma/client', require.resolve('@prisma/client'));
const pkg = require('@prisma/client/package.json');
console.log('@prisma/client version', pkg.version);
const { PrismaClient } = require('@prisma/client');
const client = new PrismaClient();
console.log('client engine name', client._engine?.name);
console.log('client engine constructor', client._engine?.constructor?.name);
console.log('client engine constructor prototype', Object.getPrototypeOf(client._engine)?.constructor?.name);
console.log('client engine config adapter', client._engine?.config?.adapter);
console.log('client engine config inlineDatasources', JSON.stringify(client._engine?.config?.inlineDatasources));
console.log('client engine config overrideDatasources', JSON.stringify(client._engine?.config?.overrideDatasources));
console.log('client engine config generator', JSON.stringify(client._engine?.config?.generator));
console.log('client engine env DATABASE_URL', client._engine?.env?.DATABASE_URL);
console.log('client engine env keys', Object.keys(client._engine?.env || {}).filter(k => /DATABASE|PRISMA|NODE|PATH/.test(k)));
console.log('client _engineConfig relativeEnvPaths', JSON.stringify(client._engineConfig?.relativeEnvPaths));
console.log('client _engineConfig inlineDatasources', JSON.stringify(client._engineConfig?.inlineDatasources));
console.log('client _engineConfig overrideDatasources', JSON.stringify(client._engineConfig?.overrideDatasources));
console.log('client _engineConfig env DATABASE_URL', client._engineConfig?.env?.DATABASE_URL);
console.log('client _engineConfig env keys', Object.keys(client._engineConfig?.env || {}).filter(k => /DATABASE|PRISMA|NODE|PATH/.test(k)));
console.log('client _engineConfig generator config', JSON.stringify(client._engineConfig?.generator?.config));
