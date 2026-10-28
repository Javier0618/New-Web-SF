/**
 * Detecta si la app está corriendo en un navegador de Smart TV / consola
 * (WebOS, Tizen, HbbTV, PlayStation, Xbox, AndroidTV, etc.) y activa la clase
 * `tv-mode` en <html>. Los estilos condicionales viven en styles.css bajo
 * `html.tv-mode ...` para NO afectar desktop ni mobile.
 *
 * También expone `?tv=1` como override manual y `?tv=0` para forzar OFF.
 */

const TV_UA_REGEX =
  /(SMART-TV|SmartTV|SMARTTV|Tizen|Web0S|WebOS|NetCast|HbbTV|VIERA|BRAVIA|Roku|AppleTV|CrKey|PlayStation|Xbox|Nintendo|GoogleTV|AndroidTV|AFT[A-Z])/i;

export function detectTvMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    const override = params.get("tv");
    if (override === "1") {
      localStorage.setItem("tv-mode", "1");
      return true;
    }
    if (override === "0") {
      localStorage.removeItem("tv-mode");
      return false;
    }
    if (localStorage.getItem("tv-mode") === "1") return true;
  } catch {
    /* ignore */
  }
  const ua = navigator.userAgent || "";
  if (TV_UA_REGEX.test(ua)) return true;

  // Heurística adicional: pantalla grande + puntero coarse/none + sin hover.
  try {
    const w = window.screen?.width || 0;
    const noHover = window.matchMedia?.("(hover: none)").matches;
    const coarse = window.matchMedia?.("(pointer: coarse), (pointer: none)").matches;
    if (w >= 1280 && noHover && coarse && !/Mobi|Android.*Mobile|iPhone|iPad/i.test(ua)) {
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function applyTvModeClass(): void {
  if (typeof document === "undefined") return;
  if (detectTvMode()) {
    document.documentElement.classList.add("tv-mode");
  }
}
