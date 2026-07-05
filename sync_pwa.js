// Regenera index.html a partir de "../App Test Contabilidad.html" (la fuente de verdad)
// añadiendo lo necesario para PWA, y sella sw.js con un hash del contenido.
// Uso: node sync_pwa.js   (después: git add -A && git commit && git push)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SRC = path.join(__dirname, '..', 'App Test Contabilidad.html');
const html = fs.readFileSync(SRC, 'utf8');

// sanidad mínima de la fuente
if (!/const DATA\s*=/.test(html)) throw new Error('No encuentro `const DATA` en la fuente');
if (!/<title>/.test(html)) throw new Error('No encuentro <title> en la fuente');
if (/serviceWorker/.test(html)) throw new Error('La fuente ya registra un service worker: revisa antes de inyectar otro');

const head = `<!doctype html>
<html lang="es">
<meta charset="utf-8">
<link rel="manifest" href="manifest.webmanifest">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<meta name="apple-mobile-web-app-title" content="Contabilidad">
<meta name="theme-color" content="#0a0a0c">
<link rel="apple-touch-icon" href="icon-180.png">
<link rel="icon" type="image/png" sizes="180x180" href="icon-180.png">
`;
const tail = `
<script>
if ('serviceWorker' in navigator) {
  addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js').catch(function () {});
  });
}
</script>
`;

const out = head + html + tail;
fs.writeFileSync(path.join(__dirname, 'index.html'), out);

// versión del SW = hash de todo lo precacheado, para que un deploy con cambios
// fuerce la actualización de la caché y uno sin cambios no toque nada
const h = crypto.createHash('sha1');
h.update(out);
for (const f of ['manifest.webmanifest', 'icon-180.png', 'icon-512.png']) {
  h.update(fs.readFileSync(path.join(__dirname, f)));
}
const ver = h.digest('hex').slice(0, 10);

const swPath = path.join(__dirname, 'sw.js');
const sw = fs.readFileSync(swPath, 'utf8')
  .replace(/const VERSION = '[^']*';/, `const VERSION = '${ver}';`);
fs.writeFileSync(swPath, sw);

console.log(`index.html generado (${out.length} bytes), SW version ${ver}`);
