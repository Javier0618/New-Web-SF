import LoadingScreen, { LoadingOverlay } from "@/components/LoadingScreen";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { LicenseProvider, useLicense } from "@/contexts/LicenseContext";
import LicenseBlock from "@/components/LicenseBlock";
import FloatingButton from "@/components/FloatingButton";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import ScrollToTop from "@/components/ScrollToTop";
import ThemeApplier from "@/components/ThemeApplier";
import AdsCodeInjector from "@/components/ads/AdsCodeInjector";
import AntiAdblock from "@/components/ads/AntiAdblock";
import ConfigSetupScreen from "@/components/ConfigSetupScreen";
import { getRuntimeConfig } from "@/lib/runtimeConfig";
import { isDevHost } from "@/lib/devHost";

import { lazy, Suspense } from "react";
import IndexPage from "@/features/pages/Index";

// El resto de páginas se descargan solo cuando se visitan (el panel de admin
// por sí solo pesaba más que toda la portada).
const MoviesPage = lazy(() => import("@/features/pages/MoviesPage"));
const SeriesPage = lazy(() => import("@/features/pages/SeriesPage"));
const AnimesPage = lazy(() => import("@/features/pages/AnimesPage"));
const DoramasPage = lazy(() => import("@/features/pages/DoramasPage"));
const LoginPage = lazy(() => import("@/features/pages/LoginPage"));
const AdminPage = lazy(() => import("@/features/pages/AdminPage"));
const ProfilePage = lazy(() => import("@/features/pages/ProfilePage"));
const MessagesPage = lazy(() => import("@/features/pages/MessagesPage"));
const SearchPage = lazy(() => import("@/features/pages/SearchPage"));
const ContentPage = lazy(() => import("@/features/pages/ContentPage"));
const CategoryPage = lazy(() => import("@/features/pages/CategoryPage"));
const WatchPage = lazy(() => import("@/features/pages/WatchPage"));
const NotFound = lazy(() => import("@/features/pages/NotFound"));

function PageFallback() {
  return <LoadingScreen />;
}
import ProtectedRoute from "@/components/ProtectedRoute";
import Footer from "@/components/layout/Footer";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000 } },
});

function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página no encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La página que buscas no existe o fue movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

function LicenseGate({ children }: { children: React.ReactNode }) {
  const { status } = useLicense();

  if (status.state === "checking") {
    return <LoadingScreen />;
  }

  if (status.state === "invalid") {
    return <LicenseBlock />;
  }

  return <>{children}</>;
}

export default function App() {
  const cfg = getRuntimeConfig();
  // En entornos Lovable (preview / sandbox) NUNCA pedimos config ni licencia.
  // La pantalla de setup solo aparece en producción real (build desplegado
  // en el dominio del cliente) cuando falta /config.js.
  if (!cfg.ok && !isDevHost()) {
    return <ConfigSetupScreen missing={cfg.missing} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <LicenseProvider>
          <LicenseGate>
            <AuthProvider>
              <TooltipProvider>
                <ThemeApplier />
                <AdsCodeInjector />
                <AntiAdblock />
                <ScrollToTop />
                <AnalyticsTracker />
                <div className="min-h-screen">
                  <Suspense fallback={<PageFallback />}>
                    <Routes>
                      <Route path="/" element={<IndexPage />} />
                      <Route path="/movies" element={<MoviesPage />} />
                      <Route path="/series" element={<SeriesPage />} />
                      <Route path="/animes" element={<AnimesPage />} />
                      <Route path="/doramas" element={<DoramasPage />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route
                        path="/admin"
                        element={
                          <ProtectedRoute>
                            <AdminPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/messages" element={<MessagesPage />} />
                      <Route path="/search" element={<SearchPage />} />
                      <Route path="/content/:id" element={<ContentPage />} />
                      <Route path="/pelicula/:slug" element={<ContentPage />} />
                      <Route path="/serie/:slug" element={<ContentPage />} />
                      <Route path="/category/:type" element={<CategoryPage />} />
                      <Route path="/watch/:id" element={<WatchPage />} />
                      <Route path="*" element={<NotFound />} />
                      <Route path="/__not-found" element={<NotFoundPage />} />
                    </Routes>
                  </Suspense>
                  <Footer />
                  <FloatingButton />
                </div>
                <Toaster />
                <LoadingOverlay />
              </TooltipProvider>
            </AuthProvider>
          </LicenseGate>
        </LicenseProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
