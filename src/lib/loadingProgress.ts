/**
 * Progreso de carga global (0-100 %) para la pantalla de carga.
 *
 * No conocemos el progreso real de Firestore/TMDB: mientras haya algo cargando
 * la barra avanza cada vez más despacio hacia el 92 %, y cuando todo termina
 * salta al 100 % y se desvanece. Las cargas seguidas (página → datos) comparten
 * la misma barra, así no vuelve a 0 ni parpadea entre una y otra.
 */
import { useEffect, useSyncExternalStore } from "react";

export interface LoadingSnapshot {
  progress: number;
  visible: boolean;
}

let active = 0;
let snapshot: LoadingSnapshot = { progress: 0, visible: false };
let tick: number | undefined;
let finishTimer: number | undefined;
let hideTimer: number | undefined;
const listeners = new Set<() => void>();

const set = (next: Partial<LoadingSnapshot>) => {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((l) => l());
};

const finish = () => {
  window.clearInterval(tick);
  tick = undefined;
  set({ progress: 100 });
  hideTimer = window.setTimeout(() => set({ visible: false, progress: 0 }), 400);
};

export const startLoading = () => {
  active++;
  window.clearTimeout(finishTimer);
  window.clearTimeout(hideTimer);
  if (!snapshot.visible || snapshot.progress >= 100) set({ visible: true, progress: 0 });
  if (tick === undefined) {
    tick = window.setInterval(() => {
      set({ progress: Math.min(92, snapshot.progress + (92 - snapshot.progress) * 0.08 + 0.4) });
    }, 120);
  }
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    active--;
    // Pequeña espera: si enseguida empieza otra carga, la barra continúa
    if (active === 0) finishTimer = window.setTimeout(finish, 150);
  };
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useLoadingProgress = () => useSyncExternalStore(subscribe, () => snapshot);

/** Mantiene la pantalla de carga visible mientras `loading` sea true. */
export const useLoadingScreen = (loading = true) => {
  useEffect(() => (loading ? startLoading() : undefined), [loading]);
};
