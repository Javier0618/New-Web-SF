import { useEffect } from "react";
import { useLocation } from "@/lib/react-router-shim";
import { useNavigationType } from "react-router-dom";

const ScrollToTop = () => {
  const { key, pathname } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    let frame = 0;
    const storageKey = `sf_scroll_${key}`;
    let target = 0;
    try { if (navigationType === "POP") target = Number(sessionStorage.getItem(storageKey)) || 0; } catch { /* private mode */ }
    if (target) {
      const start = performance.now();
      const restore = () => {
        window.scrollTo(0, target);
        if (document.documentElement.scrollHeight < target + innerHeight && performance.now() - start < 4000) frame = requestAnimationFrame(restore);
      };
      frame = requestAnimationFrame(restore);
    } else window.scrollTo(0, 0);
    let last = target;
    const save = () => { last = window.scrollY; };
    window.addEventListener("scroll", save, { passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", save); try { sessionStorage.setItem(storageKey, String(last)); } catch { /* private mode */ } };
  }, [key, pathname, navigationType]);

  return null;
};

export default ScrollToTop;
