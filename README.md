# StreamFusion — web nueva

Web de streaming (películas, series, animes y doramas) en React + Vite + Tailwind v4,
conectada a **Firebase** (catálogo, usuarios, configuración) y a **TMDB** (imágenes,
logos, reparto). Es un rediseño visual completo de la web original: **toda la lógica,
los datos y el panel de administración son los mismos**.

| Carpeta | Qué es |
|---|---|
| `/` (raíz) | La web nueva (rediseño). Es la que se compila y se publica. |
| `original/` | Copia intacta del proyecto original (`D:\APPS\StreamFusion For Me`), para comparar o volver atrás. No se compila. |

> Ninguna de las dos carpetas incluye secretos: `public/config.js` (claves de Firebase/TMDB)
> y `.env` (licencia) están en `.gitignore`. Para desarrollar hay que copiarlos a mano
> (ver "Desarrollo").

---

## Desarrollo

```bash
npm ci
npm run dev        # http://localhost:8080
npm run build      # genera dist/ y borra dist/config.js (cada hosting pone el suyo)
npx tsc --noEmit -p .
```

Archivos locales necesarios (no están en el repo):

- `public/config.js` → define `window.__APP_CONFIG__ = { firebase: {...}, tmdb: { apiKey } }`.
  Plantilla: `public/config.example.js`.
- `.env` → `VITE_LICENSE_KEY`, `VITE_LIC_EP_B64`, `VITE_LICENSE_AUTH_TOKEN` y datos del vendedor.
  En `localhost` la licencia no se valida, así que para desarrollar basta con `config.js`.

Despliegue: igual que antes, ver `DEPLOY.md` (subir `dist/` + `config.js`, regla SPA
y `config.js` servido como JavaScript, no como `index.html`).

---

## Cómo funciona

### Arranque (`src/main.tsx` → `src/App.tsx`)

1. `applyTvModeClass()` marca `<html class="tv-mode">` en Smart TV/consolas (`src/lib/tvMode.ts`, forzable con `?tv=1` / `?tv=0`).
2. Se descarga `/config.js` con `fetch` y se ejecuta. Si devuelve HTML (fallo típico de Nginx) se guarda el error para la pantalla de configuración.
3. Solo después se importa `App` (así `firebase.ts` ya tiene la config).
4. `App` muestra `ConfigSetupScreen` si falta la config (fuera de localhost), luego `LicenseGate` (licencia por dominio, `src/lib/license.ts` contra un endpoint PHP), y después las rutas.
5. Componentes globales: `ThemeApplier` (colores del admin), `AdsCodeInjector`, `AntiAdblock`, `AnalyticsTracker`, `FloatingButton`, `Footer`, `Toaster`.

### Datos

**Firebase** (`src/lib/firebase.ts`, `src/lib/firestore.ts`):

| Colección / doc | Uso |
|---|---|
| `content/{tmdbId}` | Cada título: datos TMDB + `video_url` (película) o `seasons.{n}.episodes.{n}.video_url` (series), `display_options` (`main_sections`, `home_sections`: `estreno`/`agregado`, `platforms`). |
| `web_config/catalog_0..N` | **Índice ligero del catálogo** (`src/lib/catalog.ts`): resumen de todos los títulos sin temporadas ni URLs, repartido en trozos de ~700 KB. Un visitante hace 1-3 lecturas en vez de una por título. El admin lo actualiza solo al importar/editar/borrar y tiene botón "Reconstruir índice". |
| `web_config/settings` | Configuración de la web que edita el admin: `logoUrl`, `siteName`, `footerText`, `theme`, `heroSlider`, `top10`, `homepageSections`, `sectionTitles`, `visibleCategories`, `visiblePlatforms`, `platformImages`, anuncios, `floatingButtons`. Se lee con `useWebConfig()` (caché infinita en la sesión). |
| `web_config/splash`, `web_config/mobile_settings` | Config de las apps móvil/TV. |
| `users/{uid}` | Email, `registeredAt`, `lastSeen` (presencia cada 4 min), `myList`. |
| `messages` | Mensajes entre admin y usuarios. |
| `posterClicks/{id}` | Contador de clics por póster (estadísticas y Top 10). |

**Carga del catálogo** (`src/hooks/useContent.ts`): caché del navegador (`localStorage` `sf_catalog_v1`, 10 min) → índice `web_config/catalog_*` → si no existe índice, colección `content` completa. La ficha de un título (`useContentDetail`) lee el documento completo de `content` y añade el reparto de TMDB en vivo.

**TMDB** (`src/lib/tmdb.ts`): búsqueda e importación en el admin, detalles+créditos, temporadas, y logos del título (`TitleLogo`: español → inglés → texto). Imágenes con `getImageUrl` / `getBackdropUrl` (`src/lib/image.ts`, w1280 como máximo para fondos).

### Rutas y secciones

| Ruta | Página |
|---|---|
| `/` | Portada: hero "En cartelera", plataformas, Seguir viendo, En estreno, Recién agregado, Películas, Top 10, Series y una fila por género. Orden aleatorio estable por sesión (`sessionStorage`). Respeta lo que el admin oculta o renombra. |
| `/movies`, `/series`, `/animes`, `/doramas` | Rejilla con scroll infinito (`useInfiniteScroll`). Animes/Doramas filtran por `display_options.main_sections`. |
| `/category/:type` | `movies`, `series`, una plataforma (`netflix`, `disney`, `hbo`, `prime`, `paramount`) o un género. |
| `/search?q=` | Búsqueda local sobre el catálogo (sin tildes, título en español u original, sinopsis y géneros). |
| `/pelicula/:slug`, `/serie/:slug`, `/content/:id` | Ficha + reproductor. El slug termina en el `docId` (`src/lib/slug.ts`). `?autoplay=1` empieza a reproducir. |
| `/watch/:id` | Reproductor a pantalla completa (películas). |
| `/login`, `/profile`, `/messages` | Cuenta, mi lista y mensajes. |
| `/admin` | Panel (protegido con `ProtectedRoute`). |

