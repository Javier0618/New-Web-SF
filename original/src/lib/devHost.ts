/**
 * Detecta entornos de desarrollo / preview donde NO se debe exigir
 * configuración manual (config.js, licencia, etc.).
 *
 * Retorna true para:
 *  - localhost, 127.0.0.1, 0.0.0.0, *.local
 *  - Cualquier dominio Lovable: *.lovable.app, *.lovable.dev,
 *    *.lovableproject.com, *.lovable.host
 *
 * En producción real (dominio del cliente) retorna false y se aplican
 * todas las validaciones.
 */
export function isDevHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  if (!h) return false;
  if (h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0" || h.endsWith(".local")) {
    return true;
  }
  // Solo subdominios exactos de Lovable. Antes también aceptaba cualquier
  // dominio que *contuviera* "lovable" (p. ej. milovable.com), lo que permitía
  // saltarse la licencia registrando un dominio así.
  if (
    h.endsWith(".lovable.app") ||
    h.endsWith(".lovable.dev") ||
    h.endsWith(".lovableproject.com") ||
    h.endsWith(".lovable.host")
  ) {
    return true;
  }
  return false;
}
