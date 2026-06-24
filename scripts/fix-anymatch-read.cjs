const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const src = path.join(repoRoot, 'node_modules', 'picomatch');
const nestedPackages = ['anymatch', 'readdirp'];
const metroWorkerPath = path.join(repoRoot, 'node_modules', 'metro-file-map', 'src', 'worker.js');

function copyDirRecursive(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const fromPath = path.join(from, entry.name);
    const toPath = path.join(to, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(fromPath, toPath);
      continue;
    }

    fs.copyFileSync(fromPath, toPath);
  }
}

function repairNestedPicomatch(packageName) {
  const dstParent = path.join(repoRoot, 'node_modules', packageName, 'node_modules');
  const dst = path.join(dstParent, 'picomatch');

  if (!fs.existsSync(src)) {
    throw new Error(`Missing source package: ${src}`);
  }

  fs.mkdirSync(dstParent, { recursive: true });
  if (fs.existsSync(dst)) {
    fs.rmSync(dst, { recursive: true, force: true });
  }

  copyDirRecursive(src, dst);
}

function ensureReadable(moduleName) {
  try {
    require(moduleName);
    console.log(`[fix-anymatch-read] ${moduleName} OK`);
  } catch (error) {
    if (error && error.code === 'UNKNOWN' && error.syscall === 'read') {
      console.log(`[fix-anymatch-read] repairing nested picomatch for ${moduleName}...`);
      repairNestedPicomatch(moduleName);
      require(moduleName);
      console.log(`[fix-anymatch-read] repair applied for ${moduleName}`);
      return;
    }

    throw error;
  }
}

for (const moduleName of nestedPackages) {
  ensureReadable(moduleName);
}

function patchMetroWorkerReadRetries() {
  if (!fs.existsSync(metroWorkerPath)) {
    console.log('[fix-anymatch-read] metro worker not found, skipping patch');
    return;
  }

  const original = fs.readFileSync(metroWorkerPath, 'utf8');
  if (original.includes('let lastReadError;')) {
    console.log('[fix-anymatch-read] metro worker patch already applied');
    return;
  }

  const target = '      content = fs.readFileSync(filePath);';
  const replacement = [
    '      let lastReadError;',
    '      for (let attempt = 0; attempt < 10; attempt += 1) {',
    '        try {',
    '          content = fs.readFileSync(filePath);',
    '          lastReadError = null;',
    '          break;',
    '        } catch (error) {',
    "          if (error && (error.code === 'UNKNOWN' || error.code === 'EBUSY')) {",
    '            lastReadError = error;',
    '            continue;',
    '          }',
    '          throw error;',
    '        }',
    '      }',
    '      if (lastReadError) {',
    "        if (!lastReadError.path) {",
    '          lastReadError.path = filePath;',
    '        }',
    "        if (!String(lastReadError.message || '').includes('[metro-file-path=')) {",
    "          lastReadError.message = String(lastReadError.message || '') + ' [metro-file-path=' + filePath + ']';",
    '        }',
    '        throw lastReadError;',
    '      }',
  ].join('\n');

  if (!original.includes(target)) {
    console.log('[fix-anymatch-read] metro worker target not found, skipping patch');
    return;
  }

  const patched = original.replace(target, replacement);
  fs.writeFileSync(metroWorkerPath, patched, 'utf8');
  console.log('[fix-anymatch-read] metro worker patch applied');
}

patchMetroWorkerReadRetries();
