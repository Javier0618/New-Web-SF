import { useEffect, useState } from "react";
import { fetchTmdbImages, pickBestLogo, TMDB_IMG_BASE, type TmdbLogo } from "@/lib/tmdb";
interface TitleLogoProps {
  tmdbId: number | string;
  mediaType: "movie" | "tv";
  title: string;
  textClassName?: string;
  imgClassName?: string;
  as?: "h1" | "h2";
}
// Retain both languages so a failed Spanish image can fall back to English.
const cache = new Map<string, TmdbLogo[]>();
const inflight = new Map<string, Promise<TmdbLogo[]>>();
const logoUrl = (logo: TmdbLogo) =>
  `${TMDB_IMG_BASE}/${logo.file_path.endsWith(".svg") ? "original" : "w500"}${logo.file_path}`;
function loadLogos(id: number, type: "movie" | "tv"): Promise<TmdbLogo[]> {
  if (!Number.isFinite(id) || id <= 0) return Promise.resolve([]);
  const key = `${type}:${id}`;
  if (cache.has(key)) return Promise.resolve(cache.get(key)!);
  if (inflight.has(key)) return inflight.get(key)!;
  const request = fetchTmdbImages(id, type)
    .then((images) => {
      const logos = Array.isArray(images.logos)
        ? images.logos.filter((l) => typeof l.file_path === "string" && l.file_path.startsWith("/"))
        : [];
      const candidates = ["es", "en"]
        .map((language) => pickBestLogo({ logos: logos.filter((l) => l.iso_639_1 === language) }))
        .filter((logo): logo is TmdbLogo => !!logo);
      cache.set(key, candidates);
      if (candidates[0]) {
        const image = new Image();
        image.src = logoUrl(candidates[0]);
      }
      return candidates;
    })
    .catch(() => [])
    .finally(() => inflight.delete(key));
  inflight.set(key, request);
  return request;
}
export const prefetchTitleLogo = (
  tmdbId: number | string,
  mediaType: "movie" | "tv",
): Promise<TmdbLogo | null> =>
  loadLogos(Number(tmdbId), mediaType).then((logos) => logos[0] ?? null);
function ResolvedTitleLogo({
  tmdbId,
  mediaType,
  title,
  textClassName = "",
  imgClassName = "",
  as: Tag = "h1",
}: TitleLogoProps) {
  const id = Number(tmdbId);
  const [logos, setLogos] = useState<TmdbLogo[] | undefined>(() => cache.get(`${mediaType}:${id}`));
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    loadLogos(id, mediaType).then((result) => {
      if (!cancelled) setLogos(result);
    });
    return () => {
      cancelled = true;
    };
  }, [id, mediaType]);
  if (!logos)
    return (
      <Tag className="sr-only" aria-busy="true">
        {title}
      </Tag>
    );
  const logo = logos[attempt];
  if (!logo) return <Tag className={textClassName}>{title}</Tag>;
  return (
    <Tag className="contents">
      <img
        key={logo.file_path}
        src={logoUrl(logo)}
        alt={title}
        className={imgClassName}
        loading="eager"
        draggable={false}
        onError={() => setAttempt((index) => index + 1)}
      />
    </Tag>
  );
}
export default function TitleLogo(props: TitleLogoProps) {
  return <ResolvedTitleLogo key={`${props.mediaType}:${props.tmdbId}`} {...props} />;
}
