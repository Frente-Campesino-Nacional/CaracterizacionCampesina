const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const envPath = path.resolve(__dirname, '.env');
console.log('cwd', process.cwd());
console.log('envPath', envPath);
console.log('exists', fs.existsSync(envPath));
if (fs.existsSync(envPath)) {
  console.log('envContents', fs.readFileSync(envPath, 'utf8').split(/\r?\n/).slice(0, 6).join('\n'));
}
console.log('before', process.env.DATABASE_URL || '<unset>');
const result = dotenv.config({ path: envPath });
console.log('dotenv', result.error ? String(result.error) : JSON.stringify(result.parsed));
console.log('after', process.env.DATABASE_URL || '<unset>');
try {
  const { PrismaClient } = require('@prisma/client');
  const client = new PrismaClient();
  console.log('constructed');
  client.$connect().then(() => {
    console.log('connected');
    return client.$disconnect();
  }).catch((e) => {
    console.error('connect error', e);
    process.exit(1);
  });
} catch (e) {
  console.error('constructor error', e);
  process.exit(1);
}
