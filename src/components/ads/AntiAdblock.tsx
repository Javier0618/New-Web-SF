import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, RefreshCw, Loader2, Sparkles, Film, ScanSearch, MonitorPlay } from "lucide-react";
import { useWebConfig } from "@/hooks/useWebConfig";

/**
 * AntiAdblock — detector basado en la visibilidad real de los anuncios.
 *
 * Estrategia (a prueba de falsos positivos):
 *
 *  1. Solo se activa si el admin tiene `ads.antiAdblock` ON.
 *  2. Localiza los slots reales (`<AdBanner>`) que el admin haya configurado
 *     con código y que ya hayan sido inyectados (data-ad-injected="true").
 *  3. Si NO hay slots inyectados en la página actual → no hace nada.
 *     (Algunas páginas pueden no tener anuncios; nunca bloqueamos en ese caso).
 *  4. Si hay slots inyectados, espera un margen razonable a que la red de
 *     anuncios responda y mide cuántos terminan con contenido visible
 *     (iframe, img, ins con altura, etc).
 *  5. Si TODOS los slots inyectados quedan vacíos u ocultos → hay bloqueador.
 *  6. Refuerzo opcional: una mini prueba cosmética con bait local.
 *     Solo cuenta como "evidencia adicional", no dispara por sí sola.
 *  7. Doble confirmación con delay para descartar lentitud de red.
 */

type DetectResult = "blocked" | "ok" | "no-slots";

interface DetectionSignal {
  id: string;
  label: string;
  blocked: boolean;
}

interface DetectionSummary {
  result: DetectResult;
  signals: DetectionSignal[];
  injectedSlots: number;
  filledSlots: number;
}

const STORAGE_KEY = "streamfusion.adblock.locked";
const CLEAR_PASSES_REQUIRED = 2;
const BLOCK_CONFIRMATION_DELAY = 1200;
const SLOT_RENDER_GRACE_MS = 1500;
const CHECK_INTERVAL_BLOCKED = 4000;
const CHECK_INTERVAL_IDLE = 15000;

const COSMETIC_BAITS = [
  "adsbox ad ads adsbygoogle ad-banner ad-placement ad-unit textads",
  "ad-container advertisement gpt-ad doubleclick google-ad banner-ad",
  "sponsor sponsored ad-label ad-area adsense pub_300x250",
] as const;

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const readStoredLock = () => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

