import { Link, useNavigate, useLocation } from "@/lib/react-router-shim";
import { useAuth } from "@/contexts/AuthContext";
import { Search, User, LogOut, Shield, X, Home, Film, Tv, Sparkles, Heart } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useWebConfig } from "@/hooks/useWebConfig";

const DEFAULT_LOGO = "https://raw.githubusercontent.com/Javier0618/Imagenes/main/SFusionLogo.png";

const links = [
  { to: "/", label: "Inicio", icon: Home },
  { to: "/movies", label: "Películas", icon: Film },
  { to: "/series", label: "Series", icon: Tv },
  { to: "/animes", label: "Animes", icon: Sparkles },
  { to: "/doramas", label: "Doramas", icon: Heart },
];

const Navbar = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { data: config } = useWebConfig();
  const logoUrl = config?.logoUrl || DEFAULT_LOGO;
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // Transparente sobre el hero; sólida al hacer scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    setSearchOpen(false);
    setSearchQuery("");
  };

  const openMobileSearch = () => {
    setSearchOpen(true);
    setTimeout(() => mobileInputRef.current?.focus(), 50);
  };

  return (
    <>
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-colors duration-300 ${
          scrolled
            ? "bg-background/90 backdrop-blur-xl border-b border-border/60"
            : "bg-gradient-to-b from-background/85 to-transparent"
        }`}
      >
        {searchOpen && (
          <form
            onSubmit={handleSearchSubmit}
            className="md:hidden absolute inset-0 z-10 flex items-center gap-3 bg-background px-4"
          >
            <Search className="w-5 h-5 text-primary flex-shrink-0" />
            <input
              ref={mobileInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Título, actor o género"
              aria-label="Buscar"
              className="flex-1 bg-transparent text-base placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              aria-label="Cerrar búsqueda"
              className="p-2 rounded-full hover:bg-accent"
            >
              <X className="w-5 h-5" />
            </button>
          </form>
        )}

        <div className="flex items-center gap-6 h-16 px-4 md:px-10">
          <Link to="/" className="flex-shrink-0">
            <img src={logoUrl} alt="StreamFusion" className="h-7 md:h-8 object-contain" />
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                aria-current={isActive(l.to) ? "page" : undefined}
                className={`px-3 py-1.5 rounded-full text-[15px] font-semibold transition-colors ${
                  isActive(l.to)
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/70 hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <form onSubmit={handleSearchSubmit} className="hidden md:block relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar títulos"
                aria-label="Buscar"
                className="w-52 lg:w-64 h-9 pl-9 pr-3 rounded-full bg-secondary/70 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary lg:focus:w-72 transition-all"
              />
            </form>
            <button
              onClick={openMobileSearch}
              className="md:hidden p-2 rounded-full hover:bg-accent"
              aria-label="Buscar"
            >
              <Search className="w-5 h-5" />
            </button>

            {user ? (
              <>
                {isAdmin && (
                  <button
                    onClick={() => navigate("/admin")}
                    className="p-2 rounded-full hover:bg-accent"
                    title="Panel de administración"
                    aria-label="Panel de administración"
                  >
                    <Shield className="w-5 h-5 text-primary" />
                  </button>
                )}
                <button
                  onClick={() => navigate("/profile")}
                  className="w-9 h-9 rounded-full bg-primary text-primary-foreground font-display font-bold text-sm flex items-center justify-center"
                  title="Mi perfil"
                  aria-label="Mi perfil"
                >
                  {user.email ? user.email.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                </button>
                <button
                  onClick={logout}
                  className="hidden sm:block p-2 rounded-full hover:bg-accent"
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="px-4 h-9 rounded-full border border-primary text-primary text-sm font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                Entrar
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Barra inferior en móvil: las secciones quedan al alcance del pulgar */}
      <nav
        aria-label="Secciones"
        className="md:hidden fixed bottom-0 inset-x-0 z-50 h-16 bg-background/95 backdrop-blur-xl border-t border-border/70 grid grid-cols-5 pb-[env(safe-area-inset-bottom)]"
      >
        {links.map(({ to, label, icon: Icon }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.4 : 1.8} />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
};

export default Navbar;
