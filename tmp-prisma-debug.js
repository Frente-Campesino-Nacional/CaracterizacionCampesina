const fs = require('fs');
const path = require('path');
function inspect(filePath, terms) {
  const abs = path.resolve(filePath);
  console.log('FILE:', abs);
  if (!fs.existsSync(abs)) {
    console.log('MISSING', abs);
    return;
  }
  const txt = fs.readFileSync(abs, 'utf8');
  for (const term of terms) {
    const idx = txt.indexOf(term);
    if (idx === -1) continue;
    console.log('--- TERM:', term, 'AT', idx);
    const start = Math.max(0, idx - 160);
    const end = Math.min(txt.length, idx + 240);
    console.log(txt.slice(start, end).replace(/\r?\n/g, '\\n'));
  }
}
inspect('node_modules/.prisma/client/index.js', ['relativeEnvPaths', 'schemaEnvPath', 'rootEnvPath', 'inlineDatasources', 'fromEnvVar', 'value', 'env', 'url']);
inspect('node_modules/@prisma/client/runtime/library.js', ['relativeEnvPaths', 'schemaEnvPath', 'rootEnvPath', 'loadEnv', 'dotenv', 'process.env', 'new URL', 'prisma://', 'InvalidDatasourceError']);
