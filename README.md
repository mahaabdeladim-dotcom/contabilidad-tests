# Contabilidad · Tests (PWA)

App de tests de Contabilidad instalable y usable sin conexión.

- Fuente de verdad: `../App Test Contabilidad.html` (fuera de este repo).
- Para actualizar: `node sync_pwa.js` y después commit + push. GitHub Pages redespliega solo.
- `sync_pwa.js` inyecta manifest, iconos y registro del service worker, y sella `sw.js` con un hash del contenido para invalidar la caché sólo cuando algo cambia.
