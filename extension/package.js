const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const outputPath = path.join(__dirname, 'rpa-flow-recorder.zip');

if (!fs.existsSync(distDir)) {
  console.error('❌ dist/ が見つかりません。先に npm run build を実行してください。');
  process.exit(1);
}

const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`✅ パッケージ作成完了: ${outputPath} (${archive.pointer()} bytes)`);
});

archive.on('error', (err) => { throw err; });
archive.pipe(output);
archive.directory(distDir, false);
archive.finalize();
