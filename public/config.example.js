/**
 * ============================================================
 *  StreamFusion — Configuración runtime
 * ============================================================
 *
 *  ⚠️  RENOMBRA ESTE ARCHIVO A  config.js  EN TU HOSTING
 *      y rellena los valores con tus credenciales reales.
 *
 *  Ubicación final:  /config.js   (raíz del sitio, junto a index.html)
 *
 *  La app lee este archivo en cada arranque. Si no existe o
 *  faltan valores, mostrará una pantalla de configuración.
 *
 *  Cambiar credenciales NO requiere recompilar — solo edita
 *  este archivo en el servidor y recarga el navegador.
 * ============================================================
 */
window.__APP_CONFIG__ = {
  firebase: {
    apiKey: "TU_FIREBASE_API_KEY",
    authDomain: "tu-proyecto.firebaseapp.com",
    databaseURL: "https://tu-proyecto-default-rtdb.firebaseio.com",
    projectId: "tu-proyecto",
    storageBucket: "tu-proyecto.firebasestorage.app",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:xxxxxxxxxxxxxxxx",
    measurementId: "G-XXXXXXXXXX",
  },
  tmdb: {
    apiKey: "TU_TMDB_API_KEY",
  },
};
