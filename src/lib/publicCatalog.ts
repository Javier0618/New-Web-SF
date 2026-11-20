import type { Content } from "@/types/content";
import type { LocalCache } from "@/lib/catalog";

interface CatalogVersion {
  version: 1;
  revision: string;
  count: number;
  url: string;
}
export async function readPublicCatalogVersion(
  signal?: AbortSignal,
): Promise<CatalogVersion | null> {
  const response = await fetch(`/catalog/version.json?t=${Date.now()}`, {
    cache: "no-store",
    signal,
  });
  if (response.status === 404) return null; // Compatibility with an older deployment.
  if (!response.ok) throw new Error("No se pudo comprobar la versión del catálogo");
  const data = await response.json();
  if (
    data.version !== 1 ||
    !/^[a-f0-9]{24}$/.test(data.revision) ||
    !Number.isInteger(data.count) ||
    data.count < 0 ||
    data.url !== `/catalog/catalog-${data.revision}.json`
  )
    throw new Error("Versión de catálogo inválida");
  return data;
}

export async function readPublicCatalog(signal?: AbortSignal): Promise<LocalCache | null> {
  const version = await readPublicCatalogVersion(signal);
  if (!version) return null;
  const response = await fetch(version.url, { cache: "force-cache", signal });
  if (!response.ok) throw new Error("No se pudo actualizar el catálogo");
  const snapshot = await response.json();
  if (
    snapshot.version !== 1 ||
    snapshot.revision !== version.revision ||
    snapshot.count !== version.count ||
    !Array.isArray(snapshot.items) ||
    snapshot.items.length !== version.count ||
    snapshot.items.some(
      (c: Content) =>
        !c.docId || !c.title || !Number.isFinite(c.id) || !["movie", "tv"].includes(c.media_type),
    )
  )
    throw new Error("Catálogo incompleto; se conserva la versión anterior");
  return { items: snapshot.items, revision: version.revision, t: Date.now() };
}
