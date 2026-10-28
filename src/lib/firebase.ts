import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getRuntimeConfig } from "./runtimeConfig";

const cfg = getRuntimeConfig();

let app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

if (cfg.ok && cfg.config) {
  app = initializeApp(cfg.config.firebase);
  _auth = getAuth(app);
  _db = getFirestore(app);
} else {
  // eslint-disable-next-line no-console
  console.warn(
    "[firebase] Configuración no encontrada o incompleta. Faltantes:",
    cfg.missing,
  );
}

export const auth = _auth as Auth;
export const db = _db as Firestore;

export const isFirebaseReady = () => _auth !== null && _db !== null;

export default app;
