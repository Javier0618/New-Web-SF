import { useMemo } from "react";
import { useParams } from "@/lib/react-router-shim";
import Navbar from "@/components/layout/Navbar";
import PageHeader from "@/components/layout/PageHeader";
import ContentCard from "@/components/home/ContentCard";
import { useContent } from "@/hooks/useContent";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { canonicalGenre } from "@/lib/genres";
import { Loader2 } from "lucide-react";

const CategoryPage = () => {
  const { type } = useParams<{ type: string }>();
  const { content, loading } = useContent();

  const platformIds = ["netflix", "disney", "hbo", "prime", "paramount"];
  const platformLabels: Record<string, string> = {
    netflix: "Netflix",
    disney: "Disney+",
    hbo: "Max",
    prime: "Prime Video",
    paramount: "Paramount+",
  };

  const isMediaType = type === "movies" || type === "series";
  const isPlatform = !!type && platformIds.includes(type);
  const mediaFilter = type === "movies" ? "movie" : "tv";

  const filtered = useMemo(() => {
    if (isMediaType) return content.filter((c) => c.media_type === mediaFilter);
    if (isPlatform) return content.filter((c) => c.display_options?.platforms?.includes(type!));
    const target = canonicalGenre(decodeURIComponent(type || ""));
    return content.filter((c) => c.genres?.some((g) => canonicalGenre(g) === target));
  }, [content, type, isMediaType, isPlatform, mediaFilter]);

  const title = isMediaType
    ? type === "movies"
      ? "Películas"
      : "Series"
    : isPlatform
      ? (platformLabels[type!] ?? decodeURIComponent(type || ""))
      : decodeURIComponent(type || "");

  const { displayed, hasMore, sentinelRef } = useInfiniteScroll(filtered);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4 md:px-10">
        <PageHeader title={title} count={loading ? undefined : filtered.length} />
        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-x-3 gap-y-5 md:gap-x-4 md:gap-y-6">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground">No se encontró contenido.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-x-3 gap-y-5 md:gap-x-4 md:gap-y-6">
              {displayed.map((item, i) => (
                <ContentCard key={item.docId || item.id} content={item} index={i % 30} grid />
              ))}
            </div>
            <div ref={sentinelRef} className="flex justify-center py-8">
              {hasMore && <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CategoryPage;
