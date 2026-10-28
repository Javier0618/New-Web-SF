import { useState, useEffect, useRef, useCallback } from "react";

const PAGE_SIZE = 30;

export const useInfiniteScroll = <T>(
  items: T[], 
  pageSize = PAGE_SIZE, 
  loadMoreAsync?: () => Promise<void>,
  hasMoreAsync?: boolean
) => {
  const [visible, setVisible] = useState(pageSize);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const hasMoreLocal = visible < items.length;
  const hasMore = loadMoreAsync ? hasMoreAsync : hasMoreLocal;
  const displayed = items.slice(0, visible);

  const loadMore = useCallback(async () => {
    if (isLoadingMore) return;
    
    if (loadMoreAsync) {
      setIsLoadingMore(true);
      await loadMoreAsync();
      setIsLoadingMore(false);
    } else {
      setVisible((v) => Math.min(v + pageSize, items.length));
    }
  }, [items.length, pageSize, loadMoreAsync, isLoadingMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { 
        root: null,
        rootMargin: "0px 0px 1000px 0px",
        threshold: 0.1
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore, isLoadingMore]);

  // Reset local visibility when items change (only for non-async mode)
  useEffect(() => {
    if (!loadMoreAsync) {
      setVisible(pageSize);
    }
  }, [items, pageSize, loadMoreAsync]);

  return { displayed: loadMoreAsync ? items : displayed, hasMore, sentinelRef, isLoadingMore };
};