const writeStoredLock = (value: boolean) => {
  if (typeof window === "undefined") return;
  try {
    if (value) {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore storage failures
  }
};

const isElementHidden = (element: HTMLElement) => {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  return (
    style.display === "none" ||
    style.visibility === "hidden" ||
    Number(style.opacity) === 0 ||
    rect.height === 0 ||
    rect.width === 0
  );
};

/**
 * ¿El slot tiene contenido publicitario REAL renderizado?
 * Buscamos descendientes que indiquen que el ad code se ejecutó:
 *  - iframe (Google Ads, AdSense, etc.)
 *  - img con tamaño
 *  - ins de adsbygoogle con `data-ad-status="filled"`
 *  - object/embed/video
 *  - cualquier elemento con dimensiones visibles que contenga texto
 */
const slotIsFilled = (slot: HTMLElement): boolean => {
  if (isElementHidden(slot)) return false;

  // adsbygoogle marca explícitamente cuando un anuncio se rellenó.
  const adsbygoogle = slot.querySelector<HTMLElement>("ins.adsbygoogle");
  if (adsbygoogle?.getAttribute("data-ad-status") === "filled") return true;
  if (adsbygoogle?.getAttribute("data-ad-status") === "unfilled") return false;

  const visualNodes = slot.querySelectorAll<HTMLElement>("iframe, img, object, embed, video, ins");
  for (const node of Array.from(visualNodes)) {
    const rect = node.getBoundingClientRect();
    if (rect.width >= 30 && rect.height >= 30 && !isElementHidden(node)) {
      return true;
    }
  }

  // Fallback: si el slot mismo creció en altura, asumimos que algo se renderizó.
  const slotRect = slot.getBoundingClientRect();
  return slotRect.height >= 40 && slotRect.width >= 40;
};

const detectCosmeticBait = async (): Promise<DetectionSignal> => {
  const nodes = COSMETIC_BAITS.map((className, idx) => {
    const bait = document.createElement("div");
    bait.id = `sf-cosmetic-bait-${idx}`;
    bait.className = className;
    bait.setAttribute("aria-hidden", "true");
    bait.style.cssText =
      "position:absolute;left:-10000px;top:-10000px;width:300px;height:250px;min-width:300px;min-height:250px;pointer-events:none;";
    bait.innerHTML = "&nbsp;";
    document.body.appendChild(bait);
    return bait;
  });

  await wait(600);

  const hiddenCount = nodes.filter(
    (node) => !document.body.contains(node) || isElementHidden(node),
  ).length;
  nodes.forEach((node) => node.remove());

  return {
    id: "cosmetic-bait",
    label: "Filtro cosmético sobre clases publicitarias",
    blocked: hiddenCount >= 2,
  };
};

const detectAdblock = async (): Promise<DetectionSummary> => {
  // 1. Esperar un poco a que los AdBanner monten y la red de anuncios responda.
  await wait(SLOT_RENDER_GRACE_MS);

  // 2. Encontrar slots reales que el admin haya configurado e inyectado.
  const injectedSlots = Array.from(
    document.querySelectorAll<HTMLElement>('[data-ad-injected="true"]'),
  );

  if (injectedSlots.length === 0) {
    return {
      result: "no-slots",
      signals: [],
      injectedSlots: 0,
      filledSlots: 0,
    };
  }

  // 3. Medir cuántos slots terminaron con contenido real.
  const filledCount = injectedSlots.filter((slot) => slotIsFilled(slot)).length;
  const allEmpty = filledCount === 0;

  const slotSignal: DetectionSignal = {
    id: "real-slots-empty",
    label: `Anuncios reales sin renderizar (${filledCount}/${injectedSlots.length})`,
    blocked: allEmpty,
  };

  // 4. Refuerzo cosmético — solo si los slots reales también están vacíos.
  let cosmeticSignal: DetectionSignal | null = null;
  if (allEmpty) {
    cosmeticSignal = await detectCosmeticBait();
  }

  const signals = cosmeticSignal ? [slotSignal, cosmeticSignal] : [slotSignal];

  // 5. Solo bloqueamos si TODOS los slots inyectados están vacíos.
  //    El bait cosmético sirve para etiquetar la causa, no como condición extra.
  return {
    result: allEmpty ? "blocked" : "ok",
    signals,
    injectedSlots: injectedSlots.length,
    filledSlots: filledCount,
  };
};

const AntiAdblock = () => {
  const { data: config, isLoading } = useWebConfig();
  const ads = config?.ads as { antiAdblock?: boolean } | undefined;
  const enabled = !!ads?.antiAdblock;

  const [blocked, setBlocked] = useState<boolean>(() => readStoredLock());
  const [checking, setChecking] = useState(false);
  const [activeSignals, setActiveSignals] = useState<string[]>([]);
  const prevOverflowRef = useRef({ html: "", body: "" });
  const runningRef = useRef(false);
  const blockedRef = useRef(readStoredLock());
  const clearPassesRef = useRef(0);

  const syncBlockedState = useCallback((next: boolean) => {
    blockedRef.current = next;
    setBlocked(next);
    writeStoredLock(next);
  }, []);

  const runCheck = useCallback(async () => {
    if (!enabled || runningRef.current) return;

    runningRef.current = true;
    setChecking(true);

    try {
      let summary = await detectAdblock();

      // Sin slots configurados → liberamos siempre (no podemos saber).
      if (summary.result === "no-slots") {
        clearPassesRef.current = 0;
        setActiveSignals([]);
        syncBlockedState(false);
        return;
      }

      // Doble confirmación si dio bloqueado, para descartar latencia de red.
      if (summary.result === "blocked") {
        await wait(BLOCK_CONFIRMATION_DELAY);
        const confirmed = await detectAdblock();
        if (confirmed.result !== "blocked") {
          summary = confirmed;
        } else {
          summary = confirmed;
        }
      }

      const detectedSignals = summary.signals
        .filter((signal) => signal.blocked)
        .map((signal) => signal.label);
      setActiveSignals(detectedSignals);

      if (summary.result === "blocked") {
        clearPassesRef.current = 0;
        syncBlockedState(true);
        return;
      }

      // Si veníamos bloqueados, exigimos varios passes limpios antes de liberar.
      if (blockedRef.current) {
        clearPassesRef.current += 1;
        if (clearPassesRef.current < CLEAR_PASSES_REQUIRED) {
          return;
        }
      }

      clearPassesRef.current = 0;
      syncBlockedState(false);
    } finally {
      setChecking(false);
      runningRef.current = false;
    }
  }, [enabled, syncBlockedState]);

  useEffect(() => {
    if (isLoading) return;

    if (!enabled) {
      clearPassesRef.current = 0;
      setActiveSignals([]);
      syncBlockedState(false);
      return;
    }

    void runCheck();

    const recheck = () => {
      void runCheck();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void runCheck();
      }
    };
    const interval = window.setInterval(recheck, blocked ? CHECK_INTERVAL_BLOCKED : CHECK_INTERVAL_IDLE);

    window.addEventListener("focus", recheck);
    window.addEventListener("pageshow", recheck);
    window.addEventListener("online", recheck);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", recheck);
      window.removeEventListener("pageshow", recheck);
      window.removeEventListener("online", recheck);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [blocked, enabled, isLoading, runCheck, syncBlockedState]);

  useEffect(() => {
    if (blocked) {
      prevOverflowRef.current = {
        html: document.documentElement.style.overflow,
        body: document.body.style.overflow,
      };
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = prevOverflowRef.current.html || "";
      document.body.style.overflow = prevOverflowRef.current.body || "";
    }

    return () => {
      document.documentElement.style.overflow = prevOverflowRef.current.html || "";
      document.body.style.overflow = prevOverflowRef.current.body || "";
    };
  }, [blocked]);

  if (!enabled && !isLoading) return null;

  return (
    <AnimatePresence>
      {blocked && (
        <motion.div
          key="adblock-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="adblock-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[2147483647] overflow-y-auto"
          style={{
            background:
              "linear-gradient(180deg, hsl(var(--background) / 0.78) 0%, hsl(var(--background) / 0.92) 48%, hsl(var(--background) / 0.98) 100%)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
          }}
        >
          <div className="relative min-h-screen overflow-hidden">
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, hsl(var(--foreground) / 0.05) 1px, transparent 1px), linear-gradient(180deg, hsl(var(--foreground) / 0.05) 1px, transparent 1px)",
                backgroundSize: "48px 48px",
              }}
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/72 to-background/40" aria-hidden="true" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/55 to-transparent" aria-hidden="true" />
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
              <div className="absolute -left-12 top-[16%] h-56 w-56 rounded-full bg-primary/18 blur-3xl" />
              <div className="absolute right-[-5%] top-[10%] h-72 w-72 rounded-full bg-primary/12 blur-3xl" />
              <div className="absolute bottom-[8%] left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
            </div>

            <div className="relative z-10 flex min-h-screen items-end px-4 pt-24 pb-10 md:px-12 md:pt-28 md:pb-14">
              <motion.div
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 18 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-3xl"
              >
                <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/12 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary shadow-[0_0_30px_hsl(var(--primary)/0.12)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Acceso bloqueado
                </div>

                <div className="max-w-2xl">
                  <div className="mb-4 flex items-center gap-3 text-sm font-semibold text-foreground/85">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-primary/25 bg-card/75 backdrop-blur-md shadow-[0_0_30px_hsl(var(--primary)/0.14)]">
                      <ShieldAlert className="h-6 w-6 text-primary" strokeWidth={2.2} />
                    </div>
                    <span className="rounded-md border border-border/80 bg-card/60 px-3 py-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Protección de reproducción
                    </span>
                  </div>

                  <h2
                    id="adblock-title"
                    className="max-w-xl text-4xl font-extrabold leading-[1.02] text-foreground text-shadow md:text-6xl"
                  >
                    Desactiva el bloqueador para continuar viendo contenido.
                  </h2>

                  <p className="mt-4 max-w-xl text-sm leading-7 text-foreground/72 md:text-base">
                    Detectamos que los anuncios de esta página no se están mostrando. Para mantener el acceso libre y estable,
                    este dominio debe cargarse sin Brave Shields, uBlock Origin, Ghostery, AdBlock, AdGuard ni filtros similares.
                  </p>
                </div>

                <div className="mt-8 grid gap-3 md:grid-cols-3">
                  {[
                    {
                      icon: MonitorPlay,
                      title: "Desactiva el escudo",
                      text: "Apaga la protección del navegador o la extensión solo para este dominio.",
                    },
                    {
                      icon: ScanSearch,
                      title: "Recarga si aplica",
                      text: "Algunas extensiones liberan scripts y iframes solo después de refrescar la página.",
                    },
                    {
                      icon: RefreshCw,
                      title: "Verifica de nuevo",
                      text: "El acceso vuelve automáticamente cuando los anuncios cargan correctamente.",
                    },
                  ].map(({ icon: Icon, title, text }, idx) => (
                    <motion.div
                      key={title}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.12 + idx * 0.08 }}
                      className="border border-border/80 bg-card/70 p-4 backdrop-blur-md shadow-[0_10px_30px_hsl(0_0%_0%_/_0.28)]"
                    >
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary/12 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-bold text-foreground">{title}</p>
                      <p className="mt-2 text-xs leading-6 text-muted-foreground">{text}</p>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center">
                  <button
                    type="button"
                    onClick={() => void runCheck()}
                    disabled={checking}
                    className="group relative inline-flex min-h-13 items-center justify-center gap-2 overflow-hidden rounded-lg bg-primary px-6 py-3.5 text-sm font-extrabold text-primary-foreground shadow-[0_0_40px_hsl(var(--primary)/0.28)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_56px_hsl(var(--primary)/0.34)] active:scale-[0.98] disabled:cursor-wait disabled:opacity-75 disabled:hover:scale-100"
                  >
                    <span
                      className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                      aria-hidden="true"
                    />
                    {checking ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Verificando entorno...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 transition-transform duration-500 group-hover:rotate-180" />
                        He desactivado el bloqueador
                      </>
                    )}
                  </button>

                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground md:max-w-xs">
                    <Film className="h-3.5 w-3.5 text-primary" />
                    El modal se cierra cuando los anuncios cargan correctamente.
                  </p>
                </div>

                {activeSignals.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 max-w-2xl border border-primary/20 bg-card/72 p-4 backdrop-blur-md"
                  >
                    <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">
                      Señales detectadas ahora mismo
                    </p>
                    <ul className="grid gap-2 md:grid-cols-2">
                      {activeSignals.map((signal) => (
                        <li
                          key={signal}
                          className="flex items-start gap-2 border border-border/70 bg-background/35 px-3 py-2 text-xs leading-6 text-foreground/76"
                        >
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          {signal}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AntiAdblock;
