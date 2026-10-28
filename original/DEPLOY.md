# 🚀 Guía de instalación — StreamFusion

Bienvenido. Este paquete contiene tu sitio **ya listo para subir**.
No necesitas Node.js, ni compilar nada, ni instalar dependencias.

Solo sigues estos pasos en orden y tu web queda online.

---

## 📦 ¿Qué recibes?

Una carpeta llamada **`sfthemes/`** con todo el sitio dentro:

```
sfthemes/
├── index.html          ← página principal
├── assets/             ← JS, CSS, imágenes (NO TOCAR)
├── .htaccess           ← redirecciones para Apache/cPanel
├── _redirects          ← redirecciones para Netlify/Cloudflare
└── config.example.js   ← plantilla de configuración
```

> ⚠️ **Importante:** el archivo `config.js` **NO viene incluido**.
> Tú lo creas en el paso 3 con tus propias credenciales.

---

## 🗂️ Resumen de los pasos

1. Tener un dominio listo y apuntando a tu hosting/VPS.
2. Crear tus cuentas de **Firebase** y **TMDB** (gratis).
3. Crear el archivo `config.js` con esas credenciales.
4. Subir todo el contenido de `sfthemes/` al hosting.
5. Configurar el routing SPA (según tu tipo de hosting).
6. Abrir tu dominio en el navegador → listo.

---

# PASO 1 — Preparar el dominio

Tu licencia está **atada al dominio** que nos indicaste al comprar.
La primera vez que la web se abra desde ese dominio, la licencia queda activada
**y ya no podrá usarse en ningún otro dominio**.

### 1.1 Confirma cuál es tu dominio

Ejemplos:
- `mistreaming.com`
- `peliculas.midominio.net`
- `www.tusitio.com`

> ⚠️ `www.tusitio.com` y `tusitio.com` se consideran **dominios sfthemesintos**.
> Decide cuál vas a usar como principal y comunícanoslo si aún no lo hiciste.

### 1.2 Apunta el dominio a tu hosting o VPS

Esto se hace **en el panel de tu proveedor de dominios** (Namecheap, GoDaddy,
Cloudflare, etc.), editando los **DNS**.

| Tipo de servicio | Qué configurar |
|---|---|
| Hosting compartido (cPanel, Hostinger, etc.) | Cambiar los **nameservers** a los que te dio tu hosting |
| VPS (DigitalOcean, Hetzner, Contabo…) | Crear un registro **A** apuntando a la **IP pública** del VPS |
| Netlify / Vercel / Cloudflare Pages | La propia plataforma te indicará los DNS al conectar el dominio |

Espera a que el dominio **resuelva correctamente** antes de continuar
(puede tardar de minutos a 24h). Para verificar, abre tu dominio en el navegador
y deberías ver la página por defecto del hosting.

---

# PASO 2 — Obtener credenciales de Firebase y TMDB

La web necesita 2 servicios externos (ambos **gratuitos**):

- **Firebase** → guarda usuarios, contenido del catálogo, configuración del admin.
- **TMDB** → fuente de pósters, sinopsis y datos de películas/series.

### 2.1 Crear proyecto en Firebase

