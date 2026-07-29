const fs = require('fs');
const path = require('path');
const file = path.resolve('node_modules', '@prisma', 'client', 'runtime', 'library.js');
const txt = fs.readFileSync(file, 'utf8');
const findAll = (needle) => {
  let idx = 0;
  const results = [];
  while ((idx = txt.indexOf(needle, idx)) !== -1) {
    results.push(idx);
    idx += needle.length;
  }
  return results;
};
const dump = (idx, len = 400) => {
  const start = Math.max(0, idx - len);
  const end = Math.min(txt.length, idx + len);
  return txt.slice(start, end).replace(/\r?\n/g, '\\n');
};
const needles = ['function hl', 'hl(', 'function Yl', 'new Dr', 'new _r', 'copyEngine', 'PRISMA_CLIENT_ENGINE_TYPE', 'PRISMA_CLIENT_DATA_PROXY', 'dataloader', 'adapter', 'engineType', 'library', 'binary'];

for (const needle of needles) {
  const occ = findAll(needle);
  console.log('===', needle, 'count', occ.length);
  for (const idx of occ.slice(0, 5)) {
    console.log('at', idx);
    console.log(dump(idx, 260));
    console.log('---');
  }
}
