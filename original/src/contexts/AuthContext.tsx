import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

// El admin se detecta dinámicamente probando contra las reglas de Firestore:
// intentamos un setDoc inocuo (merge sin cambios reales) sobre un documento
// que solo los admins pueden escribir según `firestore.rules` (web_config/settings).
// Si Firestore lo permite → el usuario coincide con la regla isAdmin() y le
// asignamos admin al instante. Si responde permission-denied → no es admin.
// Así NO necesitas hardcodear emails ni crear ninguna colección manual: la
// única fuente de verdad son tus reglas de Firebase.

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Track auth state
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Detectar admin probando una escritura permitida solo a admins por las reglas.
  // Usamos web_config/settings con un merge vacío: no modifica datos pero
  // dispara la evaluación de la regla `allow write: if isAdmin()`.
  useEffect(() => {
    let cancelled = false;
    if (!user || !db) {
      setIsAdmin(false);
      return;
    }
    // El resultado se guarda por sesión para no repetir la escritura de prueba
    // en cada recarga de página.
    const cacheKey = `sf_is_admin_${user.uid}`;
    let cached: string | null = null;
    try {
      cached = sessionStorage.getItem(cacheKey);
    } catch {
      /* ignore */
    }
    if (cached !== null) {
      setIsAdmin(cached === "1");
      return;
    }
    (async () => {
      let result = false;
      try {
        await setDoc(doc(db, "web_config", "settings"), {}, { merge: true });
        result = true;
      } catch {
        result = false;
      }
      try {
        sessionStorage.setItem(cacheKey, result ? "1" : "0");
      } catch {
        /* ignore */
      }
      if (!cancelled) setIsAdmin(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Track online presence
  useEffect(() => {
    if (!user || !db) return;
    // Cada 4 min y solo con la pestaña visible (antes: cada 60 s siempre).
    // El panel de admin considera "en línea" a quien se vio en los últimos 5 min.
    let lastWrite = 0;
    const updatePresence = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastWrite < 2 * 60_000) return;
      lastWrite = Date.now();
      setDoc(doc(db, "users", user.uid), { lastSeen: serverTimestamp() }, { merge: true }).catch(
        () => {},
      );
    };
    updatePresence();
    const interval = setInterval(updatePresence, 4 * 60_000);
    document.addEventListener("visibilitychange", updatePresence);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", updatePresence);
    };
  }, [user]);

  const login = async (email: string, password: string) => {
    if (!auth) throw new Error("Firebase no está configurado. Revisa public/config.js");
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email: string, password: string) => {
    if (!auth) throw new Error("Firebase no está configurado. Revisa public/config.js");
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (db) {
      await setDoc(
        doc(db, "users", cred.user.uid),
        { email: cred.user.email, registeredAt: serverTimestamp(), lastSeen: serverTimestamp() },
        { merge: true },
      ).catch(() => {});
    }
  };

  const resetPassword = async (email: string) => {
    if (!auth) throw new Error("Firebase no está configurado. Revisa public/config.js");
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    if (!auth) return;
    try {
      if (user) sessionStorage.removeItem(`sf_is_admin_${user.uid}`);
    } catch {
      /* ignore */
    }
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, isAdmin, login, register, logout, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
