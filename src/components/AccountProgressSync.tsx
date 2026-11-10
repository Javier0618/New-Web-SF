import { useEffect } from "react";
import { doc, getDoc, onSnapshot, runTransaction } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useContent } from "@/hooks/useContent";
import {
  applyRemoteWatch,
  applyRemoteRemoval,
  getWatchEntry,
  setWatchScope,
} from "@/lib/watchHistory";
import {
  mergeAccountProgress,
  setAccountProgressReady,
  type ProgressEvent,
  type SharedProgress,
} from "@/lib/accountProgress";
import type { Content } from "@/types/content";

export default function AccountProgressSync() {
  const { user, loading } = useAuth();
  const { content } = useContent();
  useEffect(() => {
    if (loading) return;
    setWatchScope(user?.uid || null);
    if (!user || !db) {
      setAccountProgressReady(true);
      return;
    }
    setAccountProgressReady(false);
    if (!content.length) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let flushing = false;
    const pending = new Map<string, ProgressEvent>();
    const removed: Record<string, number> = {};
    const known = new Map(content.map((c) => [String(c.id), c]));
    const inFlight = new Set<string>();
    const ref = doc(db, "users", user.uid);
    const readyTimer = setTimeout(() => {
      if (!cancelled) setAccountProgressReady(true);
    }, 10_000);
    const flush = async () => {
      if (auth.currentUser?.uid !== user.uid) return;
      if (flushing || (!pending.size && !Object.keys(removed).length)) return;
      flushing = true;
      clearTimeout(timer);
      timer = undefined;
      const changes = [...pending.values()];
      const removals = { ...removed };
      try {
        await runTransaction(db, async (tx) => {
          const snapshot = await tx.get(ref);
          if (!snapshot.exists()) return;
          tx.update(ref, {
            sync: mergeAccountProgress(snapshot.data().sync || {}, changes, removals),
          });
        });
        for (const change of changes)
          if (pending.get(change.id)?.progress.ts === change.progress.ts) pending.delete(change.id);
        for (const [id, ts] of Object.entries(removals)) if (removed[id] === ts) delete removed[id];
      } catch (e) {
        console.warn("[progress] Se conserva el progreso local; no se pudo sincronizar", e);
      } finally {
        flushing = false;
        if (!cancelled && (pending.size || Object.keys(removed).length))
          timer = setTimeout(flush, 60_000);
      }
    };
    const schedule = () => {
      if (!timer) timer = setTimeout(flush, 60_000);
    };
    const local = (event: Event) => {
      const change = (event as CustomEvent<ProgressEvent>).detail;
      pending.set(change.id, change);
      schedule();
    };
    const remove = (event: Event) => {
      const c = content.find((c) => c.docId === (event as CustomEvent<string>).detail);
      if (c) {
        removed[String(c.id)] = Date.now();
        pending.delete(String(c.id));
        schedule();
      }
    };
    const hidden = () => {
      if (document.hidden) void flush();
    };
    const unsub = onSnapshot(
      ref,
      (snapshot) => {
        const state = snapshot.data()?.sync || {};
        for (const [id, ts] of Object.entries(state.removed || {})) {
          const c = known.get(id);
          if (c?.docId) applyRemoteRemoval(c.docId, Number(ts));
        }
        const entries = Object.entries(state.progress || {})
          .sort((a, b) => Number((b[1] as SharedProgress).ts) - Number((a[1] as SharedProgress).ts))
          .slice(0, 20);
        const pulls: Promise<unknown>[] = [];
        for (const [id, raw] of entries) {
          const p = raw as SharedProgress;
          const c = known.get(id);
          if (
            !c?.docId ||
            !Number.isFinite(p.ts) ||
            !Number.isFinite(p.t) ||
            !Number.isFinite(p.d) ||
            p.ts <= Number(state.removed?.[id] || 0) ||
            (getWatchEntry(c.docId)?.t || 0) >= p.ts ||
            inFlight.has(id)
          )
            continue;
          inFlight.add(id);
          pulls.push(
            getDoc(doc(db, "content", c.docId))
              .then((detail) => {
                if (cancelled || !detail.exists()) return;
                const full = detail.data() as Content;
                const season = Object.values(full.seasons || {}).find(
                  (s) => Number(s.season_number) === Number(p.s),
                );
                const episode = Object.values(season?.episodes || {}).find(
                  (e) => Number(e.episode_number) === Number(p.e),
                );
                const url = c.media_type === "movie" ? full.video_url : episode?.video_url;
                if (url)
                  applyRemoteWatch(
                    {
                      docId: c.docId!,
                      url,
                      t: p.ts,
                      ...(p.s != null && p.e != null ? { label: `T${p.s} · E${p.e}` } : {}),
                    },
                    p.t,
                    p.d,
                  );
              })
              .catch((e) => console.warn("[progress] No se pudo recuperar un título", e))
              .finally(() => inFlight.delete(id)),
          );
        }
        void Promise.allSettled(pulls).then(() => {
          if (!cancelled) {
            clearTimeout(readyTimer);
            setAccountProgressReady(true);
          }
        });
      },
      (e) => {
        console.warn("[progress] Se usa el historial local", e);
        clearTimeout(readyTimer);
        if (!cancelled) setAccountProgressReady(true);
      },
    );
    window.addEventListener("sf-account-progress", local);
    window.addEventListener("sf-history-remove", remove);
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", flush);
    return () => {
      cancelled = true;
      unsub();
      clearTimeout(readyTimer);
      clearTimeout(timer);
      window.removeEventListener("sf-account-progress", local);
      window.removeEventListener("sf-history-remove", remove);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", flush);
      void flush();
    };
  }, [user?.uid, loading, content]);
  return null;
}
