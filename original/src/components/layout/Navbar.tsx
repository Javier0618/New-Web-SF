import { Link, useNavigate, useLocation } from "@/lib/react-router-shim";
import { useAuth } from "@/contexts/AuthContext";
import { Search, User, LogOut, Shield, Menu, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWebConfig } from "@/hooks/useWebConfig";

const Navbar = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { data: config } = useWebConfig();
  const logoUrl = config?.logoUrl;
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);

  // Barra transparente arriba del todo; sólida con desenfoque al hacer scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { to: "/", label: "Inicio" },
    { to: "/movies", label: "Películas" },
    { to: "/series", label: "Series" },
    { to: "/animes", label: "Animes" },
    { to: "/doramas", label: "Doramas" },
  ];
  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  const openSearch = () => {
    setSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-white/5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.8)]"
          : "bg-gradient-to-b from-black/80 via-black/40 to-transparent"
      }`}
    >
      {/* Search overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center bg-black px-4 md:px-12"
            style={{ height: "64px" }}
          >
            <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-3 h-full">
              <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar películas, series… (español o inglés)"
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-base focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery("");
                }}
                className="p-2 rounded-md hover:bg-accent transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between px-4 md:px-12 py-4">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-8 md:h-9 object-contain" />
            ) : (
              <img
                src="https://raw.githubusercontent.com/Javier0618/Imagenes/main/SFusionLogo.png"
                alt="StreamFusion"
                className="h-8 md:h-9 object-contain"
              />
            )}
          </Link>
          <div className="hidden md:flex items-center gap-1 text-sm font-semibold">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`relative px-3 py-2 rounded-full transition-colors ${
                  isActive(l.to) ? "text-white" : "text-white/60 hover:text-white"
                }`}
              >
                {l.label}
                {isActive(l.to) && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute left-3 right-3 -bottom-0.5 h-[3px] rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]"
                  />
                )}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Search button — always visible */}
          <button
            onClick={openSearch}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            title="Buscar"
            aria-label="Buscar"
          >
            <Search className="w-5 h-5" />
          </button>

          {user ? (
            <>
              {isAdmin && (
                <button
                  onClick={() => navigate("/admin")}
                  className="p-2 rounded-md hover:bg-accent transition-colors"
                  title="Admin"
                >
                  <Shield className="w-5 h-5 text-primary" />
                </button>
              )}
              <button
                onClick={() => navigate("/profile")}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-black text-sm flex items-center justify-center ring-2 ring-white/10 hover:ring-white/40 transition"
                title="Perfil"
                aria-label="Perfil"
              >
                {user.email ? user.email.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
              </button>
              <button
                onClick={logout}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                title="Salir"
                aria-label="Cerrar sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Iniciar sesión
            </button>
          )}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menú"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background/95 backdrop-blur-md px-4 pb-4"
          >
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`block py-2.5 px-3 rounded-lg text-sm font-semibold ${
                  isActive(l.to)
                    ? "bg-primary/15 text-white border-l-2 border-primary"
                    : "text-white/70"
                }`}
                onClick={() => setMobileOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <button
              onClick={() => {
                setMobileOpen(false);
                openSearch();
              }}
              className="block py-2 text-sm w-full text-left"
            >
              Buscar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
