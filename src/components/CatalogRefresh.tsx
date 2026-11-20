import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { readPublicCatalogVersion } from "@/lib/publicCatalog";
import { readLocalCatalog, type LocalCache } from "@/lib/catalog";

/** One version check for the whole app; visitors never poll Firestore itself. */
export default function CatalogRefresh() {
  const client = useQueryClient();
  const { data: version, dataUpdatedAt: checkedAt } = useQuery({
    queryKey: ["catalog-version"],
    queryFn: ({ signal }) => readPublicCatalogVersion(signal),
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: "always",
    retry: 1,
  });
  const { data: catalog, fetchStatus } = useQuery<LocalCache>({
    queryKey: ["catalog"],
    enabled: false,
    initialData: () => readLocalCatalog() ?? undefined,
    initialDataUpdatedAt: () => readLocalCatalog()?.t,
  });
  const attempted = useRef("");
  useEffect(() => {
    const attempt = `${version?.revision}:${checkedAt}`;
    if (
      version &&
      catalog &&
      version.revision !== catalog.revision &&
      fetchStatus === "idle" &&
      attempted.current !== attempt
    ) {
      attempted.current = attempt;
      void client.invalidateQueries({ queryKey: ["catalog"], refetchType: "active" });
    }
  }, [version, checkedAt, catalog, fetchStatus, client]);
  return null;
}
