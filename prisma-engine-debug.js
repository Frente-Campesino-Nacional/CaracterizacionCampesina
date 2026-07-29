const fs = require('fs');
const path = require('path');
const libPath = path.resolve('node_modules', '@prisma', 'client', 'runtime', 'library.js');
const txt = fs.readFileSync(libPath, 'utf8');
const needle = 'if(o)return new Dr(t);if(a)return new _r(t);throw new J';
const idx = txt.indexOf(needle);
console.log('needle idx =', idx);
if (idx === -1) {
  console.log('needle not found');
  process.exit(1);
}
const start = Math.max(0, idx - 600);
const end = Math.min(txt.length, idx + 600);
const slice = txt.slice(start, end);
const lines = slice.split(/\r?\n/);
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const prefix = `${i + 1}: `;
  if (line.includes('if(o)') || line.includes('if(a)') || line.includes('if (o)') || line.includes('if (a)') || line.includes('var ') || line.includes('const ') || line.includes('function ') || line.includes('DataProxyEngine') || line.includes('LibraryEngine') || line.includes('clientVersion') || line.includes('generator')) {
    console.log(prefix + line);
  }
}
console.log('--- full slice ---');
console.log(slice);
