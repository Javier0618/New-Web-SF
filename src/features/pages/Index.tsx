import LoadingScreen from "@/components/LoadingScreen";
import { useMemo, useRef, Fragment, type ReactNode } from "react";
import Hero from "@/components/home/Hero";
import ContentCarousel from "@/components/home/ContentCarousel";
import Top10Carousel from "@/components/home/Top10Carousel";
import PlatformFilter from "@/components/home/PlatformFilter";
import IntentBar from "@/components/home/IntentBar";
import Navbar from "@/components/layout/Navbar";
import { Link } from "@/lib/react-router-shim";
import { useContent } from "@/hooks/useContent";
import { canonicalGenre } from "@/lib/genres";
import { resolveHomeOrder } from "@/lib/homeSections";
import { useWebConfig } from "@/hooks/useWebConfig";
import AdBanner from "@/components/ads/AdBanner";
import ContinueWatchingRow from "@/components/home/ContinueWatchingRow";
import {
  Swords,
  Laugh,
  Drama,
  Rocket,
  Wand2,
  Ghost,
  Eye,
  Search,
  Fingerprint,
  Heart,
  Users,
  Palette,
  Clapperboard,
  Music,
  Landmark,
  Shield,
  Mountain,
  Tv,
  Video,
  Mic,
  Newspaper,
  Film,
  Tag,
  type LucideIcon,
} from "lucide-react";

// Ícono representativo por género. La clave está normalizada (sin acentos) para
// no depender de cómo se escriba el nombre.
const GENRE_ICONS: Record<string, LucideIcon> = {
  accion: Swords,
  comedia: Laugh,
  drama: Drama,
  "ciencia ficcion": Rocket,
  fantasia: Wand2,
  terror: Ghost,
  suspenso: Eye,
  misterio: Search,
  crimen: Fingerprint,
  romance: Heart,
  familia: Users,
  animacion: Palette,
  documental: Clapperboard,
  musica: Music,
  historia: Landmark,
  belica: Shield,
  western: Mountain,
  telenovela: Tv,
  reality: Video,
  "talk show": Mic,
  noticias: Newspaper,
  "pelicula de tv": Film,
};

