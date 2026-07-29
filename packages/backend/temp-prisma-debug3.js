const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const envPath = path.resolve(__dirname, '.env');
console.log('cwd', process.cwd());
console.log('envPath', envPath);
console.log('exists', fs.existsSync(envPath));
if (fs.existsSync(envPath)) {
  console.log('envContents:', fs.readFileSync(envPath, 'utf8'));
}
console.log('BEFORE env DATABASE_URL=', process.env.DATABASE_URL || '<unset>');
const res = dotenv.config({ path: envPath });
console.log('dotenv result', res.error ? String(res.error) : JSON.stringify(res.parsed, null, 2));
console.log('AFTER env DATABASE_URL=', process.env.DATABASE_URL || '<unset>');
const envKeys = Object.keys(process.env).filter(k => k.startsWith('PRISMA') || k.startsWith('DATABASE') || k.startsWith('NODE') || k.startsWith('NPM') || k.startsWith('PATH')).sort();
console.log('relevant env keys:', envKeys.length);
envKeys.forEach(k => console.log(k + '=' + process.env[k]));
console.log('require.resolve @prisma/client =', require.resolve('@prisma/client'));
const pkg = require('@prisma/client/package.json');
console.log('@prisma/client version', pkg.version);
const { PrismaClient } = require('@prisma/client');
const client = new PrismaClient();
console.log('client created');
const engine = client._engineConfig;
const interesting = {
  cwd: engine.cwd,
  dirname: engine.dirname,
  engineEndpoint: engine.engineEndpoint,
  engineVersion: engine.engineVersion,
  generator: engine.generator,
  activeProvider: engine.activeProvider,
  previewFeatures: engine.previewFeatures,
  inlineDatasources: engine.inlineDatasources,
  overrideDatasources: engine.overrideDatasources,
  relativeEnvPaths: engine.relativeEnvPaths,
  datamodelPath: engine.datamodelPath,
  prismaPath: engine.prismaPath,
  engineWasm: engine.engineWasm,
  adapter: engine.adapter,
  env: engine.env,
};
console.log('engineConfig', JSON.stringify(interesting, null, 2));
console.log('client._config keys', Object.keys(client._config || {}));
console.log('client._config', client._config);
client.$connect().then(() => {
  console.log('connected');
  return client.$disconnect();
}).catch(e => {
  console.error('connect error', e);
  process.exit(1);
});
