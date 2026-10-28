import { useEffect, useRef, type RefObject } from "react";
import type { EpisodeMarks } from "@/lib/introMarks";

/**
 * Habla con el puente que Nginx inyecta en el reproductor de unlimplayer.top
 * (unlimplayer-app-bridge.js), con el mismo protocolo que usan las apps:
 *
 *   recibe {sf:"player", event:"ready"|"timeupdate"|"ended"|"next", currentTime, duration}
 *   envía  {sf:"config", hasNext, showBeforeEnd, countdown, autoSkipIntro, introStart, introEnd, creditsStart}
 *          {sf:"seek", time}
 *
 * Nunca se envía `tvMode`: en ese modo el puente captura las teclas del control
 * remoto para que las gestione la app de TV, y la web no lo hace.
 * Si el embed no tiene puente (otro proveedor), simplemente no llega nada.
 */

// Mismos valores que las apps móvil y TV
const SHOW_BEFORE_END = 50;
const COUNTDOWN = 10;
const AUTO_SKIP_INTRO = false;
/** El puente trata como anuncio cualquier video más corto que esto. */
const MIN_EPISODE_SECONDS = 90;

export interface PlayerBridgeOptions {
  hasNext: boolean;
  marks?: EpisodeMarks | null;
  /** Segundo desde el que reanudar (se aplica una vez, ya en el episodio y no en el anuncio). */
  resumeAt?: number | null;
  onProgress?: (position: number, duration: number) => void;
  onNext?: () => void;
  onEnded?: () => void;
}

interface PlayerMessage {
  sf: "player";
  event: string;
  currentTime?: number;
  duration?: number;
}

export const usePlayerBridge = (
  iframeRef: RefObject<HTMLIFrameElement | null>,
  url: string,
  options: PlayerBridgeOptions | undefined,
) => {
  const opts = useRef(options);
  opts.current = options;

  const state = useRef({ ready: false, seeked: false, advanced: false });

  const post = (msg: Record<string, unknown>) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(msg, new URL(url).origin);
    } catch {
      /* URL inválida o ventana cerrada */
    }
  };

  const sendConfig = () => {
    const o = opts.current;
    if (!o) return;
    post({
      sf: "config",
      hasNext: o.hasNext,
      showBeforeEnd: SHOW_BEFORE_END,
      countdown: COUNTDOWN,
      autoSkipIntro: AUTO_SKIP_INTRO,
      introStart: o.marks?.introStart ?? null,
      introEnd: o.marks?.introEnd ?? null,
      creditsStart: o.marks?.creditsStart ?? null,
    });
  };

  // Nuevo video: reiniciar el estado
  useEffect(() => {
    state.current = { ready: false, seeked: false, advanced: false };
  }, [url]);

  useEffect(() => {
    if (!options) return;
    const onMessage = (e: MessageEvent) => {
      if (!iframeRef.current || e.source !== iframeRef.current.contentWindow) return;
      const d = e.data as PlayerMessage;
      if (!d || typeof d !== "object" || d.sf !== "player") return;
      const o = opts.current;
      if (!o) return;
      const duration = Number(d.duration) || 0;
      const position = Number(d.currentTime) || 0;
      const isEpisode = duration >= MIN_EPISODE_SECONDS;

      const trySeek = () => {
        const s = state.current;
        if (s.seeked || !isEpisode || !o.resumeAt) return;
        s.seeked = true;
        if (o.resumeAt < duration - 5) post({ sf: "seek", time: o.resumeAt });
      };

      switch (d.event) {
        case "ready":
          state.current.ready = true;
          sendConfig();
          trySeek();
          break;
        case "timeupdate":
          trySeek();
          if (isEpisode) o.onProgress?.(position, duration);
          break;
        case "next":
          if (!state.current.advanced) {
            state.current.advanced = true;
            o.onNext?.();
          }
          break;
        case "ended":
          if (isEpisode) o.onProgress?.(duration, duration);
          o.onEnded?.();
          // Si el usuario eligió "Ver créditos", al terminar pasamos igualmente al siguiente
          if (o.hasNext && !state.current.advanced) {
            state.current.advanced = true;
            o.onNext?.();
          }
          break;
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!options, url]);

  // Si las marcas o "hay siguiente" llegan después de que el puente esté listo, reenviar
  const marksKey = JSON.stringify([options?.hasNext, options?.marks]);
  useEffect(() => {
    if (state.current.ready) sendConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marksKey]);
};
