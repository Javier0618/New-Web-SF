import { Link } from "@/lib/react-router-shim";
import { ArrowLeft } from "lucide-react";

/** Cabecera común de las páginas de catálogo (Películas, Series, géneros…). */
const PageHeader = ({ title, count }: { title: string; count?: number }) => (
  <header className="mb-8 md:mb-10">
    <Link
      to="/"
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground mb-3"
    >
      <ArrowLeft className="w-4 h-4" /> Inicio
    </Link>
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <h1 className="font-display font-condensed text-5xl md:text-7xl font-extrabold tracking-tight leading-none">
        {title}
      </h1>
      {count != null && count > 0 && (
        <p className="text-muted-foreground">
          {count} {count === 1 ? "título" : "títulos"}
        </p>
      )}
    </div>
  </header>
);

export default PageHeader;