1. Entra a [https://console.firebase.google.com](https://console.firebase.google.com) con tu cuenta Google.
2. Clic en **"Agregar proyecto"** → ponle un nombre (ej. `mi-streaming`) → siguiente → crear.
3. Una vez creado, dentro del proyecto:
   - Activa **Authentication** → pestaña *Sign-in method* → habilita **Correo/contraseña** (y *Google* si quieres login social).
   - Activa **Firestore Database** → modo producción → región más cercana a ti.
   - Activa **Realtime Database** (opcional, recomendado) → modo bloqueado.
4. Ve a **⚙️ Configuración del proyecto** → pestaña **General** → baja hasta **"Tus apps"** → clic en el ícono `</>` (Web).
5. Registra una app web (cualquier nombre, sin hosting).
6. Firebase te mostrará un bloque de código con tus credenciales. **Copia estos valores**:

```js
apiKey: "AIza..."
authDomain: "mi-streaming.firebaseapp.com"
projectId: "mi-streaming"
storageBucket: "mi-streaming.firebasestorage.app"
messagingSenderId: "1234567890"
appId: "1:1234567890:web:abcdef..."
measurementId: "G-XXXXXX"  (opcional)
databaseURL: "https://mi-streaming-default-rtdb.firebaseio.com"  (si activaste Realtime DB)
```

### 2.2 Obtener API Key de TMDB

1. Crea cuenta en [https://www.themoviedb.org](https://www.themoviedb.org).
2. Ve a tu perfil → **Configuración** → **API**.
3. Solicita una clave (tipo **Developer**, uso personal). Te la aprueban al instante.
4. Copia el valor de **"API Key (v3 auth)"**. Es una cadena tipo `52e7axxxxxxxxxxxxxxxxxx`.

Guarda los dos bloques de credenciales en un bloc de notas. Los usarás en el siguiente paso.

---

# PASO 3 — Crear el archivo `config.js`

Este es el archivo que **conecta tu web con tus credenciales**.
Tienes 2 formas de crearlo. Elige la que prefieras.

### 🅰️ Opción A — Generarlo desde la web (más fácil)

1. Sube primero el contenido de `sfthemes/` a tu hosting (ver **Paso 4**) **sin** el `config.js`.
2. Abre tu dominio en el navegador.
3. La web detectará que falta el `config.js` y te mostrará una **pantalla de configuración** con un formulario.
4. Pega ahí los valores de Firebase y TMDB del paso anterior.
5. Pulsa **"⬇️ Descargar config.js"**.
6. Sube ese archivo descargado a la **raíz** de tu hosting (la misma carpeta donde está `index.html`).
7. Recarga la web.

### 🅱️ Opción B — Crearlo a mano antes de subir

1. Dentro de la carpeta `sfthemes/`, busca **`config.example.js`**.
2. Haz una copia y renómbrala a **`config.js`**.
3. Ábrela con cualquier editor de texto (Notepad, VS Code, etc.).
4. Reemplaza los valores `"TU_FIREBASE_API_KEY"`, `"tu-proyecto"`, etc., por los reales.
5. Guarda. Ahora súbelo junto al resto de `sfthemes/` (Paso 4).

> 📌 **El nombre debe ser exactamente `config.js`** (todo en minúsculas) y debe estar
> en la **misma carpeta que `index.html`**. Si lo pones dentro de `assets/` o con otro
> nombre, no funcionará.

---

# PASO 4 — Subir los archivos al hosting

Sube **todo el contenido de la carpeta `sfthemes/`** (no la carpeta en sí, **lo de adentro**)
a la carpeta pública de tu hosting.

## 🅰️ Hosting compartido (cPanel, Hostinger, SiteGround, etc.)

1. Entra al panel de tu hosting → **Administrador de archivos** (File Manager).
2. Navega hasta la carpeta **`public_html/`** (o `htdocs/`, `www/`, según el proveedor).
3. Si hay archivos por defecto (`index.html` de bienvenida, etc.), bórralos.
4. Sube todo lo de `sfthemes/` ahí dentro. Puedes:
   - Comprimir `sfthemes/` en un `.zip`, subirlo y descomprimirlo desde el panel (más rápido).
   - O subir los archivos uno a uno por **FTP** (FileZilla, etc.).
5. Asegúrate de que **`config.js`** y **`.htaccess`** quedaron en la raíz junto a `index.html`.

> 💡 Si no ves el `.htaccess` después de subirlo, activa **"Mostrar archivos ocultos"**
> en el File Manager (los archivos que empiezan con `.` están ocultos por defecto).

## 🅱️ VPS con Nginx (DigitalOcean, Hetzner, Contabo, etc.)

Asumimos que ya tienes el VPS con Nginx instalado y el dominio apuntando a su IP.

1. Desde tu PC, sube el contenido de `sfthemes/` al VPS (con `scp` o un cliente SFTP):
   ```bash
   scp -r sfthemes/* root@IP_DE_TU_VPS:/var/www/tudominio.com/
   ```
2. Ajusta permisos:
   ```bash
   chown -R www-data:www-data /var/www/tudominio.com
   chmod -R 755 /var/www/tudominio.com
   ```
3. Agrega en la config de Nginx en `/etc/nginx/sites-available/tudominio.com`:
   ```
       # ⚠️ ORDEN IMPORTANTE: las reglas específicas van ANTES del fallback SPA.
       location = /config.js {
           try_files /config.js =404;
           types { } default_type application/javascript;
           add_header Cache-Control "no-store" always;
       }

       # Cache de assets
       location /assets/ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }

       # SPA fallback — DEBE IR AL FINAL
       location / {
           try_files $uri $uri/ /index.html;
       }
   ```

## 🅲 Netlify

1. Entra a [https://app.netlify.com](https://app.netlify.com).
2. Arrastra la carpeta `sfthemes/` directamente a la zona de deploy.
3. Conecta tu dominio en *Domain settings*.
4. El archivo `_redirects` ya viene incluido — el routing SPA funciona automáticamente.

## 🅳 Cloudflare Pages

1. Entra a [https://pages.cloudflare.com](https://pages.cloudflare.com).
2. Crea un proyecto → **"Direct Upload"** → sube el contenido de `sfthemes/`.
3. Conecta tu dominio en *Custom domains*.
4. El `_redirects` también funciona aquí automáticamente.

## 🅴 Vercel

1. Instala la CLI: `npm i -g vercel`.
2. Dentro de la carpeta `sfthemes/`: `vercel deploy --prod`.
3. Sigue las instrucciones para conectar el dominio.

---

# PASO 4.5 — Personalizar el `index.html` (título, descripción, redes sociales)

El archivo `index.html` que viene en `sfthemes/` trae valores genéricos de StreamFusion.
Puedes (y deberías) editarlo para que tu web tenga **tu propio título, descripción,
imagen de previsualización en redes sociales, etc.**

> 💡 **¿Por qué editar este archivo?** Lo que pongas aquí es lo que verán:
> - Google y otros buscadores (SEO).
> - WhatsApp, Facebook, X/Twitter, Telegram, etc. cuando alguien comparta tu enlace.
> - Cualquier persona que haga **"Ver código fuente"** (Ctrl+U) en tu web.
>
> Como es un archivo estático, los cambios son **inmediatos** y visibles para todos
> los robots de redes sociales (no requiere JavaScript).

### 4.5.1 Cómo editarlo

1. En tu hosting, abre el **File Manager** (o conéctate por FTP).
2. Busca el archivo **`index.html`** en la raíz (junto a `config.js`).
3. Ábrelo con el editor del panel o descárgalo, edítalo con Notepad/VS Code y vuelve a subirlo.

### 4.5.2 Qué editar

Busca dentro del `<head>` estas líneas y reemplaza los valores:

```html
<title>StreamFusion — Películas y Series</title>
<meta name="description" content="Mira películas, series, animes y doramas en StreamFusion." />
<meta name="author" content="StreamFusion" />

<meta property="og:title" content="StreamFusion" />
<meta property="og:description" content="Mira películas, series, animes y doramas en StreamFusion." />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
```

Cambia, por ejemplo, a:

```html
<title>MiCine HD — Estrenos gratis</title>
<meta name="description" content="Las mejores películas y series en HD, sin registros." />
<meta name="author" content="MiCine HD" />

<meta property="og:title" content="MiCine HD" />
<meta property="og:description" content="Las mejores películas y series en HD, sin registros." />
<meta property="og:image" content="https://midominio.com/preview.jpg" />
<meta property="og:url" content="https://midominio.com" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="https://midominio.com/preview.jpg" />
```

### 4.5.3 Recomendaciones

| Etiqueta | Recomendación |
|---|---|
| `<title>` | Máx. 60 caracteres. Incluye nombre de marca + palabra clave. |
| `description` | Máx. 160 caracteres. Frase clara de qué ofrece la web. |
| `og:image` / `twitter:image` | Imagen de **1200×630 px**, JPG o PNG, subida a tu propio dominio (ej: súbela a `sfthemes/` y referénciala como `https://midominio.com/preview.jpg`). |
| `og:url` | URL absoluta de tu sitio (con `https://`). |
| `lang` del `<html>` | Cambia `lang="es"` si tu web no es en español (`en`, `pt`, etc.). |

### 4.5.4 Cambiar el favicon (icono de la pestaña)

1. Crea tu icono en formato `.ico` o `.png` (tamaño recomendado **32×32** o **64×64**).
2. Súbelo a la raíz de tu hosting con el nombre `favicon.ico`.
3. Si usas PNG, añade dentro del `<head>` del `index.html`:
   ```html
   <link rel="icon" type="image/png" href="/favicon.png" />
   ```

### 4.5.5 Probar que se ven bien los cambios

- **View Source**: abre tu web → clic derecho → *Ver código fuente* → confirma que aparecen tus textos.
- **Previsualización en redes**: usa estas herramientas oficiales para forzar a que se actualice la caché de cada red social:
  - Facebook / WhatsApp: [https://developers.facebook.com/tools/debug/](https://developers.facebook.com/tools/debug/)
  - X / Twitter: [https://cards-dev.twitter.com/validator](https://cards-dev.twitter.com/validator)
  - LinkedIn: [https://www.linkedin.com/post-inspector/](https://www.linkedin.com/post-inspector/)

> ⚠️ **Importante:** NO toques las líneas:
> ```html
> <script src="/config.js"></script>
> <script type="module" src="/assets/...">
> ```
> Esas son las que hacen que la web funcione. Solo edita las metas de texto.

---

# PASO 5 — Verificar el routing SPA

La web tiene rutas internas como `/peliculas`, `/series`, `/admin`, etc.
Si al recargar una de esas páginas ves un **error 404**, el routing SPA no está activo.

| Hosting | Cómo se soluciona |
|---|---|
| cPanel / Apache | Verifica que el archivo **`.htaccess`** esté en la raíz junto a `index.html`. |
| Nginx (VPS) | Confirma que tu config tiene `try_files $uri $uri/ /index.html;`. |
| Netlify / Cloudflare Pages | Verifica que **`_redirects`** esté en la raíz. |
| Vercel | Funciona automáticamente, no requiere config. |

---

# PASO 6 — Primer arranque

1. Abre tu dominio en el navegador.
2. La licencia se valida automáticamente contra nuestro servidor → **se activa y queda atada a este dominio para siempre**.
3. Verás la web cargando contenido desde TMDB.
4. Entra a `/login` → crea tu primer usuario.
5. Desde el panel de Firebase (Firestore), marca ese usuario como **admin** para acceder al panel `/admin`.
6. Entra una vez a `/admin`. La web crea automáticamente el **índice del catálogo**
   (documentos `web_config/catalog_0`, `catalog_1`…). Gracias a él, cada visitante hace
   solo 1-3 lecturas de Firestore en lugar de una por título, y no se agota la cuota gratuita.
   El índice se actualiza solo al importar, editar o borrar contenido; si alguna vez ves
   títulos desactualizados, usa el botón **"Reconstruir índice"** en *Gestionar*.

> 📌 Tus reglas de Firestore deben permitir **leer** `web_config/{doc}` a todos y **escribir**
> solo al admin (igual que `web_config/settings`). Si la lectura del índice falla, la web
> sigue funcionando, pero vuelve a leer el catálogo completo.

---

# 🛠️ Cambiar credenciales después del despliegue

Una de las ventajas de este sistema: **no hay que recompilar nada** para cambiar
las credenciales de Firebase o TMDB.

1. Edita el archivo `config.js` en tu hosting (por FTP o desde el File Manager).
2. Guarda los cambios.
3. Recarga la web en el navegador.

Listo. Las nuevas credenciales se aplican al instante.

---

# ❓ Problemas frecuentes

| Problema | Solución |
|---|---|
| Pantalla en blanco | Abre la consola del navegador (F12). Si dice *"config.js not found"*, falta subir ese archivo. |
| Pantalla de "Configuración requerida" | Falta `config.js` o tiene valores incompletos / placeholder. |
| Pantalla de licencia no válida | El dominio actual no coincide con el dominio de la licencia. Contáctanos. |
| Error 404 al recargar `/peliculas` | Falta el `.htaccess` (Apache) o la regla `try_files` (Nginx). Ver PASO 5. |
| Las imágenes no cargan | API Key de TMDB inválida — revisa el valor en `config.js`. |
| No puedo iniciar sesión | Authentication no está habilitado en Firebase, o el dominio no está autorizado. En Firebase: *Authentication → Settings → Authorized domains* → añade tu dominio. |
| Cambié `config.js` pero sigue viendo lo viejo | Caché del navegador o del hosting. Hard reload (Ctrl+Shift+R). En Nginx, verifica el header `no-store` para `/config.js`. |

---

# 🔍 Diagnóstico avanzado — "config.js no encontrado"

Si la app muestra la pantalla de configuración aunque ya subiste `config.js`,
sigue estos pasos en el VPS para identificar la causa exacta:

### Paso 1 — ¿El archivo existe físicamente?

```bash
ls -la /var/www/tudominio.com/config.js
```

- **Si dice "No such file or directory"** → no se subió. Súbelo a la raíz.
- **Si aparece** → continúa con el paso 2.

### Paso 2 — ¿Qué devuelve el servidor cuando se pide `/config.js`?

```bash
curl -i https://tudominio.com/config.js | head -30
```

Mira la cabecera `Content-Type` en la respuesta:

| Respuesta | Diagnóstico | Solución |
|---|---|---|
| `Content-Type: application/javascript` ✅ y verás el código | Todo bien — el problema no está aquí. Revisa el contenido del archivo (placeholders sin reemplazar). | — |
| `Content-Type: text/html` ❌ y ves el HTML de `index.html` | El **fallback SPA está capturando `/config.js`**. Nginx/Apache devuelve `index.html` en vez del archivo real. | Aplica la config Nginx **del Paso 5 de esta guía** (con `location = /config.js` ANTES del fallback). En Apache, asegúrate de que `.htaccess` tenga `RewriteCond %{REQUEST_FILENAME} !-f`. |
| `HTTP/... 404` | El archivo no está donde Nginx lo busca, o tiene permisos incorrectos. | Verifica la ruta en `root` de Nginx. Ajusta permisos: `chmod 644 /var/www/tudominio.com/config.js && chown www-data:www-data /var/www/tudominio.com/config.js`. |
| `HTTP/... 403` | Permisos. | `chmod 644` al archivo y `chmod 755` a la carpeta padre. |

### Paso 3 — Verificar desde el navegador

1. Abre tu dominio en el navegador.
2. F12 → pestaña **Network** → recarga (Ctrl+Shift+R).
3. Busca `config.js` en la lista. Clic encima.
4. Pestaña **Response** → debes ver el código JS, **no** HTML.
5. Pestaña **Console** → si hay un error con `[config]`, te dirá exactamente qué pasó.

La pantalla de configuración de la app también muestra ahora un mensaje
de **diagnóstico del servidor** cuando detecta que el archivo se está
sirviendo mal (HTML en vez de JS, etc.).

---

# 📞 Soporte

Si algo no funciona después de seguir esta guía, contáctanos con:
- Tu dominio.
- Una captura de la pantalla del error.
- La consola del navegador abierta (F12 → pestaña *Console*).
