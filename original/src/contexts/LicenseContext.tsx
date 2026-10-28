import React, { createContext, useContext, useEffect, useState } from "react";
import { validateLicense, type LicenseStatus } from "@/lib/license";
import { isDevHost } from "@/lib/devHost";

interface LicenseContextType {
  status: LicenseStatus;
  retry: () => void;
}

const LicenseContext = createContext<LicenseContextType | null>(null);

export const LicenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // En entornos Lovable / preview saltamos por completo la validación de licencia.
  const skip = isDevHost();
  const [status, setStatus] = useState<LicenseStatus>(
    skip ? { state: "valid" } : { state: "checking" },
  );
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (skip) return;
    let cancelled = false;
    setStatus({ state: "checking" });
    validateLicense().then((result) => {
      if (!cancelled) setStatus(result);
    });
    return () => {
      cancelled = true;
    };
  }, [tick, skip]);

  // Re-valida cada 30 minutos. Si borras la licencia del JSON,
  // la web se bloqueará en el siguiente check.
  useEffect(() => {
    if (skip) return;
    const interval = setInterval(() => setTick((t) => t + 1), 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [skip]);

  return (
    <LicenseContext.Provider value={{ status, retry: () => setTick((t) => t + 1) }}>
      {children}
    </LicenseContext.Provider>
  );
};

const NOOP_LICENSE: LicenseContextType = {
  status: { state: "valid" },
  retry: () => {},
};

export const useLicense = (): LicenseContextType => {
  const ctx = useContext(LicenseContext);
  // Fallback seguro: si por cualquier razón (HMR, render fuera del árbol)
  // el contexto no está disponible, no rompemos la app — asumimos válido.
  return ctx ?? NOOP_LICENSE;
};