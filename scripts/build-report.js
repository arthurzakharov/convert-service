const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const root = process.cwd();
const distDir = path.join(root, 'dist');
const packageJson = require(path.join(root, 'package.json'));

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(fullPath) : [fullPath];
    })
    .sort();
}

function bytesToHuman(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function gzipSize(file) {
  return zlib.gzipSync(fs.readFileSync(file)).length;
}

function relative(file) {
  return path.relative(root, file);
}

function logTable(rows) {
  const width = Math.max(...rows.map((row) => row.file.length), 'file'.length);

  console.log(`${'file'.padEnd(width)}  size      gzip`);
  console.log(`${'-'.repeat(width)}  --------  --------`);
  rows.forEach((row) => {
    console.log(`${row.file.padEnd(width)}  ${row.size.padStart(8)}  ${row.gzip.padStart(8)}`);
  });
}

const files = walk(distDir);
const rows = files.map((file) => {
  const bytes = fs.statSync(file).size;
  const gzipBytes = gzipSize(file);

  return {
    file: relative(file),
    bytes,
    gzipBytes,
    size: bytesToHuman(bytes),
    gzip: bytesToHuman(gzipBytes),
  };
});

const totalBytes = rows.reduce((sum, row) => sum + row.bytes, 0);
const totalGzipBytes = rows.reduce((sum, row) => sum + row.gzipBytes, 0);

console.log('\nBuild output');
logTable(rows);
console.log('--------------------');
console.log(`files: ${rows.length}`);
console.log(`dist size: ${bytesToHuman(totalBytes)}`);
console.log(`dist gzip size: ${bytesToHuman(totalGzipBytes)}`);

console.log('\nPackage entrypoints');
console.log(`main: ${packageJson.main}`);
console.log(`types: ${packageJson.types}`);
Object.entries(packageJson.exports ?? {}).forEach(([name, config]) => {
  const entry = typeof config === 'string' ? config : config.default;
  const types = typeof config === 'string' ? undefined : config.types;
  console.log(`${name}: ${entry}${types ? ` (${types})` : ''}`);
});
