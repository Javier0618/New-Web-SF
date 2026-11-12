import { useEffect, useRef, useState } from "react";
import { ExternalLink, AlertTriangle, RotateCw } from "lucide-react";
import { usePlayerBridge, type PlayerBridgeOptions } from "@/hooks/usePlayerBridge";

interface VideoPlayerProps {
  url: string;
  title?: string;
  /** Progreso, reanudar, saltar intro y siguiente episodio (ver usePlayerBridge). */
  bridge?: PlayerBridgeOptions;
}

const VideoPlayer = ({ url, title, bridge }: VideoPlayerProps) => {
  const isIframe = !/\.(mp4|webm|ogg|ogv|m4v|mov|m3u8)(?:[?#]|$)/i.test(url);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [iframeFailed, setIframeFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const retry = () => { resumed.current = false; setIframeFailed(false); setAttempt((n) => n + 1); };

  usePlayerBridge(iframeRef, url, isIframe ? bridge : undefined);

  // Detecta si el iframe no carga en un tiempo razonable (típico en Smart TVs
  // donde el proveedor bloquea el user-agent o el CSP). Sólo aplica al modo iframe.
  useEffect(() => {
    if (!isIframe) return;
    setIframeFailed(false);
    const timer = window.setTimeout(() => {
      try {
        const el = iframeRef.current;
        if (!el) return;
        // Si el iframe no despachó `load`, marcamos como fallido.
        // (No podemos leer contentDocument por CORS, así que confiamos en el timer.)
        if (!el.dataset.loaded) {
          setIframeFailed(true);
        }
      } catch {
        setIframeFailed(true);
      }
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [url, isIframe, attempt]);

  // <video> nativo: mismo comportamiento que el puente, sin necesidad de él
  const lastSaved = useRef(0);
  const lastPosition = useRef(0);
  const resumed = useRef(false);
  useEffect(() => {
    resumed.current = false;
    lastSaved.current = 0;
    lastPosition.current = 0;
    setIframeFailed(false);
  }, [url]);

  const recovery = <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/95 text-center p-4">
    <AlertTriangle className="w-7 h-7 text-primary" />
    <p className="text-sm font-medium">No pudimos cargar este video.</p>
    <p className="text-xs text-muted-foreground max-w-sm">Puedes reintentar conservando tu progreso o abrir el reproductor por separado.</p>
    <div className="flex flex-wrap justify-center gap-2"><button onClick={retry} className="sf-button-primary"><RotateCw size={14} /> Reintentar</button><a href={url} target="_blank" rel="noopener noreferrer" className="sf-button-secondary"><ExternalLink size={14} /> Abrir reproductor</a></div>
  </div>;

  const externalButton = (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
    >
      <ExternalLink className="w-4 h-4" />
      Abrir en navegador externo
    </a>
  );

  const frameCls =
    "sf-video-frame relative w-full aspect-video bg-black rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]";

  if (isIframe) {
    return (
      <div className={frameCls}>
        <iframe
          key={`${url}:${attempt}`}
          ref={iframeRef}
          src={url}
          title={title || "Video Player"}
          className="w-full h-full"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          onLoad={(e) => {
            (e.currentTarget as HTMLIFrameElement).dataset.loaded = "1";
            setIframeFailed(false);
          }}
          onError={() => setIframeFailed(true)}
        />
        {iframeFailed && recovery}
      </div>
    );
  }

  return (
    <div className={frameCls}>
      <video
        key={`${url}:${attempt}`}
        ref={videoRef}
        src={url}
        controls
        playsInline
        preload="metadata"
        className="w-full h-full"
        title={title}
        autoPlay
        onError={() => setIframeFailed(true)}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          const position = lastPosition.current || bridge?.resumeAt;
          if (!resumed.current && position && position < v.duration - 5) {
            v.currentTime = position;
          }
          resumed.current = true;
        }}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          lastPosition.current = v.currentTime;
          const now = Date.now();
          if (now - lastSaved.current < 5000 || !Number.isFinite(v.duration)) return;
          lastSaved.current = now;
          bridge?.onProgress?.(v.currentTime, v.duration);
        }}
        onEnded={(e) => {
          const v = e.currentTarget;
          bridge?.onProgress?.(v.duration, v.duration);
          bridge?.onEnded?.();
          if (bridge?.hasNext) bridge.onNext?.();
        }}
      >
        Tu navegador no soporta el reproductor de video.
      </video>
      {iframeFailed && recovery}
    </div>
  );
};

export default VideoPlayer;
