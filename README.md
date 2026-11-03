# Velox Play — Studio Web

Catálogo de películas y series en audio Latino, conectado a Supabase.
Hecho con **HTML + CSS + JavaScript puro**: sin frameworks, sin build step,
abre `index.html` o súbelo a GitHub Pages / Vercel / Netlify.

## 🚀 Puesta en marcha

```bash
cp js/config.example.js js/config.js
# edita js/config.js con tu SUPABASE_URL y SUPABASE_KEY
```

Luego sirve la carpeta en cualquier servidor estático:

```bash
# cualquiera de estos
python -m http.server 8080
npx http-server .
```

Abre `http://localhost:8080`.

## 🔒 Credenciales

- `js/config.js` **está en `.gitignore`** y NUNCA se sube a GitHub.
- Usa solo la **publishable / anon key** de Supabase en el cliente.
  Es segura siempre que tengas **RLS activo** en todas las tablas.
- La `service_role` key JAMÁS debe tocar el navegador.

Si vas a desplegar en Vercel/Netlify, inyecta las variables en runtime
desde su panel de env vars (edita `js/config.js` durante el build o usa
un pequeño endpoint de proxy).

## 🧱 Arquitectura

- **Paginado real**: cada fila pide 20 ítems con `Range: 0-19` HTTP.
  Scroll horizontal cerca del final → siguiente página. Nunca se lee
  el catálogo completo de golpe.
- **Views Supabase**: `v_pelis_lista`, `v_series_lista`.
- **RPC**: `obtener_serie_completa(p_serie_id)` para detalle de series.
- **Picker de servidores** con color por host (verde vidhide, azul
  streamwish, amarillo filemoon, etc.), igual que la app móvil/TV.

## 📱 Responsive

Mobile-first. Breakpoints en 480px, 840px y por encima. Grid de posters
se ajusta automáticamente al ancho del dispositivo.

## 🧭 SEO

- `robots.txt`, `sitemap.xml` incluidos.
- Meta Open Graph y Twitter Cards.
- JSON-LD `WebSite` con `SearchAction`.
- Idioma `es-MX`, canonical, descripción.

## 🌐 Deploy en GitHub Pages

```bash
# dentro de /web
git init
git add .
git commit -m "Velox Play — primer deploy"
git branch -M main
git remote add origin https://github.com/flashanaaya18/velox-play-studio.git
git push -u origin main
```

En GitHub → Settings → Pages → Source: **`main` / root**.
El sitio quedará en `https://flashanaaya18.github.io/velox-play-studio/`.

**Antes de hacer push**: verifica que `js/config.js` NO aparece en
`git status`. Si aparece, ejecuta `git rm --cached js/config.js` y
vuelve a commitear.

## 📂 Estructura

```
web/
├── index.html
├── manifest.webmanifest
├── robots.txt
├── sitemap.xml
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   ├── config.example.js
│   └── config.js         ← gitignored
└── assets/
    └── icon.svg
```
