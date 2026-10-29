import { Link, useParams, useNavigate, useSearchParams } from "@/lib/react-router-shim";
import { useContentDetail, useContent } from "@/hooks/useContent";
import {
  getWatchEntry,
  recordWatch,
  getProgress,
  saveProgress,
  isFinished,
  progressRatio,
  resumePosition,
  formatMinutes,
  formatClock,
} from "@/lib/watchHistory";
import { getEpisodeMarks, type EpisodeMarks } from "@/lib/introMarks";
import Navbar from "@/components/layout/Navbar";
import VideoPlayer from "@/components/content/VideoPlayer";
import ContentCard from "@/components/home/ContentCard";
import {
  Play,
  Star,
  Calendar,
  BookmarkCheck,
  Bookmark,
  Film,
  ChevronLeft,
  ChevronRight,
  Check,
  Layers,
  Tv,
  RotateCcw,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { getBackdropUrl, getImageUrl } from "@/lib/image";
import { extractDocId } from "@/lib/slug";
import { useAuth } from "@/contexts/AuthContext";
import { addToMyList, removeFromMyList, fetchMyList } from "@/lib/firestore";
import { toast } from "@/hooks/use-toast";
import { canonicalGenre } from "@/lib/genres";
import AdBanner from "@/components/ads/AdBanner";
import TitleLogo from "@/components/content/TitleLogo";
import type { Episode } from "@/types/content";

interface FlatEpisode {
  seasonKey: string;
  seasonNumber: number;
  ep: Episode;
}

const ratingColor = (v: number) =>
  v >= 7.5
    ? "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30"
    : v >= 6
      ? "bg-amber-500/15 text-amber-400 ring-amber-500/30"
      : v > 0
        ? "bg-red-500/15 text-red-400 ring-red-500/30"
        : "bg-white/5 text-white/50 ring-white/10";

/** Tarjeta de episodio con miniatura, progreso y estado. */
const EpisodeItem = ({
  item,
  fallbackThumb,
  active,
  onSelect,
  compact,
}: {
  item: FlatEpisode;
  fallbackThumb: string;
  active: boolean;
  onSelect: () => void;
  compact?: boolean;
}) => {
  const { ep } = item;
  const pr = getProgress(ep.video_url);
  const ratio = progressRatio(pr);
  const done = isFinished(pr);
  const thumb = ep.still_path ? getImageUrl(ep.still_path, "w300") : fallbackThumb;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group w-full text-left flex gap-3 p-2 rounded-xl transition-all border ${
        active
          ? "bg-primary/15 border-primary/40 shadow-lg shadow-primary/10"
          : "bg-white/[0.03] border-white/5 hover:bg-white/[0.07] hover:border-white/15"
      }`}
    >
      <div
        className={`relative flex-shrink-0 ${compact ? "w-28" : "w-32 md:w-36"} aspect-video rounded-lg overflow-hidden bg-black/40`}
      >
        <img
          src={thumb}
          alt={ep.name}
          loading="lazy"
          className={`w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03] ${
            ep.still_path ? "" : "opacity-60"
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <span className="absolute bottom-1 left-1.5 text-[10px] font-black text-white/90 drop-shadow">
          E{ep.episode_number}
        </span>
        {active ? (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/30">
            <span className="flex items-end gap-[3px] h-4" aria-label="Reproduciendo">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-[3px] bg-white rounded-sm animate-[sf-eq_0.9s_ease-in-out_infinite]"
                  style={{ animationDelay: `${i * 0.15}s`, height: "100%" }}
                />
              ))}
            </span>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="w-4 h-4 text-black fill-current ml-0.5" />
            </div>
          </div>
        )}
        {done && !active && (
          <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow">
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          </span>
        )}
        {ratio > 0 && !done && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
            <div className="h-full bg-primary" style={{ width: `${ratio * 100}%` }} />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 py-0.5">
        <p className={`text-xs font-semibold ${active ? "text-primary" : "text-white/50"}`}>
          Episodio {ep.episode_number}
          {done && !active && <span className="ml-2 text-emerald-400">Visto</span>}
        </p>
        <p className="text-sm font-semibold text-white/90 truncate">
          {ep.name || `Episodio ${ep.episode_number}`}
        </p>
        {ep.overview && !compact && (
          <p className="text-xs text-white/45 line-clamp-2 mt-0.5 leading-snug">{ep.overview}</p>
        )}
      </div>
    </button>
  );
};

