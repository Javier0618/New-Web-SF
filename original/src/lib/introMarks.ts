/**
 * Marcas de intro y créditos de un episodio, con la misma lógica que las apps:
 *  1. Primero los campos del episodio en Firestore (intro_start, intro_end, credits_start).
 *  2. Si no hay, se consultan en TheIntroDB (por id de TMDB + temporada + episodio)
 *     y se guardan en caché en el navegador.
 */
import type { Episode } from "@/types/content";

export interface EpisodeMarks {
  introStart: number | null;
  introEnd: number | null;
  creditsStart: number | null;
}

const NO_MARKS: EpisodeMarks = { introStart: null, introEnd: null, creditsStart: null };

const INTRODB_BASE = "https://api.theintrodb.org/v3";
const CACHE_KEY = "sf_introdb_cache_v1";
const TTL_FOUND = 7 * 24 * 3600 * 1000;
const TTL_NONE = 24 * 3600 * 1000;
const MAX_ENTRIES = 400;

const toNum = (v: unknown): number | null =>
  v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v);

const hasAny = (m: EpisodeMarks) => m.introEnd !== null || m.creditsStart !== null;

export const marksFromEpisode = (ep: Partial<Episode> | undefined): EpisodeMarks => {
  if (!ep) return NO_MARKS;
  const introEnd = toNum(ep.intro_end);
  return {
    // Igual que la app: si hay fin de intro pero no inicio, la intro empieza en 0
    introStart: introEnd !== null ? (toNum(ep.intro_start) ?? 0) : null,
    introEnd,
    creditsStart: toNum(ep.credits_start),
  };
};

interface IntroDbSegment {
  start_ms?: number | null;
  end_ms?: number | null;
}

const parseIntroDb = (raw: unknown): EpisodeMarks => {
  if (!raw || typeof raw !== "object") return NO_MARKS;
  const data = raw as { intro?: IntroDbSegment[]; credits?: IntroDbSegment[] };
  const sec = (ms: unknown) => Math.round(Number(ms) / 1000);
  const marks: EpisodeMarks = { ...NO_MARKS };

  const intro = (Array.isArray(data.intro) ? data.intro : []).find(
    (s) => s && toNum(s.end_ms) !== null && Number(s.end_ms) > (toNum(s.start_ms) ?? 0),
  );
  if (intro) {
    const start = toNum(intro.start_ms) !== null ? sec(intro.start_ms) : 0;
    const end = sec(intro.end_ms);
    if (end > start) {
      marks.introStart = start;
      marks.introEnd = end;
    }
  }

  const credits = (Array.isArray(data.credits) ? data.credits : [])
    .filter((s) => s && toNum(s.start_ms) !== null && Number(s.start_ms) > 0)
    .sort((a, b) => Number(a.start_ms) - Number(b.start_ms))[0];
  if (credits) marks.creditsStart = sec(credits.start_ms);

  return marks;
};

type Cache = Record<string, { m: EpisodeMarks | null; t: number }>;

const readCache = (): Cache => {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    return c && typeof c === "object" && !Array.isArray(c) ? c : {};
  } catch {
    return {};
  }
};

const writeCache = (key: string, m: EpisodeMarks | null) => {
  try {
    const c = readCache();
    c[key] = { m, t: Date.now() };
    const keys = Object.keys(c);
    if (keys.length > MAX_ENTRIES) {
      keys
        .sort((a, b) => c[a].t - c[b].t)
        .slice(0, keys.length - MAX_ENTRIES)
        .forEach((k) => delete c[k]);
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
};

const fetchIntroDb = async (
  tmdbId: number,
  season: number,
  episode: number,
): Promise<EpisodeMarks> => {
  const key = `${tmdbId}-${season}-${episode}`;
  const cached = readCache()[key];
  if (cached && Date.now() - cached.t < (cached.m ? TTL_FOUND : TTL_NONE)) {
    return cached.m || NO_MARKS;
  }
  try {
    const res = await fetch(
      `${INTRODB_BASE}/media?tmdb_id=${encodeURIComponent(tmdbId)}&season=${season}&episode=${episode}`,
    );
    if (res.status === 429) return NO_MARKS; // límite de la API: no guardar, se reintenta luego
    if (!res.ok) {
      writeCache(key, null);
      return NO_MARKS;
    }
    const marks = parseIntroDb(await res.json());
    writeCache(key, hasAny(marks) ? marks : null);
    return marks;
  } catch {
    return NO_MARKS;
  }
};

/** Marcas para un episodio: Firestore primero; TheIntroDB si Firestore no tiene. */
export const getEpisodeMarks = async (
  tmdbId: number,
  season: number,
  ep: Partial<Episode> | undefined,
): Promise<EpisodeMarks> => {
  const own = marksFromEpisode(ep);
  if (hasAny(own) || !ep?.episode_number) return own;
  return fetchIntroDb(tmdbId, season, ep.episode_number);
};
