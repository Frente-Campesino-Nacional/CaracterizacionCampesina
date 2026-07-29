const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', 'node_modules', '@prisma', 'client', 'runtime', 'library.js');
if (!fs.existsSync(file)) {
  console.error('missing', file);
  process.exit(1);
}
const txt = fs.readFileSync(file, 'utf8');
const term = 'extractHostAndApiKey';
let idx = txt.indexOf(term);
console.log('term idx', idx);
if (idx !== -1) {
  const start = Math.max(0, idx - 400);
  const end = Math.min(txt.length, idx + 1200);
  const slice = txt.slice(start, end);
  const lines = slice.split(/\r?\n/);
  lines.forEach((line, i) => {
    const lineNum = i + 1;
    console.log(`${lineNum}: ${line}`);
  });
}