const genreIcon = (name: string): LucideIcon =>
  GENRE_ICONS[name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")] || Tag;

// Seeded random for session-stable shuffling
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const copy = [...arr];
  let s = seed;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getSessionSeed(): number {
  const key = "session_shuffle_seed";
  const stored = sessionStorage.getItem(key);
  if (stored) return Number(stored);
  const seed = Math.floor(Math.random() * 2147483646) + 1;
  sessionStorage.setItem(key, String(seed));
  return seed;
}

const Index = () => {
  const { content, loading } = useContent();
  const { data: webConfig } = useWebConfig();

  const sessionSeed = useMemo(() => getSessionSeed(), []);

  const heroContent = useMemo(() => {
    if (content.length === 0) return null;
    const withBackdrop = content.filter((c) => c.backdrop_path);
    return withBackdrop.length > 0 ? seededShuffle(withBackdrop, sessionSeed)[0] : content[0];
  }, [content, sessionSeed]);

  const movies = useMemo(
    () =>
      seededShuffle(
        content.filter((c) => c.media_type === "movie"),
        sessionSeed,
      ),
    [content, sessionSeed],
  );
  const series = useMemo(
    () =>
      seededShuffle(
        content.filter((c) => c.media_type === "tv"),
        sessionSeed + 1,
      ),
    [content, sessionSeed],
  );

  const enEstreno = useMemo(
    () =>
      seededShuffle(
        content
          .filter((c) => c.display_options?.home_sections?.includes("estreno"))
          .sort((a, b) => (b.release_date || "").localeCompare(a.release_date || "")),
        sessionSeed + 2,
      ),
    [content, sessionSeed],
  );

  const recienAgregado = useMemo(
    () =>
      seededShuffle(
        content
          .filter((c) => c.display_options?.home_sections?.includes("agregado"))
          .sort((a, b) => (b.imported_at?.seconds || 0) - (a.imported_at?.seconds || 0)),
        sessionSeed + 3,
      ),
    [content, sessionSeed],
  );

  const genreGroups = useMemo(() => {
    const genres = new Map<string, typeof content>();
    content.forEach((c) => {
      // Un mismo título puede traer géneros que colapsan al mismo nombre
      // canónico (p. ej. "Acción" y "Action & Adventure"): lo contamos una vez.
      const seen = new Set<string>();
      c.genres?.forEach((g) => {
        const name = canonicalGenre(g);
        if (seen.has(name)) return;
        seen.add(name);
        if (!genres.has(name)) genres.set(name, []);
        genres.get(name)!.push(c);
      });
    });
    // Shuffle each genre group
    let offset = 4;
    for (const [key, items] of genres) {
      genres.set(key, seededShuffle(items, sessionSeed + offset));
      offset++;
    }
    return genres;
  }, [content, sessionSeed]);

  const top10Items = useMemo(() => {
    const cfg = webConfig?.top10;
    if (!cfg || cfg.enabled === false) return [];
    const manualIds: string[] = cfg.manualIds || [];

    // Check sessionStorage for cached top10
    const cacheKey = "session_top10_ids";
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const ids: string[] = JSON.parse(cached);
        const items = ids
          .map((id) => content.find((c) => String(c.id) === id || c.docId === id))
          .filter(Boolean) as typeof content;
        if (items.length > 0) return items;
      } catch {}
    }

    // Build fresh top10
    const manual = manualIds
      .map((id) => content.find((c) => String(c.id) === id))
      .filter(Boolean) as typeof content;

    if (!cfg.random && manual.length > 0) {
      const result = manual.slice(0, 10);
      sessionStorage.setItem(cacheKey, JSON.stringify(result.map((c) => String(c.id))));
      return result;
    }

    const remaining = 10 - manual.length;
    if (remaining <= 0) {
      const result = manual.slice(0, 10);
      sessionStorage.setItem(cacheKey, JSON.stringify(result.map((c) => String(c.id))));
      return result;
    }

    const manualIdSet = new Set(manualIds);
    const others = content.filter((c) => !manualIdSet.has(String(c.id)));
    const randomFill = seededShuffle(others, sessionSeed + 100).slice(0, remaining);
    const result = [...manual, ...randomFill];
    sessionStorage.setItem(cacheKey, JSON.stringify(result.map((c) => String(c.id))));
    return result;
  }, [content, webConfig?.top10, sessionSeed]);

  const sections = webConfig?.homepageSections || {
    enEstreno: 20,
    recienAgregado: 20,
    peliculasPopulares: 20,
    seriesPopulares: 20,
  };
  const titles = {
    enEstreno: webConfig?.sectionTitles?.enEstreno || "En Estreno/Emisión",
    recienAgregado: webConfig?.sectionTitles?.recienAgregado || "Recién Agregado",
    peliculasPopulares: webConfig?.sectionTitles?.peliculasPopulares || "Películas Populares",
    seriesPopulares: webConfig?.sectionTitles?.seriesPopulares || "Series Populares",
  };

  const isCategoryVisible = (key: string) => {
    if (!webConfig?.visibleCategories || webConfig.visibleCategories.length === 0) return true;
    return webConfig.visibleCategories.includes(key);
  };

  // Las secciones curadas ya ocupan la portada. Las filas de género se limitan a
  // las más grandes; el resto queda a un clic en "Explorar todas las categorías",
  // para que la página no se vuelva una lista interminable.
  const GENRE_ROW_LIMIT = 8;
  const normKey = (g: string) => g.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const visibleGenres = Array.from(genreGroups.entries())
    .filter(([genre]) => isCategoryVisible(normKey(genre)))
    .sort((a, b) => b[1].length - a[1].length);
  const genreRows = visibleGenres.slice(0, GENRE_ROW_LIMIT);
  const moreGenres = visibleGenres.slice(GENRE_ROW_LIMIT);

  if (loading) {
    return (
      <>
        <Navbar />
        <LoadingScreen />
      </>
    );
  }

  const siteTitle =
    webConfig?.siteName || webConfig?.title || "StreamFusion — Películas, Series, Animes y Doramas";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <h1 className="sr-only">{siteTitle}</h1>
      <Hero content={heroContent} allContent={content} heroConfig={webConfig?.heroSlider} />

      <div className="relative z-10 pt-2 pb-16">
        <AdBanner slot="home_top" className="px-4 md:px-10 my-4" />
        {(() => {
          // Cada sección de la portada es un nodo con clave; el admin decide el
          // orden y cuáles se muestran desde la pestaña "Secciones".
          const nodes: Record<string, ReactNode> = {
            intent: <IntentBar content={content} />,
            platforms: (
              <PlatformFilter content={content} visiblePlatforms={webConfig?.visiblePlatforms} />
            ),
            continue: <ContinueWatchingRow content={content} />,
            enEstreno:
              isCategoryVisible("enEstreno") && enEstreno.length > 0 ? (
                <ContentCarousel
                  title={titles.enEstreno}
                  items={enEstreno.slice(0, sections.enEstreno)}
                />
              ) : null,
            recienAgregado:
              isCategoryVisible("recienAgregado") && recienAgregado.length > 0 ? (
                <ContentCarousel
                  title={titles.recienAgregado}
                  items={recienAgregado.slice(0, sections.recienAgregado)}
                />
              ) : null,
            peliculas:
              isCategoryVisible("peliculas") && movies.length > 0 ? (
                <ContentCarousel
                  title={titles.peliculasPopulares}
                  items={movies.slice(0, sections.peliculasPopulares)}
                  viewAllLink="/category/movies"
                />
              ) : null,
            top10:
              top10Items.length > 0 ? (
                <Top10Carousel
                  title={webConfig?.top10?.title || "Lo más visto hoy"}
                  items={top10Items}
                />
              ) : null,
            series:
              isCategoryVisible("series") && series.length > 0 ? (
                <ContentCarousel
                  title={titles.seriesPopulares}
                  items={series.slice(0, sections.seriesPopulares)}
                  viewAllLink="/category/series"
                />
              ) : null,
            genres: (
              <>
                {moreGenres.length > 0 && (
                  <section className="px-4 md:px-10 mb-12">
                    <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight mb-6 text-center">
                      Explorar todas las categorías
                    </h2>
                    <div className="flex flex-wrap justify-center gap-2.5 max-w-4xl mx-auto">
                      {moreGenres.map(([genre, items]) => {
                        const Icon = genreIcon(genre);
                        return (
                          <Link
                            key={genre}
                            to={`/category/${encodeURIComponent(genre)}`}
                            className="group inline-flex items-center gap-2 h-10 pl-3.5 pr-4 rounded-full border border-border bg-secondary/40 text-sm font-semibold text-foreground/80 hover:bg-secondary hover:text-foreground hover:border-primary/40 transition-colors"
                          >
                            <Icon className="w-4 h-4 text-primary" />
                            {genre}
                            <span className="text-xs text-muted-foreground group-hover:text-foreground/60">
                              {items.length}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                )}
                {genreRows.map(([genre, items]) => (
                  <ContentCarousel
                    key={genre}
                    title={genre}
                    items={items.slice(0, 20)}
                    viewAllLink={`/category/${encodeURIComponent(genre)}`}
                  />
                ))}
              </>
            ),
          };
          const order = resolveHomeOrder(webConfig?.homeOrder).filter((s) => s.enabled);
          const mid = Math.floor(order.length / 2);
          return order.map((s, i) => (
            <Fragment key={s.id}>
              {nodes[s.id]}
              {i === mid && <AdBanner slot="home_middle" className="px-4 md:px-10 my-4" />}
            </Fragment>
          ));
        })()}
        <AdBanner slot="home_bottom" className="px-4 md:px-10 my-4" />
      </div>
    </div>
  );
};

export default Index;
