import { useLoadingProgress, useLoadingScreen } from "@/lib/loadingProgress";

/** Ocupa el sitio de la página mientras carga; la barra la pinta `LoadingOverlay`. */
const LoadingScreen = () => {
  useLoadingScreen(true);
  return <div className="min-h-screen bg-background" />;
};

/** Barra de progreso 0-100 % a pantalla completa. Se monta una sola vez en App. */
export const LoadingOverlay = () => {
  const { progress, visible } = useLoadingProgress();
  if (!visible) return null;
  const pct = Math.round(progress);

  return (
    <div
      className={`fixed inset-0 z-40 flex items-center justify-center bg-background transition-opacity duration-300 ${
        pct >= 100 ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div
        role="progressbar"
        aria-label="Cargando"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="w-56 md:w-72"
      >
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-3 text-center text-sm font-semibold tabular-nums text-muted-foreground">
          {pct}%
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
