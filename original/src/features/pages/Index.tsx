import { useMemo, useRef } from "react";
import Hero from "@/components/home/Hero";
import ContentCarousel from "@/components/home/ContentCarousel";
import Top10Carousel from "@/components/home/Top10Carousel";
import PlatformFilter from "@/components/home/PlatformFilter";
import Navbar from "@/components/layout/Navbar";
import { useContent } from "@/hooks/useContent";
import { getGenreName } from "@/lib/genres";
import { useWebConfig } from "@/hooks/useWebConfig";
import AdBanner from "@/components/ads/AdBanner";
import ContinueWatchingRow from "@/components/home/ContinueWatchingRow";

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
    return withBackdrop.length > 0
      ? seededShuffle(withBackdrop, sessionSeed)[0]
      : content[0];
  }, [content, sessionSeed]);

  const movies = useMemo(() => seededShuffle(content.filter((c) => c.media_type === "movie"), sessionSeed), [content, sessionSeed]);
  const series = useMemo(() => seededShuffle(content.filter((c) => c.media_type === "tv"), sessionSeed + 1), [content, sessionSeed]);

  const enEstreno = useMemo(
    () => seededShuffle(
      content.filter((c) => c.display_options?.home_sections?.includes("estreno"))
        .sort((a, b) => (b.release_date || "").localeCompare(a.release_date || "")),
      sessionSeed + 2
    ),
    [content, sessionSeed]
  );

  const recienAgregado = useMemo(
    () => seededShuffle(
      content.filter((c) => c.display_options?.home_sections?.includes("agregado"))
        .sort((a, b) => (b.imported_at?.seconds || 0) - (a.imported_at?.seconds || 0)),
      sessionSeed + 3
    ),
    [content, sessionSeed]
  );

  const genreGroups = useMemo(() => {
    const genres = new Map<string, typeof content>();
    content.forEach((c) => {
      c.genres?.forEach((g) => {
        const name = getGenreName(g);
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
        const items = ids.map(id => content.find(c => String(c.id) === id || c.docId === id)).filter(Boolean) as typeof content;
        if (items.length > 0) return items;
      } catch {}
    }

    // Build fresh top10
    const manual = manualIds
      .map(id => content.find(c => String(c.id) === id))
      .filter(Boolean) as typeof content;

    if (!cfg.random && manual.length > 0) {
      const result = manual.slice(0, 10);
      sessionStorage.setItem(cacheKey, JSON.stringify(result.map(c => String(c.id))));
      return result;
    }

    const remaining = 10 - manual.length;
    if (remaining <= 0) {
      const result = manual.slice(0, 10);
      sessionStorage.setItem(cacheKey, JSON.stringify(result.map(c => String(c.id))));
      return result;
    }

    const manualIdSet = new Set(manualIds);
    const others = content.filter(c => !manualIdSet.has(String(c.id)));
    const randomFill = seededShuffle(others, sessionSeed + 100).slice(0, remaining);
    const result = [...manual, ...randomFill];
    sessionStorage.setItem(cacheKey, JSON.stringify(result.map(c => String(c.id))));
    return result;
  }, [content, webConfig?.top10, sessionSeed]);

  const sections = webConfig?.homepageSections || { enEstreno: 20, recienAgregado: 20, peliculasPopulares: 20, seriesPopulares: 20 };
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="h-[85vh] animate-pulse bg-muted" />
        <div className="px-4 md:px-12 mt-8 space-y-8">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-6 w-48 bg-muted rounded mb-4" />
              <div className="flex gap-3">
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="w-[180px] aspect-[2/3] bg-muted rounded-md flex-shrink-0" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const siteTitle = webConfig?.siteName || webConfig?.title || "StreamFusion — Películas, Series, Animes y Doramas";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <h1 className="sr-only">{siteTitle}</h1>
      <Hero content={heroContent} allContent={content} heroConfig={webConfig?.heroSlider} />

      <div className="relative z-10 pb-16">
        <PlatformFilter content={content} visiblePlatforms={webConfig?.visiblePlatforms} />
        <ContinueWatchingRow content={content} />
        <AdBanner slot="home_top" className="px-4 md:px-12 my-4" />
        {isCategoryVisible("enEstreno") && enEstreno.length > 0 && <ContentCarousel title={titles.enEstreno} items={enEstreno.slice(0, sections.enEstreno)} />}
        {isCategoryVisible("recienAgregado") && recienAgregado.length > 0 && <ContentCarousel title={titles.recienAgregado} items={recienAgregado.slice(0, sections.recienAgregado)} />}
        {isCategoryVisible("peliculas") && movies.length > 0 && <ContentCarousel title={titles.peliculasPopulares} items={movies.slice(0, sections.peliculasPopulares)} viewAllLink="/category/movies" />}
        <AdBanner slot="home_middle" className="px-4 md:px-12 my-4" />
        {top10Items.length > 0 && <Top10Carousel title={webConfig?.top10?.title || "Top 10 Más Vistos"} items={top10Items} />}
        {isCategoryVisible("series") && series.length > 0 && <ContentCarousel title={titles.seriesPopulares} items={series.slice(0, sections.seriesPopulares)} viewAllLink="/category/series" />}
        {Array.from(genreGroups.entries())
          .filter(([genre]) => isCategoryVisible(genre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")))
          .map(([genre, items]) => (
          <ContentCarousel
            key={genre}
            title={genre}
            items={items.slice(0, 20)}
            viewAllLink={`/category/${encodeURIComponent(genre)}`}
          />
        ))}
        <AdBanner slot="home_bottom" className="px-4 md:px-12 my-4" />
      </div>
    </div>
  );
};

export default Index;
