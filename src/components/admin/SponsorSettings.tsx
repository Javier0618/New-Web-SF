import { sponsorConfig, safeSponsorUrl, type SponsorConfig } from "@/lib/sponsor";

export default function SponsorSettings({
  value,
  onChange,
}: {
  value?: Partial<SponsorConfig>;
  onChange: (value: SponsorConfig) => void;
}) {
  const config = sponsorConfig(value);
  const inputClass = "w-full px-3 py-2 bg-secondary rounded-md border border-border text-sm";
  const invalid = config.url.trim() !== "" && !safeSponsorUrl(config.url);
  return (
    <section className="border border-border rounded-xl p-4 mb-6 space-y-4">
      <div>
        <h4 className="font-semibold">Enlace patrocinado opcional</h4>
        <p className="text-xs text-muted-foreground mt-1">
          Una tarjeta entre las secciones de Inicio. Solo abre la oferta al pulsar su botón; se
          puede cerrar durante la visita. Funciona independientemente de los banners globales.
        </p>
      </div>
      <label className="flex gap-2 items-center text-sm">
        <input
          type="checkbox"
          checked={config.enabled}
          onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
        />
        Mostrar tarjeta patrocinada
      </label>
      <label className="block text-sm space-y-2">
        <span>Proveedor del enlace</span>
        <input
          className={inputClass}
          value={config.provider}
          maxLength={60}
          onChange={(e) => onChange({ ...config, provider: e.target.value })}
          placeholder="Adsterra, Monetag u otro proveedor"
        />
      </label>
      <label className="block text-sm space-y-2">
        <span>URL del enlace patrocinado</span>
        <input
          className={inputClass}
          type="url"
          inputMode="url"
          value={config.url}
          aria-invalid={invalid || undefined}
          aria-describedby="sponsor-url-help"
          onChange={(e) => onChange({ ...config, url: e.target.value })}
          placeholder="https://..."
        />
      </label>
      <p
        id="sponsor-url-help"
        className={`text-xs ${invalid ? "text-destructive" : "text-muted-foreground"}`}
      >
        {invalid
          ? "Introduce una URL HTTPS válida, sin usuario ni contraseña."
          : "Puedes cambiar de enlace o proveedor aquí, sin editar código. Pega la URL completa, no un script. Si la vacías, la tarjeta se oculta."}
      </p>
      <p className="text-xs text-muted-foreground">
        Pulsa «Guardar Configuración» para publicar los cambios. Los visitantes los verán al
        recargar. Abrir la oferta no concede recompensas ni elimina otros anuncios.
      </p>
    </section>
  );
}
