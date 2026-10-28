/**
 * Historial "Seguir viendo" y progreso por video. Se guarda solo en el
 * navegador (localStorage): no cuesta lecturas ni escrituras de Firestore y
 * funciona sin iniciar sesión.
 *
 * El minuto exacto lo informa el puente del reproductor (unlimplayer) o el
 * <video> nativo; ver usePlayerBridge.
 */
const KEY = "sf_watch_history_v1";
const PROGRESS_KEY = "sf_watch_progress_v1";
const MAX_ITEMS = 30;
const MAX_PROGRESS = 500;

/** Por debajo de esto no merece la pena "reanudar". */
const MIN_RESUME_SECONDS = 30;
/** Si falta menos que esto (o >95 %), el video se considera visto. */
const END_MARGIN_SECONDS = 90;

export interface WatchEntry {
  docId: string;
  /** URL del último video reproducido (película o episodio). */
  url: string;
  /** Etiqueta legible, p. ej. "T2 · E5". */
  label?: string;
  t: number;
}

export interface VideoProgress {
  /** Segundo actual */
  p: number;
  /** Duración total en segundos */
  d: number;
  t: number;
}

const read = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* modo privado o almacenamiento lleno */
  }
};

export const getWatchHistory = (): WatchEntry[] => {
  const list = read<WatchEntry[]>(KEY, []);
  return Array.isArray(list) ? list : [];
};

export const getWatchEntry = (docId: string): WatchEntry | undefined =>
  getWatchHistory().find((e) => e.docId === docId);

export const recordWatch = (entry: Omit<WatchEntry, "t">) => {
  const list = getWatchHistory().filter((e) => e.docId !== entry.docId);
  list.unshift({ ...entry, t: Date.now() });
  write(KEY, list.slice(0, MAX_ITEMS));
};

export const removeFromWatchHistory = (docId: string) => {
  write(
    KEY,
    getWatchHistory().filter((e) => e.docId !== docId),
  );
};

// ---------- Progreso por video ----------

const readProgress = (): Record<string, VideoProgress> => {
  const p = read<Record<string, VideoProgress>>(PROGRESS_KEY, {});
  return p && typeof p === "object" && !Array.isArray(p) ? p : {};
};

export const getProgress = (url: string): VideoProgress | undefined => readProgress()[url];

export const saveProgress = (url: string, position: number, duration: number) => {
  if (!url || !Number.isFinite(position) || !Number.isFinite(duration) || duration <= 0) return;
  const all = readProgress();
  all[url] = { p: Math.round(position), d: Math.round(duration), t: Date.now() };
  const keys = Object.keys(all);
  if (keys.length > MAX_PROGRESS) {
    keys
      .sort((a, b) => all[a].t - all[b].t)
      .slice(0, keys.length - MAX_PROGRESS)
      .forEach((k) => delete all[k]);
  }
  write(PROGRESS_KEY, all);
};

export const isFinished = (pr: VideoProgress | undefined) =>
  !!pr && pr.d > 0 && (pr.d - pr.p < END_MARGIN_SECONDS || pr.p / pr.d > 0.95);

/** Fracción vista (0-1) para pintar barras de progreso. */
export const progressRatio = (pr: VideoProgress | undefined) =>
  pr && pr.d > 0 ? Math.min(1, Math.max(0, pr.p / pr.d)) : 0;

/** Segundo desde el que reanudar, o null si no aplica. */
export const resumePosition = (url: string): number | null => {
  const pr = getProgress(url);
  if (!pr || pr.p < MIN_RESUME_SECONDS || isFinished(pr)) return null;
  return pr.p;
};

export const formatMinutes = (seconds: number) => {
  const m = Math.max(1, Math.round(seconds / 60));
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
};

/** 754 → "12:34", 3725 → "1:02:05" */
export const formatClock = (seconds: number) => {
  const t = Math.max(0, Math.round(seconds));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = String(t % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
};
