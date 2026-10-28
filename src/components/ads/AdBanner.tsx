import { useEffect, useRef } from "react";
import { useWebConfig } from "@/hooks/useWebConfig";

export type AdSlot =
  | "home_top"
  | "home_middle"
  | "home_bottom"
  | "movies_top"
  | "movies_bottom"
  | "series_top"
  | "series_bottom"
  | "animes_top"
  | "animes_bottom"
  | "doramas_top"
  | "doramas_bottom"
  | "content_top"
  | "content_middle"
  | "content_bottom";

interface AdBannerProps {
  slot: AdSlot;
  className?: string;
}

const AdBanner = ({ slot, className = "" }: AdBannerProps) => {
  const { data: config } = useWebConfig();
  const containerRef = useRef<HTMLDivElement>(null);
  const injectedRef = useRef(false);

  const adsConfig = config?.ads;
  const slotConfig = adsConfig?.slots?.[slot];

  const isActive = adsConfig?.enabled && slotConfig?.enabled && slotConfig?.code;

  useEffect(() => {
    if (!isActive || !containerRef.current || injectedRef.current) return;
    injectedRef.current = true;

    const container = containerRef.current;
    // Clear previous content
    container.innerHTML = "";

    // Parse and inject ad code (supports script tags)
    const temp = document.createElement("div");
    temp.innerHTML = slotConfig.code;

    // Move nodes and execute scripts
    Array.from(temp.childNodes).forEach((node) => {
      if (node.nodeName === "SCRIPT") {
        const script = document.createElement("script");
        const origScript = node as HTMLScriptElement;
        // Copy attributes
        Array.from(origScript.attributes).forEach((attr) => {
          script.setAttribute(attr.name, attr.value);
        });
        script.textContent = origScript.textContent;
        container.appendChild(script);
      } else {
        container.appendChild(node.cloneNode(true));
      }
    });

    // Marca que el código del anuncio fue inyectado correctamente.
    // El detector AntiAdblock usa este atributo para saber qué slots
    // DEBERÍAN estar mostrando publicidad.
    container.setAttribute("data-ad-injected", "true");

    return () => {
      injectedRef.current = false;
    };
  }, [isActive, slotConfig?.code]);

  if (!isActive) return null;

  return (
    <div
      ref={containerRef}
      id={`ad-slot-${slot}`}
      className={`ad-slot ad-container advertisement adsbox banner-ad w-full flex items-center justify-center overflow-hidden ${className}`}
      data-ad-slot={slot}
      data-ad-slot-active="true"
      aria-label={`Espacio publicitario ${slot}`}
    />
  );
};

export default AdBanner;
