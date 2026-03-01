const fs = require('fs');
const path = require('path');

const srcDir = __dirname;
const distDir = path.join(__dirname, 'dist');

// distディレクトリをクリーン作成
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true });
}
fs.mkdirSync(distDir, { recursive: true });
fs.mkdirSync(path.join(distDir, 'icons'), { recursive: true });

// コピーするファイル
const files = [
  'manifest.json',
  'content.js',
  'background.js',
  'popup.html',
  'popup.js',
];

files.forEach(file => {
  const src = path.join(srcDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(distDir, file));
    console.log(`✅ Copied: ${file}`);
  } else {
    console.warn(`⚠️  Missing: ${file}`);
  }
});

// アイコンコピー
['icon16.png', 'icon48.png', 'icon128.png'].forEach(icon => {
  const src = path.join(srcDir, 'icons', icon);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(distDir, 'icons', icon));
    console.log(`✅ Copied: icons/${icon}`);
  }
});

console.log('\n🎉 Build complete! dist/ ディレクトリを確認してください。');
