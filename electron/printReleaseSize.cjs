const fs = require('fs');
const path = require('path');

const releaseDir = path.join(__dirname, '..', 'release');

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  const kb = bytes / 1024;
  if (kb < 1024) return kb.toFixed(1) + ' KB';
  const mb = kb / 1024;
  return mb.toFixed(1) + ' MB';
}

function getDirSize(dirPath) {
  let totalSize = 0;
  if (!fs.existsSync(dirPath)) return 0;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      totalSize += getDirSize(fullPath);
    } else {
      totalSize += fs.statSync(fullPath).size;
    }
  }
  return totalSize;
}

if (!fs.existsSync(releaseDir)) {
  console.log('No release directory found. Run electron:build first.');
  process.exit(1);
}

// Print installer files
const files = fs.readdirSync(releaseDir).filter(f => {
  const ext = path.extname(f).toLowerCase();
  return ['.exe', '.msi', '.appimage', '.dmg', '.snap', '.deb', '.rpm'].includes(ext);
});

if (files.length > 0) {
  console.log('\nInstaller files:');
  for (const file of files) {
    const size = fs.statSync(path.join(releaseDir, file)).size;
    console.log(`  ${file}: ${formatBytes(size)}`);
  }
}

// Print unpacked size
const unpackedDir = path.join(releaseDir, 'win-unpacked');
if (fs.existsSync(unpackedDir)) {
  console.log(`\nUnpacked size: ${formatBytes(getDirSize(unpackedDir))}`);
}

console.log('');
