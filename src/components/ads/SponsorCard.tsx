import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Sparkles, X } from "lucide-react";
import { useWebConfig } from "@/hooks/useWebConfig";
import { readAdDismissal, rememberAdDismissal, safeSponsorUrl, sponsorConfig } from "@/lib/sponsor";
import { trackExperience } from "@/lib/experienceAnalytics";

const dismissalKey = "sf:sponsor-card:dismissed:v1";
export default function SponsorCard() {
  const { data, isPending, isError } = useWebConfig();
  const config = sponsorConfig(data?.sponsor);
  const url = safeSponsorUrl(config.url);
  const [dismissed, setDismissed] = useState(() => readAdDismissal(dismissalKey));
  const cardRef = useRef<HTMLElement>(null);
  const impression = useRef(false);
  const active = !isPending && !isError && !!data && config.enabled && !!url && !dismissed;
  useEffect(() => {
    if (!active || !cardRef.current || impression.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !impression.current) {
          impression.current = true;
          trackExperience("sponsor_impression", { placement: "home_middle" });
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [active]);
  if (!active || !url) return null;
  const close = () => {
    rememberAdDismissal(dismissalKey);
    setDismissed(true);
    trackExperience("sponsor_dismiss", { placement: "home_middle" });
  };
  return (
    <aside ref={cardRef} className="sf-sponsor-card" aria-label="Publicidad opcional">
      <div className="sf-sponsor-copy">
        <span className="sf-sponsor-label">
          <Sparkles size={13} aria-hidden="true" /> PUBLICIDAD OPCIONAL
          {config.provider.trim() ? ` · ${config.provider.trim()}` : ""}
        </span>
        <h2>Descubre algo de nuestros patrocinadores</h2>
        <p>Explora una oferta externa si te interesa. Tú decides.</p>
      </div>
      <div className="sf-sponsor-actions">
        <a
          href={url}
          target="_blank"
          rel="sponsored noopener"
          referrerPolicy="strict-origin-when-cross-origin"
          className="sf-button-secondary"
          onClick={() => trackExperience("sponsor_click", { placement: "home_middle" })}
        >
          Explorar oferta patrocinada <ArrowUpRight size={16} aria-hidden="true" />
          <span className="sr-only"> (abre en otra pestaña)</span>
        </a>
        <button type="button" onClick={close} className="sf-sponsor-later">
          Ahora no
        </button>
      </div>
      <button
        type="button"
        className="sf-sponsor-close"
        onClick={close}
        aria-label="Cerrar tarjeta patrocinada durante esta visita"
      >
        <X size={17} />
      </button>
    </aside>
  );
}
