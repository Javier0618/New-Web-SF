import type { Content } from "@/types/content";
import { useSyncExternalStore } from "react";

let ready = false;
export function setAccountProgressReady(value: boolean) {
  ready = value;
  window.dispatchEvent(new Event("sf-account-ready"));
}
export function useAccountProgressReady() {
  return useSyncExternalStore(
    (update) => {
      window.addEventListener("sf-account-ready", update);
      return () => window.removeEventListener("sf-account-ready", update);
    },
    () => ready,
    () => false,
  );
}

export interface SharedProgress {
  s: number | null;
  e: number | null;
  t: number;
  d: number;
  ts: number;
}
export interface ProgressEvent {
  id: string;
  item: Pick<Content, "id" | "title" | "media_type" | "poster_path">;
  progress: SharedProgress;
}

export function queueAccountProgress(
  content: Content,
  season: number | undefined,
  episode: number | undefined,
  time: number,
  duration: number,
) {
  if (!Number.isFinite(time) || !Number.isFinite(duration) || duration < 90) return;
  const detail: ProgressEvent = {
    id: String(content.id),
    item: {
      id: content.id,
      title: content.title,
      media_type: content.media_type,
      poster_path: content.poster_path,
    },
    progress: {
      s: season ?? null,
      e: episode ?? null,
      t: Math.max(0, time),
      d: duration,
      ts: Date.now(),
    },
  };
  window.dispatchEvent(new CustomEvent("sf-account-progress", { detail }));
}

/** Merge against the transaction's current state; preserve mobile/TV fields. */
export function mergeAccountProgress(
  remote: Record<string, unknown>,
  pending: ProgressEvent[],
  removed: Record<string, number>,
) {
  const progress = { ...((remote.progress as Record<string, SharedProgress>) || {}) };
  const tombstones = { ...((remote.removed as Record<string, number>) || {}) };
  const watched = { ...((remote.watched as Record<string, string[]>) || {}) };
  const cw = new Map(
    ((remote.cw || []) as Array<Record<string, unknown>>).map((c) => [String(c.id), c]),
  );
  for (const [id, ts] of Object.entries(removed)) {
    if (ts <= (tombstones[id] || 0)) continue;
    tombstones[id] = ts;
    if ((progress[id]?.ts || 0) <= ts) delete progress[id];
    if (Number(cw.get(id)?.timestamp || 0) <= ts) cw.delete(id);
  }
  for (const change of pending) {
    const { id, item, progress: p } = change;
    if (p.ts <= (tombstones[id] || 0) || p.ts < (progress[id]?.ts || 0)) continue;
    progress[id] = p;
    cw.set(id, { ...cw.get(id), ...item, timestamp: p.ts });
    if (p.s != null && p.e != null && p.d > 0 && (p.t / p.d > 0.95 || p.d - p.t < 90))
      watched[id] = [...new Set([...(watched[id] || []), `${p.s}-${p.e}`])];
  }
  const kept = Object.entries(progress)
    .sort((a, b) => b[1].ts - a[1].ts)
    .slice(0, 100);
  return {
    ...remote,
    progress: Object.fromEntries(kept),
    watched,
    removed: Object.fromEntries(
      Object.entries(tombstones).filter(([, ts]) => Date.now() - ts < 60 * 86_400_000),
    ),
    cw: [...cw.values()].sort((a, b) => Number(b.timestamp) - Number(a.timestamp)).slice(0, 20),
    at: Date.now(),
  };
}
