// Produktions-Build für das Frontend (läuft im Docker-Build, siehe Dockerfile).
//
// Lokal bleibt frontend/ unverändert lauffähig (Babel im Browser, React-Dev-Build).
// Für die ausgelieferte App wird hier:
//   1. jede .jsx-Datei mit esbuild vorkompiliert + minifiziert (→ .js),
//   2. data.js / api-bridge.js minifiziert,
//   3. React + ReactDOM als Produktions-Build lokal unter vendor/ abgelegt,
//   4. FitTracker.html umgeschrieben: kein Babel mehr, kompilierte Skripte, Prod-React.
// Ergebnis: deutlich schnellerer Start auf dem Handy (kein Übersetzen bei jedem Öffnen).
//
// Aufruf: node build.mjs <frontend-dir> <out-dir>

import { transform } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const [src, out] = process.argv.slice(2);
if (!src || !out) {
  console.error('usage: node build.mjs <frontend-dir> <out-dir>');
  process.exit(1);
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'vendor'), { recursive: true });

const opts = { target: 'es2020', minify: true, charset: 'utf8', legalComments: 'none' };

for (const name of fs.readdirSync(src)) {
  const from = path.join(src, name);
  if (!fs.statSync(from).isFile()) continue;
  const code = fs.readFileSync(from, 'utf8');
  if (name.endsWith('.jsx')) {
    const res = await transform(code, { ...opts, loader: 'jsx', sourcefile: name });
    fs.writeFileSync(path.join(out, name.replace(/\.jsx$/, '.js')), res.code);
  } else if (name.endsWith('.js')) {
    const res = await transform(code, { ...opts, loader: 'js', sourcefile: name });
    fs.writeFileSync(path.join(out, name), res.code);
  } else {
    fs.copyFileSync(from, path.join(out, name));
  }
}

// React-Produktions-Builds lokal ausliefern (keine CDN-Abhängigkeit, kein SRI nötig)
const reactDir = path.dirname(require.resolve('react/package.json'));
const reactDomDir = path.dirname(require.resolve('react-dom/package.json'));
fs.copyFileSync(path.join(reactDir, 'umd/react.production.min.js'), path.join(out, 'vendor/react.production.min.js'));
fs.copyFileSync(path.join(reactDomDir, 'umd/react-dom.production.min.js'), path.join(out, 'vendor/react-dom.production.min.js'));

// FitTracker.html umschreiben
const htmlPath = path.join(out, 'FitTracker.html');
let html = fs.readFileSync(htmlPath, 'utf8');
const before = html;

const mount = await transform(
  "ReactDOM.createRoot(document.getElementById('root-host')).render(<App />);",
  { ...opts, loader: 'jsx' },
);
fs.writeFileSync(path.join(out, 'main.js'), mount.code);

html = html
  .replace(/<script[^>]*react\.development\.js[^>]*><\/script>/, '<script src="vendor/react.production.min.js"></script>')
  .replace(/<script[^>]*react-dom\.development\.js[^>]*><\/script>/, '<script src="vendor/react-dom.production.min.js"></script>')
  .replace(/<script[^>]*@babel\/standalone[^>]*><\/script>\s*/, '')
  .replace(/<script type="text\/babel" src="([^"]+)\.jsx"><\/script>/g, '<script src="$1.js"></script>')
  .replace(/<script type="text\/babel" data-presets="react">[\s\S]*?<\/script>/, '<script src="main.js"></script>');

for (const leftover of ['text/babel', 'babel.min.js', '.development.js']) {
  if (html.includes(leftover)) {
    console.error(`FitTracker.html: "${leftover}" konnte nicht ersetzt werden`);
    process.exit(1);
  }
}
if (html === before) process.exit(1);
fs.writeFileSync(htmlPath, html);

// .jsx-Quellen werden nicht mehr gebraucht
for (const name of fs.readdirSync(out)) if (name.endsWith('.jsx')) fs.rmSync(path.join(out, name));
console.log('Frontend-Build fertig:', fs.readdirSync(out).length, 'Dateien');