### Reproductor

- `src/components/content/VideoPlayer.tsx`: si la URL es un embed (`embed`, `youtube`, `vimeo`, `iframe`) usa `<iframe>`; si no, `<video>` nativo. Si el iframe no carga en 8 s (típico en TV) ofrece abrirlo fuera.
- `src/hooks/usePlayerBridge.ts`: puente `postMessage` con el reproductor embebido para progreso, reanudar, saltar intro y "siguiente episodio".
- `src/lib/watchHistory.ts`: historial y progreso en `localStorage` (`sf_watch_history_v1`, `sf_watch_progress_v1`). Alimenta la fila "Seguir viendo" y el botón "Continuar T1 · E3".
- `src/lib/introMarks.ts`: marcas de intro/créditos por episodio (primero las del documento en Firestore, si no TheIntroDB, con caché `sf_introdb_cache_v1`).
- En la ficha de una serie: lista de episodios al lado del reproductor (escritorio) o debajo (móvil), selector de temporada (botones si hay ≤4, desplegable si hay más) y anterior/siguiente.

### Login y administradores

- `src/contexts/AuthContext.tsx`: Firebase Auth con email y contraseña (entrar, registrarse, recuperar contraseña). Al registrarse crea `users/{uid}`.
- **Admin**: no hay lista de emails en el código. Se intenta un `setDoc` vacío con `merge` sobre `web_config/settings`; si las reglas de Firestore lo permiten (`isAdmin()`), el usuario es admin. El resultado se cachea por sesión (`sf_is_admin_{uid}`).

### Panel de administración (`src/features/pages/AdminPage.tsx`)

Pestañas: importar desde TMDB (película/serie, URLs de video por episodio, marcas de intro), **Gestionar** (editar/borrar, reconstruir índice), **Usuarios** (paginados, en línea), **Mensajes**, **Estadísticas** (clics por póster) y **Configuración web**: logo, nombre, hero (nº de pósters y aleatorios), tema y colores (`ColorTokenPicker`, admite degradados), Top 10 (manual/aleatorio), títulos y cantidad por sección, visibilidad de secciones/géneros/plataformas, anuncios por slot, botones flotantes e imágenes de plataformas.

Slots de anuncios (`AdBanner`): `home_top`, `home_middle`, `home_bottom`, `movies_*`, `series_*`, `animes_*`, `doramas_*`, `content_top`, `content_middle`, `content_bottom`, `calendar`.

---

## Diseño de la web nueva

Idea: **cartelera de cine de noche**. Fondo azul tinta en lugar de negro, luz ámbar de proyector como único acento.

| Token | Valor | Uso |
|---|---|---|
| `--background` | `#10172A` (223 45% 11%) | Fondo |
| `--card` | `#172036` | Tarjetas, paneles |
| `--secondary` / `--border` | `#222B44` / `#263050` | Bordes, controles |
| `--primary` | `#F2B544` (39 87% 61%) | Acento ámbar: botones, activo, notas |
| `--foreground` | `#ECEEF5` | Texto |
| `--muted-foreground` | `#8F97B0` | Texto secundario |

- Tipografías (Google Fonts, en `src/styles.css`): **Bricolage Grotesque** para títulos (`font-display`; `font-condensed` usa su eje de ancho para los titulares grandes) e **Instrument Sans** para el texto.
- Los tokens siguen en formato HSL `--x: H S% L%`, así que **los colores que el admin elige en "Tema y colores" siguen mandando** (los aplica `ThemeApplier` encima de estos valores).
- `--sf-bottom-nav`: alto de la barra inferior en móvil (64 px); el `body` y los botones flotantes lo respetan.

Qué cambió respecto al original (solo presentación; ninguna llamada a datos se tocó):

| Archivo | Cambio |
|---|---|
| `src/styles.css`, `index.html` | Paleta, tipografías, foco visible, `prefers-reduced-motion`. |
| `components/layout/Navbar.tsx` | Buscador siempre visible en escritorio; en móvil, barra inferior con las 5 secciones y búsqueda a pantalla completa. |
| `components/home/Hero.tsx` | Hero "En cartelera": la función destacada a la izquierda y la lista de destacados a la derecha (tira de miniaturas en móvil) con barra de tiempo. |
| `components/home/ContentCard.tsx` | Póster limpio con título y año debajo; ahora es un `<Link>` real (se puede abrir en otra pestaña). |
| `components/home/ContentCarousel.tsx`, `Top10Carousel.tsx` | Cabeceras con flechas, números del Top 10 en contorno ámbar. |
| `components/layout/PageHeader.tsx` (nuevo) | Cabecera común con nº de títulos para Películas/Series/Animes/Doramas/Categoría. |
| `features/pages/LoginPage.tsx` | Muro de pósters del catálogo + formulario. |
| `features/pages/ContentPage.tsx`, `SearchPage.tsx`, `ContinueWatchingRow.tsx`, `PlatformFilter.tsx`, `Footer.tsx`, `FloatingButton.tsx` | Ajustes de estilo y textos. |

`AdminPage` no se tocó: hereda la paleta nueva por los tokens.

## Pendiente / ideas para el siguiente chat

- Revisar en una Smart TV real (`?tv=1`) la barra inferior y el hero.
- El panel de admin mantiene su maquetación original.
- Si se publica en Cloudflare, añadir el dominio a *Authentication → Authorized domains* en Firebase.
