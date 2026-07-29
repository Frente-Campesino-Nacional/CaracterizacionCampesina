const path = require('path');
const resolve = require('resolve');
const base = path.resolve(__dirname);
console.log('cwd', process.cwd());
console.log('base', base);
console.log('@prisma/client resolved from backend', resolve.sync('@prisma/client', { basedir: base }));
console.log('@prisma/client runtime resolved from backend', resolve.sync('@prisma/client/runtime/library.js', { basedir: base }));
console.log('prisma client version', require(resolve.sync('@prisma/client/package.json', { basedir: base })).version);
console.log('runtime path exists', require('fs').existsSync(resolve.sync('@prisma/client/runtime/library.js', { basedir: base })));