const ContentPage = () => {
  const { slug, id } = useParams();
  const [searchParams] = useSearchParams();
  const rawParam = slug ?? id ?? "";
  const docId = slug ? extractDocId(rawParam) : rawParam;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { content, loading } = useContentDetail(docId);
  const { content: allContent } = useContent();
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [resumeAt, setResumeAt] = useState<number | null>(null);
  const [marks, setMarks] = useState<EpisodeMarks | null>(null);
  const [, setProgressTick] = useState(0);
  const [inMyList, setInMyList] = useState(false);
  const [showFullOverview, setShowFullOverview] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
  const playerBoxRef = useRef<HTMLDivElement>(null);
  const [playerHeight, setPlayerHeight] = useState<number | null>(null);

  // Todos los episodios con video, en orden (temporada, episodio)
  const flatEpisodes = useMemo<FlatEpisode[]>(() => {
    if (!content?.seasons) return [];
    return Object.entries(content.seasons)
      .map(([seasonKey, s]) => ({ seasonKey, s }))
      .sort((a, b) => (a.s.season_number || 0) - (b.s.season_number || 0))
      .flatMap(({ seasonKey, s }) =>
        Object.values(s.episodes || {})
          .filter((ep) => !!ep.video_url)
          .sort((a, b) => (a.episode_number || 0) - (b.episode_number || 0))
          .map((ep) => ({ seasonKey, seasonNumber: s.season_number, ep })),
      );
  }, [content]);

  const currentIdx = playingUrl ? flatEpisodes.findIndex((f) => f.ep.video_url === playingUrl) : -1;
  const current = currentIdx >= 0 ? flatEpisodes[currentIdx] : null;
  const prevItem = currentIdx > 0 ? flatEpisodes[currentIdx - 1] : null;
  const nextItem =
    currentIdx >= 0 && currentIdx < flatEpisodes.length - 1 ? flatEpisodes[currentIdx + 1] : null;

  // Altura del reproductor → altura de la columna de episodios en escritorio
  useEffect(() => {
    const el = playerBoxRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setPlayerHeight(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [playingUrl, content]);

  const scrollToPlayer = () => {
    playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const play = useCallback((url: string, seasonKey?: string, scroll = true) => {
    setResumeAt(resumePosition(url));
    setPlayingUrl(url);
    if (seasonKey) setSelectedSeason(seasonKey);
    if (scroll) scrollToPlayer();
  }, []);

  /** Qué reproducir con el botón principal: continuar, siguiente episodio o el primero. */
  const resumeTarget = useMemo(() => {
    if (!content) return null;
    if (content.media_type === "movie") {
      if (!content.video_url) return null;
      const pr = getProgress(content.video_url);
      const resumable = !!resumePosition(content.video_url);
      return {
        url: content.video_url,
        seasonKey: undefined,
        label: null as string | null,
        pr: resumable ? pr : undefined,
      };
    }
    if (flatEpisodes.length === 0) return null;
    const entry = content.docId ? getWatchEntry(content.docId) : undefined;
    let idx = entry ? flatEpisodes.findIndex((f) => f.ep.video_url === entry.url) : -1;
    if (
      idx >= 0 &&
      isFinished(getProgress(flatEpisodes[idx].ep.video_url)) &&
      idx < flatEpisodes.length - 1
    ) {
      idx += 1; // ya terminó ese episodio: proponer el siguiente
    }
    const target = flatEpisodes[Math.max(0, idx)];
    const pr = getProgress(target.ep.video_url);
    return {
      url: target.ep.video_url,
      seasonKey: target.seasonKey,
      label: idx >= 0 ? `T${target.seasonNumber} · E${target.ep.episode_number}` : null,
      pr: resumePosition(target.ep.video_url) ? pr : undefined,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, flatEpisodes, playingUrl]);

  // ?autoplay=1 (botón "Ver ahora" del inicio)
  useEffect(() => {
    if (searchParams.get("autoplay") === "1" && resumeTarget && !playingUrl) {
      play(resumeTarget.url, resumeTarget.seasonKey, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, searchParams]);

  // Guardar para "Seguir viendo"
  useEffect(() => {
    if (!content?.docId || !playingUrl) return;
    const label = current ? `T${current.seasonNumber} · E${current.ep.episode_number}` : undefined;
    recordWatch({ docId: content.docId, url: playingUrl, label });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content?.docId, playingUrl]);

  // Marcas de intro/créditos del episodio en curso (Firestore → TheIntroDB)
  useEffect(() => {
    setMarks(null);
    if (!content || !current) return;
    let cancelled = false;
    getEpisodeMarks(content.id, current.seasonNumber, current.ep).then((m) => {
      if (!cancelled) setMarks(m);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content?.id, playingUrl]);

  useEffect(() => {
    if (!user || !content) return;
    fetchMyList(user.uid).then((list) => {
      setInMyList(list.some((item: any) => item.id === content.id));
    });
  }, [user, content]);

  const handleToggleList = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!content) return;
    if (inMyList) {
      await removeFromMyList(user.uid, content.id);
      setInMyList(false);
      toast({ title: "Eliminado de tu lista" });
    } else {
      await addToMyList(user.uid, {
        id: content.id,
        media_type: content.media_type,
        title: content.title,
        poster_path: content.poster_path,
        release_date: content.release_date,
      });
      setInMyList(true);
      toast({ title: "Agregado a tu lista!" });
    }
  };

  const related = useMemo(() => {
    if (!content) return [];
    const pool = allContent;
    if (pool.length === 0) return [];
    // Normalize genres to strings (Firestore stores them as numbers in some docs).
    const norm = (g: unknown) => String(g);
    const currentGenres = new Set((content.genres ?? []).map(norm));
    const matches = pool.filter(
      (c: any) =>
        c.docId !== content.docId &&
        c.media_type === content.media_type &&
        (c.genres ?? []).some((g: unknown) => currentGenres.has(norm(g))),
    );
    matches.sort((a: any, b: any) => {
      const sharedA = (a.genres ?? []).filter((g: unknown) => currentGenres.has(norm(g))).length;
      const sharedB = (b.genres ?? []).filter((g: unknown) => currentGenres.has(norm(g))).length;
      return sharedB - sharedA;
    });
    // Fallback 1: same media_type if no genre overlap exists.
    if (matches.length === 0) {
      const sameType = pool
        .filter((c) => c.docId !== content.docId && c.media_type === content.media_type)
        .slice(0, 12);
      if (sameType.length > 0) return sameType;
      // Fallback 2: any other content (covers cases where there are few items of this type).
      return pool.filter((c) => c.docId !== content.docId).slice(0, 12);
    }
    return matches.slice(0, 12);
  }, [content, allContent]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-20 px-4 md:px-8 max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 aspect-video rounded-2xl bg-muted animate-pulse" />
            <div className="hidden lg:block w-[380px] rounded-2xl bg-muted/60 animate-pulse" />
          </div>
          <div className="mt-8 flex gap-8">
            <div className="hidden lg:block w-56 aspect-[2/3] rounded-2xl bg-muted animate-pulse" />
            <div className="flex-1 space-y-4">
              <div className="h-12 w-2/3 rounded-lg bg-muted animate-pulse" />
              <div className="h-5 w-1/3 rounded bg-muted animate-pulse" />
              <div className="h-28 w-full rounded-xl bg-muted/60 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4 text-center">
        <Navbar />
        <Film className="w-14 h-14 text-white/20" />
        <p className="text-lg font-semibold">Contenido no encontrado</p>
        <button
          onClick={() => navigate("/")}
          className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  const seasons = content.seasons
    ? Object.entries(content.seasons).sort(
        (a, b) => (a[1].season_number || 0) - (b[1].season_number || 0),
      )
    : [];
  const activeSeason =
    selectedSeason || current?.seasonKey || (seasons.length > 0 ? seasons[0][0] : null);
  const seasonEpisodes = flatEpisodes.filter((f) => f.seasonKey === activeSeason);

  const year = content.release_date?.split("-")[0];
  const isMovie = content.media_type === "movie";
  const isSeries = content.media_type === "tv";
  const backdrop = getBackdropUrl(content.backdrop_path, content.poster_path);
  const episodeThumbFallback = content.backdrop_path
    ? getImageUrl(content.backdrop_path, "w300")
    : "/placeholder.svg";

  const cast = (content as any).credits?.cast?.slice(0, 14) || [];
  const creators =
    (content as any).credits?.crew
      ?.filter(
        (c: any) => c.job === "Director" || c.job === "Creator" || c.job === "Executive Producer",
      )
      .slice(0, 3) || [];

  const bridge = {
    hasNext: !!nextItem,
    marks,
    resumeAt,
    onProgress: (pos: number, dur: number) => {
      if (!playingUrl) return;
      saveProgress(playingUrl, pos, dur);
      setProgressTick((t) => t + 1);
    },
    onNext: () => {
      if (nextItem) play(nextItem.ep.video_url, nextItem.seasonKey, false);
    },
  };

  const startMain = () => {
    if (resumeTarget) play(resumeTarget.url, resumeTarget.seasonKey);
  };

  const ctaRemaining = resumeTarget?.pr ? Math.max(0, resumeTarget.pr.d - resumeTarget.pr.p) : 0;
  const ctaLabel = resumeTarget?.pr
    ? `Continuar${resumeTarget.label ? ` ${resumeTarget.label}` : ""}`
    : resumeTarget?.label
      ? `Ver ${resumeTarget.label}`
      : "Reproducir";

  const episodeCount = (key: string) => flatEpisodes.filter((f) => f.seasonKey === key).length;
  const activeSeasonNumber = seasons.find(([k]) => k === activeSeason)?.[1].season_number;

  // Pocas temporadas: botones que saltan de línea (siempre visibles, sin deslizar).
  // Muchas: selector desplegable con el número de episodios de cada una.
  const seasonPills = (size: "sm" | "md") =>
    seasons.length > 4 ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={`w-full flex items-center justify-between gap-2 rounded-xl bg-white/5 ring-1 ring-white/10 hover:ring-primary/50 hover:bg-white/10 transition font-bold ${
              size === "sm" ? "px-3.5 py-2.5 text-sm" : "px-4 py-3 text-base"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
              Temporada {activeSeasonNumber}
              <span className="text-xs font-medium text-white/40">
                {activeSeason ? episodeCount(activeSeason) : 0} episodios
              </span>
            </span>
            <ChevronDown className="w-4 h-4 text-white/60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-[60vh] overflow-y-auto bg-popover border-border rounded-xl p-1"
        >
          {seasons.map(([key, season]) => (
            <DropdownMenuItem
              key={key}
              onSelect={() => setSelectedSeason(key)}
              className={`flex items-center justify-between rounded-lg px-3 py-2.5 cursor-pointer ${
                activeSeason === key ? "bg-primary/15 text-white" : "text-white/75"
              }`}
            >
              <span className="font-semibold">Temporada {season.season_number}</span>
              <span className="flex items-center gap-2 text-xs text-white/40">
                {episodeCount(key)} ep.
                {activeSeason === key && <Check className="w-4 h-4 text-primary" />}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    ) : (
      <div className="flex flex-wrap gap-2">
        {seasons.map(([key, season]) => {
          const activeKey = activeSeason === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedSeason(key)}
              className={`rounded-full font-bold transition-all whitespace-nowrap ${
                size === "sm" ? "px-3.5 py-1.5 text-xs" : "px-4 py-2 text-sm"
              } ${
                activeKey
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              Temporada {season.season_number}
            </button>
          );
        })}
      </div>
    );

  const metaRow = (
    <div className="flex flex-wrap items-center gap-2.5 text-sm text-white/70">
      {content.vote_average != null && (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold ring-1 ${ratingColor(content.vote_average)}`}
        >
          <Star className="w-3.5 h-3.5 fill-current" />
          {content.vote_average > 0 ? content.vote_average.toFixed(1) : "Nuevo"}
        </span>
      )}
      {year && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 ring-1 ring-white/10">
          <Calendar className="w-3.5 h-3.5" />
          {year}
        </span>
      )}
      {isSeries && seasons.length > 0 && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 ring-1 ring-white/10">
          <Layers className="w-3.5 h-3.5" />
          {seasons.length} {seasons.length === 1 ? "Temporada" : "Temporadas"}
        </span>
      )}
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 text-primary ring-1 ring-primary/30 font-semibold">
        {isMovie ? <Film className="w-3.5 h-3.5" /> : <Tv className="w-3.5 h-3.5" />}
        {isMovie ? "Película" : "Serie"}
      </span>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />

      {/* ═══ Fondo cinematográfico ═══ */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[90vh] overflow-hidden"
        aria-hidden
      >
        <motion.img
          key={backdrop}
          src={backdrop}
          alt=""
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 0.45, scale: 1.02 }}
          transition={{ duration: 1.2 }}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
      </div>

      <div className="relative z-10 pt-20 px-4 md:px-8 max-w-7xl mx-auto">
        <AdBanner slot="content_top" className="mb-4" />

        {/* ═══ REPRODUCTOR + EPISODIOS ═══ */}
        <div className="flex flex-col lg:flex-row gap-6 mb-10">
          <div className="flex-1 min-w-0 scroll-mt-20" ref={playerRef}>
            {playingUrl ? (
              <>
                <div ref={playerBoxRef}>
                  <VideoPlayer url={playingUrl} title={content.title} bridge={bridge} />
                </div>

                {/* Barra "Ahora viendo" + anterior/siguiente */}
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl bg-card/70 border border-border/70 backdrop-blur-md px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-primary">Ahora viendo</p>
                    <p className="font-semibold truncate">
                      {current
                        ? `T${current.seasonNumber} · E${current.ep.episode_number} — ${current.ep.name || `Episodio ${current.ep.episode_number}`}`
                        : content.title}
                    </p>
                  </div>
                  {resumeAt && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-white/60">
                      <RotateCcw className="w-3.5 h-3.5" /> Reanudado en {formatClock(resumeAt)}
                    </span>
                  )}
                  {isSeries && (prevItem || nextItem) && (
                    <div className="flex gap-2">
                      <button
                        disabled={!prevItem}
                        onClick={() =>
                          prevItem && play(prevItem.ep.video_url, prevItem.seasonKey, false)
                        }
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold bg-white/5 ring-1 ring-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      >
                        <ChevronLeft className="w-4 h-4" /> Anterior
                      </button>
                      <button
                        disabled={!nextItem}
                        onClick={() =>
                          nextItem && play(nextItem.ep.video_url, nextItem.seasonKey, false)
                        }
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      >
                        Siguiente <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Portada grande antes de reproducir */
              <div
                ref={playerBoxRef}
                className="relative w-full aspect-video rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] group"
              >
                <img
                  src={backdrop}
                  alt={content.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent" />

                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 md:p-8 flex flex-col gap-3 md:gap-4">
                  <div className="hidden sm:block">
                    <TitleLogo
                      tmdbId={content.id}
                      mediaType={content.media_type}
                      title={content.title}
                      as="h2"
                      textClassName="text-2xl md:text-4xl font-black tracking-tight drop-shadow-lg"
                      imgClassName="max-w-[240px] md:max-w-[340px] max-h-[70px] md:max-h-[110px] object-contain object-left drop-shadow-2xl"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {resumeTarget && (
                      <button
                        onClick={startMain}
                        className="relative overflow-hidden flex items-center gap-2.5 pl-5 pr-6 py-3 md:py-3.5 rounded-full bg-primary text-primary-foreground font-extrabold text-sm md:text-base shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-transform duration-300 ease-out"
                      >
                        <Play className="w-5 h-5 fill-current" />
                        {ctaLabel}
                        {resumeTarget.pr && (
                          <span className="absolute inset-x-0 bottom-0 h-1 bg-black/15">
                            <span
                              className="block h-full bg-primary-foreground/60"
                              style={{ width: `${progressRatio(resumeTarget.pr) * 100}%` }}
                            />
                          </span>
                        )}
                      </button>
                    )}
                    <button
                      onClick={handleToggleList}
                      className="flex items-center gap-2 px-5 py-3 md:py-3.5 rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/25 font-bold text-sm md:text-base hover:bg-white/25 transition"
                    >
                      {inMyList ? (
                        <BookmarkCheck className="w-5 h-5 text-primary" />
                      ) : (
                        <Bookmark className="w-5 h-5" />
                      )}
                      {inMyList ? "En mi lista" : "Mi lista"}
                    </button>
                  </div>
                  {resumeTarget?.pr && (
                    <p className="text-xs md:text-sm text-white/70">
                      Te quedan {formatMinutes(ctaRemaining)}
                    </p>
                  )}
                  {!resumeTarget && (
                    <p className="text-sm text-white/60">
                      Este título todavía no tiene video disponible.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Episodios (móvil y tablet) */}
            {isSeries && seasons.length > 0 && (
              <div className="mt-6 lg:hidden">
                <h3 className="text-base font-bold mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" /> Episodios
                </h3>
                {seasons.length > 1 && <div className="mb-3">{seasonPills("sm")}</div>}
                <div className="space-y-2">
                  {seasonEpisodes.map((item) => (
                    <EpisodeItem
                      key={item.ep.video_url}
                      item={item}
                      fallbackThumb={episodeThumbFallback}
                      active={playingUrl === item.ep.video_url}
                      onSelect={() => play(item.ep.video_url, item.seasonKey)}
                    />
                  ))}
                  {seasonEpisodes.length === 0 && (
                    <p className="text-sm text-white/40 py-4 text-center">
                      Sin episodios disponibles en esta temporada.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Episodios (escritorio) */}
          {isSeries && seasons.length > 0 && (
            <aside
              className="hidden lg:flex lg:w-[360px] xl:w-[400px] flex-shrink-0 flex-col rounded-2xl bg-card/70 backdrop-blur-xl border border-border/70 overflow-hidden"
              style={playerHeight ? { height: `${playerHeight}px` } : undefined}
            >
              <div className="p-4 border-b border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" /> Episodios
                  </h3>
                  <span className="text-xs text-white/40">{seasonEpisodes.length} disponibles</span>
                </div>
                {seasonPills("sm")}
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-hide p-2 space-y-2">
                {seasonEpisodes.map((item) => (
                  <EpisodeItem
                    key={item.ep.video_url}
                    item={item}
                    compact
                    fallbackThumb={episodeThumbFallback}
                    active={playingUrl === item.ep.video_url}
                    onSelect={() => play(item.ep.video_url, item.seasonKey)}
                  />
                ))}
                {seasonEpisodes.length === 0 && (
                  <p className="text-sm text-white/40 py-6 text-center">
                    Sin episodios disponibles en esta temporada.
                  </p>
                )}
              </div>
            </aside>
          )}
        </div>

        {/* ═══ INFORMACIÓN ═══ */}
        <div className="flex flex-col lg:flex-row gap-8 mb-12">
          <div className="hidden lg:block w-56 xl:w-64 flex-shrink-0">
            <motion.img
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              src={getImageUrl(content.poster_path, "w500")}
              alt={content.title}
              className="w-full rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] ring-1 ring-white/10"
            />
          </div>

          <div className="flex-1 min-w-0 space-y-6">
            <div>
              <h1 className="font-display font-condensed text-5xl md:text-7xl font-extrabold tracking-tight mb-3 leading-[0.95]">
                {content.title}
              </h1>
              {content.original_title && content.original_title !== content.title && (
                <p className="text-sm text-white/40 -mt-2 mb-3">{content.original_title}</p>
              )}
              {metaRow}
            </div>

            {content.genres?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(content.genres.map(canonicalGenre))).map((name) => (
                  <Link
                    key={name}
                    to={`/category/${encodeURIComponent(name)}`}
                    className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-white/5 ring-1 ring-white/10 text-white/80 hover:ring-primary/50 hover:text-primary transition"
                  >
                    {name}
                  </Link>
                ))}
              </div>
            )}

            <div>
              <p
                className={`text-base text-white/75 leading-relaxed max-w-3xl ${showFullOverview ? "" : "line-clamp-4"}`}
              >
                {content.overview || "No hay descripción disponible."}
              </p>
              {(content.overview?.length || 0) > 280 && (
                <button
                  onClick={() => setShowFullOverview((v) => !v)}
                  className="mt-1 text-sm font-semibold text-primary hover:underline"
                >
                  {showFullOverview ? "Ver menos" : "Ver más"}
                </button>
              )}
            </div>

            {creators.length > 0 && (
              <div>
                <h3 className="font-display text-lg font-bold mb-1">
                  {isMovie ? "Dirección" : "Creadores"}
                </h3>
                <p className="text-sm font-medium text-white/90">
                  {creators.map((p: any) => p.name).join(", ")}
                </p>
              </div>
            )}

            {cast.length > 0 && (
              <div>
                <h3 className="font-display text-lg font-bold mb-3">Reparto</h3>
                <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
                  {cast.map((person: any) => (
                    <div key={person.id} className="group flex-shrink-0 w-20 text-center">
                      <div className="w-16 h-16 mx-auto rounded-full overflow-hidden ring-2 ring-white/10 group-hover:ring-primary transition bg-white/5">
                        {person.profile_path ? (
                          <img
                            src={getImageUrl(person.profile_path, "w200")}
                            alt={person.name}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg font-bold text-white/40">
                            {person.name?.[0]}
                          </div>
                        )}
                      </div>
                      <p className="mt-2 text-[11px] font-semibold text-white/85 line-clamp-1">
                        {person.name}
                      </p>
                      {person.character && (
                        <p className="text-[10px] text-white/40 line-clamp-1">{person.character}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <AdBanner slot="content_middle" className="my-6" />

        {/* ═══ RELACIONADOS ═══ */}
        {related.length > 0 && (
          <div className="pb-20 pt-10 border-t border-white/5">
            <p
              className="font-display text-2xl font-bold mb-6 tracking-tight"
              role="heading"
              aria-level={2}
            >
              También podría gustarte
            </p>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-3 gap-y-5 md:gap-x-4 md:gap-y-6">
              {related.slice(0, 12).map((item, i) => (
                <ContentCard
                  key={item.docId || item.id}
                  content={item}
                  index={i}
                  grid
                  titleAs="h2"
                />
              ))}
            </div>
          </div>
        )}
        <AdBanner slot="content_bottom" className="mb-8" />
      </div>
    </div>
  );
};

export default ContentPage;
