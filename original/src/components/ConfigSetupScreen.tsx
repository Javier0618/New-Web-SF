import { useMemo, useState } from "react";

interface Props {
  missing: string[];
}

const TEMPLATE = `/**
 * StreamFusion — config.js
 * Sube este archivo a la RAÍZ de tu sitio (junto a index.html)
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
`;

export default function ConfigSetupScreen({ missing }: Props) {
  const loadError =
    typeof window !== "undefined"
      ? (window as unknown as { __CONFIG_LOAD_ERROR__?: string }).__CONFIG_LOAD_ERROR__
      : undefined;
  const [form, setForm] = useState({
    apiKey: "",
    authDomain: "",
    databaseURL: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    measurementId: "",
    tmdbApiKey: "",
  });

  const generated = useMemo(() => {
    return `/**
 * StreamFusion — config.js (generado ${new Date().toISOString()})
 * Sube este archivo a la RAÍZ de tu sitio (junto a index.html)
 */
window.__APP_CONFIG__ = {
  firebase: {
    apiKey: ${JSON.stringify(form.apiKey)},
    authDomain: ${JSON.stringify(form.authDomain)},
    databaseURL: ${JSON.stringify(form.databaseURL)},
    projectId: ${JSON.stringify(form.projectId)},
    storageBucket: ${JSON.stringify(form.storageBucket)},
    messagingSenderId: ${JSON.stringify(form.messagingSenderId)},
    appId: ${JSON.stringify(form.appId)},
    measurementId: ${JSON.stringify(form.measurementId)},
  },
  tmdb: {
    apiKey: ${JSON.stringify(form.tmdbApiKey)},
  },
};
`;
  }, [form]);

  const download = (content: string) => {
    const blob = new Blob([content], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "config.js";
    a.click();
    URL.revokeObjectURL(url);
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h1 className="text-2xl font-bold">⚙️ Configuración requerida</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            La app no encuentra <code className="rounded bg-muted px-1.5 py-0.5">config.js</code> en
            la raíz del sitio, o algunas credenciales faltan.
          </p>

          {loadError && (
            <div className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                Diagnóstico del servidor:
              </p>
              <p className="mt-1 text-xs text-amber-700/90 dark:text-amber-300/90">
                {loadError}
              </p>
            </div>
          )}

          {missing.length > 0 && (
            <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3">
              <p className="text-sm font-semibold text-destructive">Valores faltantes:</p>
              <ul className="mt-1 list-disc pl-5 text-xs text-destructive/90">
                {missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 space-y-3 text-sm">
            <p className="font-semibold">Tienes dos opciones:</p>
            <details className="rounded-md border border-border bg-muted/30 p-3" open>
              <summary className="cursor-pointer font-medium">
                Opción A — Generar y descargar config.js
              </summary>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                  ["apiKey", "Firebase apiKey"],
                  ["authDomain", "Firebase authDomain"],
                  ["projectId", "Firebase projectId"],
                  ["storageBucket", "Firebase storageBucket"],
                  ["messagingSenderId", "Firebase messagingSenderId"],
                  ["appId", "Firebase appId"],
                  ["databaseURL", "Firebase databaseURL (opcional)"],
                  ["measurementId", "Firebase measurementId (opcional)"],
                  ["tmdbApiKey", "TMDB API Key"],
                ].map(([k, label]) => (
                  <label key={k} className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <input
                      className="rounded border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
                      value={form[k as keyof typeof form]}
                      onChange={set(k as keyof typeof form)}
                    />
                  </label>
                ))}
              </div>
              <button
                onClick={() => download(generated)}
                className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                ⬇️ Descargar config.js
              </button>
              <p className="mt-2 text-xs text-muted-foreground">
                Sube el archivo descargado por FTP / panel de hosting a la <strong>raíz del
                sitio</strong> (misma carpeta que <code>index.html</code>) y recarga la página.
              </p>
            </details>

            <details className="rounded-md border border-border bg-muted/30 p-3">
              <summary className="cursor-pointer font-medium">
                Opción B — Crear el archivo manualmente
              </summary>
              <p className="mt-2 text-xs text-muted-foreground">
                Crea un archivo llamado <code className="rounded bg-muted px-1 py-0.5">config.js</code>{" "}
                en la raíz de tu sitio con este contenido (rellena los valores):
              </p>
              <pre className="mt-2 max-h-72 overflow-auto rounded bg-muted p-3 text-xs">
                <code>{TEMPLATE}</code>
              </pre>
              <button
                onClick={() => navigator.clipboard.writeText(TEMPLATE)}
                className="mt-2 rounded border border-border px-3 py-1.5 text-xs hover:bg-muted"
              >
                Copiar plantilla
              </button>
            </details>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => window.location.reload()}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              🔄 Ya subí el archivo, recargar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
