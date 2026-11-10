import { getRuntimeConfig } from "./runtimeConfig";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_IMG_BASE = "https://image.tmdb.org/t/p";

const getTmdbKey = (): string => {
  const cfg = getRuntimeConfig();
  if (!cfg.ok || !cfg.config) {
    throw new Error("TMDB no está configurado. Crea /config.js en la raíz del sitio.");
  }
  return cfg.config.tmdb.apiKey;
};

export interface TmdbCast {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface TmdbCrew {
  id: number;
  name: string;
  job: string;
  department: string;
}

export interface TmdbCredits {
  cast: TmdbCast[];
  crew: TmdbCrew[];
}

export interface TmdbSearchResult {
  runtime?: number;
  episode_run_time?: number[];
  status?: string;
  original_language?: string;
  vote_count?: number;
  id: number;
  media_type: "movie" | "tv";
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  genre_ids: number[];
  genres?: { id: number; name: string }[];
  seasons?: TmdbSeason[];
  credits?: TmdbCredits;
}

export interface TmdbSeason {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  poster_path: string | null;
  air_date: string;
  episodes?: TmdbEpisode[];
}

export interface TmdbEpisode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string;
  video_url?: string;
}

export const searchTmdb = async (query: string, language = "es-MX"): Promise<TmdbSearchResult[]> => {
  const url = `${TMDB_BASE_URL}/search/multi?api_key=${getTmdbKey()}&language=${language}&query=${encodeURIComponent(query)}&page=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("TMDB search error");
  const data = await res.json();
  return (data.results || []).filter(
    (item: any) => item.media_type === "movie" || item.media_type === "tv"
  ) as TmdbSearchResult[];
};

/** The search page intersects actor credits with titles in our catalogue. */
export const searchActorCredits = async (query: string): Promise<string[]> => {
  const response = await fetch(`${TMDB_BASE_URL}/search/person?api_key=${getTmdbKey()}&language=es-MX&query=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error("No se pudo consultar el reparto");
  const people = (await response.json()).results?.slice(0, 2) || [];
  const results = await Promise.all(people.map(async (person: { id: number }) => {
    const res = await fetch(`${TMDB_BASE_URL}/person/${person.id}/combined_credits?api_key=${getTmdbKey()}&language=es-MX`);
    if (!res.ok) return [];
    const credits = await res.json();
    return (credits.cast || []).map((c: { media_type: string; id: number }) => `${c.media_type}:${c.id}`);
  }));
  return [...new Set(results.flat())] as string[];
};

export const fetchMovieRuntime = async (id: number): Promise<number> => {
  const cacheKey = `sf_runtime_${id}`;
  try { const cached = JSON.parse(localStorage.getItem(cacheKey) || "null"); if (cached && Date.now() - cached.at < 7 * 86400_000) return Number(cached.value) || 0; } catch { /* unavailable cache */ }
  const res = await fetch(`${TMDB_BASE_URL}/movie/${id}?api_key=${getTmdbKey()}&language=es-MX`);
  if (!res.ok) throw new Error("No se pudo consultar la duración");
  const runtime = Number((await res.json()).runtime) || 0;
  try { localStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), value: runtime })); } catch { /* private mode */ }
  return runtime;
};

export const fetchTmdbDetails = async (id: number, type: "movie" | "tv", language = "es-MX"): Promise<TmdbSearchResult> => {
  const url = `${TMDB_BASE_URL}/${type}/${id}?api_key=${getTmdbKey()}&language=${language}&append_to_response=credits`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("TMDB details error");
  const data = await res.json();
  return { ...data, media_type: type };
};

export interface TmdbLogo {
  file_path: string;
  iso_639_1: string | null;
  aspect_ratio: number;
  width: number;
  height: number;
  vote_average: number;
}

export interface TmdbImages {
  logos: TmdbLogo[];
}

export const fetchTmdbImages = async (id: number, type: "movie" | "tv"): Promise<TmdbImages> => {
  // include_image_language fetches logos in es, en and language-neutral (null)
  const url = `${TMDB_BASE_URL}/${type}/${id}/images?api_key=${getTmdbKey()}&include_image_language=es,en,null`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("TMDB images error");
  return res.json();
};

/**
 * Picks the best logo: Spanish first, English second, otherwise null.
 * (Language-neutral logos are skipped because they often have no text.)
 */
export const pickBestLogo = (images: TmdbImages | null | undefined): TmdbLogo | null => {
  if (!images?.logos?.length) return null;
  const byLang = (lang: string) =>
    images.logos
      .filter((l) => l.iso_639_1 === lang)
      .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))[0];
  return byLang("es") || byLang("en") || null;
};

export const fetchTmdbSeasonDetails = async (seriesId: number, seasonNumber: number, language = "es-MX"): Promise<TmdbSeason> => {
  const url = `${TMDB_BASE_URL}/tv/${seriesId}/season/${seasonNumber}?api_key=${getTmdbKey()}&language=${language}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("TMDB season error");
  return res.json();
};
