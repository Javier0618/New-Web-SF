import { useMemo } from "react";
import Navbar from "@/components/layout/Navbar";
import PageHeader from "@/components/layout/PageHeader";
import ContentCard from "@/components/home/ContentCard";
import { useContent } from "@/hooks/useContent";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { Loader2 } from "lucide-react";
import AdBanner from "@/components/ads/AdBanner";

const DoramasPage = () => {
  const { content, loading } = useContent();

  const filtered = useMemo(
    () => content.filter((c) => c.display_options?.main_sections?.includes("doramas")),
    [content],
  );

  const { displayed, hasMore, sentinelRef } = useInfiniteScroll(filtered);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4 md:px-10">
        <PageHeader title="Doramas" count={loading ? undefined : filtered.length} />
        <AdBanner slot="doramas_top" className="my-4" />
        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-x-3 gap-y-5 md:gap-x-4 md:gap-y-6">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground">No se encontró contenido de doramas.</p>
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
        <AdBanner slot="doramas_bottom" className="my-4" />
      </div>
    </div>
  );
};

export default DoramasPage;
