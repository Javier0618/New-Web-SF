import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";
import { isDevHost } from "./lib/devHost";
import { applyTvModeClass } from "./lib/tvMode";

applyTvModeClass();

/**
 * CRÍTICO: cargamos config.js ANTES de importar App.
 *
 * En entornos de desarrollo / preview Lovable (localhost, *.lovable.app, etc.)
 * NO exigimos config.js: si existe lo usamos, si no, seguimos en silencio.
 * En producción real sí registramos los errores para diagnóstico.
 */

async function loadRuntimeConfig(): Promise<void> {
  const dev = isDevHost();
  const url = `/config.js?_=${Date.now()}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      if (!dev) {
        // eslint-disable-next-line no-console
        console.error(
          `[config] ${url} respondió HTTP ${res.status}. ¿Subiste config.js a la raíz?`,
        );
      }
      return;
    }
    const contentType = res.headers.get("content-type") || "";
    const code = await res.text();

    const looksLikeHtml =
      contentType.includes("text/html") ||
      /^\s*<!doctype html|^\s*<html/i.test(code);
    if (looksLikeHtml) {
      if (!dev) {
        // eslint-disable-next-line no-console
        console.error(
          "[config] /config.js devolvió HTML en vez de JavaScript.\n" +
            "Causa típica: el servidor (Nginx/Apache) está aplicando el fallback SPA " +
            "a /config.js. Solución: añade una regla explícita para servir /config.js " +
            "ANTES del fallback. Ver DEPLOY.md sección 'Problemas frecuentes'.",
        );
        (window as unknown as { __CONFIG_LOAD_ERROR__?: string }).__CONFIG_LOAD_ERROR__ =
          "El servidor devolvió HTML en vez de config.js. Tu servidor web está " +
          "interceptando /config.js con el fallback SPA. Revisa la configuración " +
          "de Nginx/Apache (ver DEPLOY.md).";
      }
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    new Function(code)();
    if (!window.__APP_CONFIG__) {
      if (!dev) {
        // eslint-disable-next-line no-console
        console.error(
          "[config] config.js se cargó pero no definió window.__APP_CONFIG__.",
        );
        (window as unknown as { __CONFIG_LOAD_ERROR__?: string }).__CONFIG_LOAD_ERROR__ =
          "config.js se cargó pero no asignó window.__APP_CONFIG__. " +
          "Verifica que el archivo tenga el formato correcto.";
      }
    } else {
      // eslint-disable-next-line no-console
      console.log("[config] config.js cargado correctamente.");
    }
  } catch (err) {
    if (!dev) {
      // eslint-disable-next-line no-console
      console.error("[config] Error cargando config.js:", err);
      (window as unknown as { __CONFIG_LOAD_ERROR__?: string }).__CONFIG_LOAD_ERROR__ =
        `Error de red cargando config.js: ${err instanceof Error ? err.message : String(err)}`;
    }
  }
}

async function bootstrap() {
  await loadRuntimeConfig();
  // Import dinámico: App (y firebase.ts) sólo se evalúan DESPUÉS de la config.
  const { default: App } = await import("./App");
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

bootstrap();
