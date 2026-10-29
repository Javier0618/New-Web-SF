import LoadingScreen from "@/components/LoadingScreen";
import { Navigate } from "@/lib/react-router-shim";
import { useAuth } from "@/contexts/AuthContext";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isAdmin, adminChecked } = useAuth();

  // Espera a la sesión y a que termine la comprobación de admin: así entrar
  // directo a /admin o recargar ya no expulsa al inicio por una carrera.
  if (loading || (user && !adminChecked)) {
    return <LoadingScreen />;
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
