import { useEffect, useRef } from "react";
import { useLocation } from "@/lib/react-router-shim";
import { useNavigationType } from "react-router-dom";

const ScrollToTop = () => {
  const { key, pathname } = useLocation();
  const navigationType = useNavigationType();
  const initialKey = useRef(key);
  const hasNavigated = useRef(false);

  useEffect(() => {
    let frame = 0;
    const storageKey = `sf_scroll_${key}`;
    if (key !== initialKey.current) hasNavigated.current = true;
    const documentNavigation = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    // React Router also calls a fresh page load/reload POP. Only actual
    // history traversal should recover an old position.
    const restorePosition =
      navigationType === "POP" &&
      (hasNavigated.current || documentNavigation?.type === "back_forward");
    let target = 0;
    try {
      if (restorePosition) target = Number(sessionStorage.getItem(storageKey)) || 0;
    } catch {
      /* private mode */
    }
    if (target) {
      const start = performance.now();
      const restore = () => {
        window.scrollTo(0, target);
        if (
          document.documentElement.scrollHeight < target + innerHeight &&
          performance.now() - start < 4000
        )
          frame = requestAnimationFrame(restore);
      };
      frame = requestAnimationFrame(restore);
    } else window.scrollTo(0, 0);
    let last = target;
    const save = () => {
      last = window.scrollY;
    };
    const persist = () => {
      try {
        sessionStorage.setItem(storageKey, String(last));
      } catch {
        /* private mode */
      }
    };
    window.addEventListener("scroll", save, { passive: true });
    window.addEventListener("pagehide", persist);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", save);
      window.removeEventListener("pagehide", persist);
      persist();
    };
  }, [key, pathname, navigationType]);

  return null;
};

export default ScrollToTop;
