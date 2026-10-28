import { useState } from "react";
import { useNavigate } from "@/lib/react-router-shim";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { useContent } from "@/hooks/useContent";
import { getImageUrl } from "@/lib/image";

type Mode = "login" | "register" | "reset";

/** Traduce los códigos de Firebase Auth a mensajes claros en español. */
const authErrorMessage = (err: unknown): string => {
  const code = (err as { code?: string })?.code || "";
  const map: Record<string, string> = {
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/wrong-password": "Correo o contraseña incorrectos.",
    "auth/user-not-found": "No existe una cuenta con ese correo.",
    "auth/invalid-email": "El correo no es válido.",
    "auth/email-already-in-use": "Ya existe una cuenta con ese correo.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
    "auth/too-many-requests": "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
    "auth/network-request-failed": "Sin conexión. Revisa tu internet.",
    "auth/user-disabled": "Esta cuenta está desactivada.",
    "auth/missing-email": "Escribe tu correo.",
  };
  return map[code] || "No se pudo completar la operación. Inténtalo de nuevo.";
};

const inputCls =
  "w-full px-4 py-3 bg-card text-foreground rounded-xl border border-border focus:outline-none focus:border-primary";

const LoginPage = () => {
  const { login, register, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const { content } = useContent();
  const wall = content.filter((c) => c.poster_path).slice(0, 18);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
    setInfo("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email.trim(), password);
        navigate("/");
      } else if (mode === "register") {
        await register(email.trim(), password);
        navigate("/");
      } else {
        await resetPassword(email.trim());
        setInfo(
          "Si el correo está registrado, recibirás un enlace para crear una nueva contraseña. Revisa también la carpeta de spam.",
        );
      }
    } catch (err) {
      setError(authErrorMessage(err));
    }
    setLoading(false);
  };

  const title =
    mode === "login"
      ? "Iniciar sesión"
      : mode === "register"
        ? "Crear cuenta"
        : "Recuperar contraseña";
  const submitLabel =
    mode === "login" ? "Entrar" : mode === "register" ? "Registrarse" : "Enviar enlace";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="grid lg:grid-cols-[1.1fr_1fr] min-h-screen">
        {/* Muro de pósters del catálogo real */}
        <div className="relative hidden lg:block overflow-hidden" aria-hidden>
          <div className="absolute inset-0 grid grid-cols-4 gap-3 p-3 -rotate-6 scale-125 origin-center opacity-60">
            {wall.map((c) => (
              <img
                key={c.docId || c.id}
                src={getImageUrl(c.poster_path, "w300")}
                alt=""
                className="w-full aspect-[2/3] object-cover rounded-lg"
              />
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-background/30 via-background/60 to-background" />
          <p className="absolute right-10 bottom-14 max-w-sm text-right font-display font-condensed text-5xl font-extrabold leading-[0.95] tracking-tight">
            Tu lista, tu progreso y tus títulos en cualquier pantalla.
          </p>
        </div>

        <div className="flex items-center justify-center px-4 pt-20 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <h1 className="font-display text-4xl font-bold tracking-tight mb-2">{title}</h1>
            <p className="text-muted-foreground mb-8">
              {mode === "login"
                ? "Entra para guardar tu lista y seguir donde lo dejaste."
                : mode === "register"
                  ? "Solo necesitas un correo y una contraseña."
                  : "Te enviaremos un enlace para crear una contraseña nueva."}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-sm font-medium text-muted-foreground mb-1"
                >
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputCls}
                  placeholder="tu@email.com"
                />
              </div>

              {mode !== "reset" && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="login-password"
                      className="block text-sm font-medium text-muted-foreground"
                    >
                      Contraseña
                    </label>
                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={() => switchMode("reset")}
                        className="text-xs text-primary hover:underline"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className={inputCls + " pr-11"}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <p role="alert" className="text-destructive text-sm">
                  {error}
                </p>
              )}
              {info && (
                <p className="text-sm text-muted-foreground bg-secondary/60 rounded-md p-3">
                  {info}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-primary text-primary-foreground font-bold rounded-full hover:brightness-110 transition disabled:opacity-50"
              >
                {loading ? "Un momento…" : submitLabel}
              </button>
            </form>

            <p className="text-sm text-muted-foreground mt-6">
              {mode === "login" && (
                <>
                  ¿No tienes cuenta?{" "}
                  <button
                    onClick={() => switchMode("register")}
                    className="text-primary hover:underline"
                  >
                    Regístrate
                  </button>
                </>
              )}
              {mode === "register" && (
                <>
                  ¿Ya tienes cuenta?{" "}
                  <button
                    onClick={() => switchMode("login")}
                    className="text-primary hover:underline"
                  >
                    Inicia sesión
                  </button>
                </>
              )}
              {mode === "reset" && (
                <button
                  onClick={() => switchMode("login")}
                  className="text-primary hover:underline"
                >
                  Volver a iniciar sesión
                </button>
              )}
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
