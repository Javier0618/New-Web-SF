import { useEffect, useState } from "react";
import { fetchTmdbImages, pickBestLogo, TMDB_IMG_BASE, type TmdbLogo } from "@/lib/tmdb";

interface TitleLogoProps {
  tmdbId: number | string;
  mediaType: "movie" | "tv";
  title: string;
  /** Tailwind classes for the fallback text <h1>. */
  textClassName?: string;
  /** Tailwind classes for the logo <img>. */
  imgClassName?: string;
  /** Heading level for the visually hidden / fallback title. */
  as?: "h1" | "h2";
}

// Module-level cache so we don't refetch when navigating between slides/pages.
const cache = new Map<string, TmdbLogo | null>();
const inflight = new Map<string, Promise<TmdbLogo | null>>();

export const prefetchTitleLogo = (
  tmdbId: number | string,
  mediaType: "movie" | "tv",
): Promise<TmdbLogo | null> => {
  const id = typeof tmdbId === "string" ? Number(tmdbId) : tmdbId;
  if (!Number.isFinite(id)) return Promise.resolve(null);
  const key = `${mediaType}:${id}`;
  if (cache.has(key)) return Promise.resolve(cache.get(key) ?? null);
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = fetchTmdbImages(id, mediaType)
    .then((imgs) => {
      const best = pickBestLogo(imgs);
      cache.set(key, best);
      inflight.delete(key);
      // Warm the browser image cache so the <img> paints instantly.
      if (best) {
        const img = new Image();
        img.src = `${TMDB_IMG_BASE}/w500${best.file_path}`;
      }
      return best;
    })
    .catch(() => {
      cache.set(key, null);
      inflight.delete(key);
      return null;
    });
  inflight.set(key, p);
  return p;
};

const TitleLogo = ({
  tmdbId,
  mediaType,
  title,
  textClassName = "",
  imgClassName = "",
  as = "h1",
}: TitleLogoProps) => {
  const numericId = typeof tmdbId === "string" ? Number(tmdbId) : tmdbId;
  const cacheKey = `${mediaType}:${numericId}`;
  const [logo, setLogo] = useState<TmdbLogo | null | undefined>(() =>
    cache.has(cacheKey) ? cache.get(cacheKey) : undefined,
  );

  useEffect(() => {
    let cancelled = false;
    if (!Number.isFinite(numericId)) {
      setLogo(null);
      return;
    }
    if (cache.has(cacheKey)) {
      setLogo(cache.get(cacheKey) ?? null);
      return;
    }
    setLogo(undefined);
    prefetchTitleLogo(numericId, mediaType).then((res) => {
      if (!cancelled) setLogo(res);
    });
    return () => {
      cancelled = true;
    };
  }, [numericId, mediaType, cacheKey]);

  // Still loading: render nothing visible (but keep the <h1> for a11y/SEO,
  // visually hidden) so we don't flash the text title before the logo arrives.
  if (logo === undefined) {
    const Tag = as;
    return (
      <Tag className="sr-only" aria-busy="true">
        {title}
      </Tag>
    );
  }

  const Tag = as;

  if (logo) {
    return (
      <Tag className="contents">
        <span className="sr-only">{title}</span>
        <img
          src={`${TMDB_IMG_BASE}/w500${logo.file_path}`}
          alt={title}
          className={imgClassName}
          loading="eager"
          draggable={false}
        />
      </Tag>
    );
  }

  return <Tag className={textClassName}>{title}</Tag>;
};

export default TitleLogo;
