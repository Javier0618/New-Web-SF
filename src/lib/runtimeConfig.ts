/**
 * Runtime config loader.
 *
 * Lee `window.__APP_CONFIG__` que se inyecta vía `<script src="/config.js">`
 * en index.html ANTES del bundle. Esto permite cambiar credenciales sin
 * recompilar — solo editar `config.js` en el hosting.
 */

export interface FirebaseRuntimeConfig {
  apiKey: string;
  authDomain: string;
  databaseURL?: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export interface TmdbRuntimeConfig {
  apiKey: string;
}

export interface AppRuntimeConfig {
  firebase: FirebaseRuntimeConfig;
  tmdb: TmdbRuntimeConfig;
}

declare global {
  interface Window {
    __APP_CONFIG__?: Partial<AppRuntimeConfig>;
  }
}

const PLACEHOLDER_VALUES = new Set([
  "",
  "TU_FIREBASE_API_KEY",
  "TU_TMDB_API_KEY",
  "tu-proyecto",
  "tu-proyecto.firebaseapp.com",
  "tu-proyecto.firebasestorage.app",
  "000000000000",
  "1:000000000000:web:xxxxxxxxxxxxxxxx",
  "G-XXXXXXXXXX",
  "https://tu-proyecto-default-rtdb.firebaseio.com",
]);

const isFilled = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0 && !PLACEHOLDER_VALUES.has(v.trim());

export interface ConfigValidationResult {
  ok: boolean;
  missing: string[];
  config: AppRuntimeConfig | null;
}

export function loadRuntimeConfig(): ConfigValidationResult {
  const raw = typeof window !== "undefined" ? window.__APP_CONFIG__ : undefined;
  const missing: string[] = [];

  if (!raw) {
    return {
      ok: false,
      missing: ["config.js (archivo no encontrado en la raíz del sitio)"],
      config: null,
    };
  }

  const fb = raw.firebase ?? ({} as Partial<FirebaseRuntimeConfig>);
  const tmdb = raw.tmdb ?? ({} as Partial<TmdbRuntimeConfig>);

  const requiredFb: (keyof FirebaseRuntimeConfig)[] = [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "messagingSenderId",
    "appId",
  ];

  for (const key of requiredFb) {
    if (!isFilled(fb[key])) missing.push(`firebase.${key}`);
  }
  if (!isFilled(tmdb.apiKey)) missing.push("tmdb.apiKey");

  if (missing.length > 0) {
    return { ok: false, missing, config: null };
  }

  return {
    ok: true,
    missing: [],
    config: {
      firebase: fb as FirebaseRuntimeConfig,
      tmdb: tmdb as TmdbRuntimeConfig,
    },
  };
}

let cached: ConfigValidationResult | null = null;
export function getRuntimeConfig(): ConfigValidationResult {
  // No cacheamos en SSR (window indefinido) ni resultados fallidos:
  // así, cuando el cliente hidrata y window.__APP_CONFIG__ ya existe,
  // la siguiente llamada vuelve a leer y valida correctamente.
  if (typeof window === "undefined") {
    return loadRuntimeConfig();
  }
  if (!cached || !cached.ok) {
    cached = loadRuntimeConfig();
  }
  return cached;
}
