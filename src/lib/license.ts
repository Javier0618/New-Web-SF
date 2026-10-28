/**
 * Sistema de validación de licencias (cliente).
 *
 * Diseño endurecido:
 *  - NO existe lista.json pública. Toda la validación pasa por activar.php.
 *  - La URL del endpoint viene en BASE64 (VITE_LIC_EP_B64) para que no aparezca
 *    como string plano en el bundle.
 *  - Cada petición lleva un header X-Auth-Token (secreto compartido) que el
 *    PHP verifica con hash_equals. Sin token correcto el endpoint responde 401.
 *  - El servidor solo responde { ok, activated?, reason? } — nunca expone la lista.
 *
 * Excepciones (siempre permitidas, sin validar):
 *  - localhost / 127.0.0.1 / 0.0.0.0
 *  - *.lovable.app / *.lovableproject.com
 */

export type LicenseStatus =
  | { state: "checking" }
  | { state: "valid"; activated?: boolean }
  | { state: "invalid"; reason: string };

const LICENSE_KEY = import.meta.env.VITE_LICENSE_KEY as string | undefined;
const ENDPOINT_B64 = import.meta.env.VITE_LIC_EP_B64 as string | undefined;
const AUTH_TOKEN = import.meta.env.VITE_LICENSE_AUTH_TOKEN as string | undefined;

function decodeEndpoint(b64: string): string {
  try {
    // atob disponible en navegador
    return atob(b64);
  } catch {
    return "";
  }
}

import { isDevHost } from "./devHost";

export async function validateLicense(): Promise<LicenseStatus> {
  if (typeof window === "undefined") {
    return { state: "valid" };
  }

  if (isDevHost()) {
    return { state: "valid" };
  }

  const hostname = window.location.hostname;

  if (!LICENSE_KEY || LICENSE_KEY === "CAMBIA-ESTO-POR-TU-LICENCIA") {
    return {
      state: "invalid",
      reason: "No se ha configurado ninguna licencia (VITE_LICENSE_KEY).",
    };
  }

  if (!ENDPOINT_B64 || !AUTH_TOKEN) {
    return {
      state: "invalid",
      reason: "Configuración de licencia incompleta.",
    };
  }

  const endpoint = decodeEndpoint(ENDPOINT_B64);
  if (!endpoint) {
    return {
      state: "invalid",
      reason: "Endpoint de licencia mal codificado.",
    };
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": AUTH_TOKEN,
      },
      body: JSON.stringify({ key: LICENSE_KEY, domain: hostname }),
      cache: "no-store",
    });

    if (res.status === 401) {
      return {
        state: "invalid",
        reason: "Credenciales de validación rechazadas por el servidor.",
      };
    }

    if (!res.ok) {
      return {
        state: "invalid",
        reason: `El servidor de licencias respondió HTTP ${res.status}.`,
      };
    }

    const data = (await res.json()) as {
      ok: boolean;
      activated?: boolean;
      reason?: string;
    };

    if (!data.ok) {
      const map: Record<string, string> = {
        license_not_found: "La licencia no existe.",
        domain_mismatch: "Esta licencia ya está activada en otro dominio.",
        bad_key: "Formato de licencia inválido.",
        bad_domain: "Dominio inválido.",
        bad_request: "Petición inválida.",
        no_list: "No se pudo leer la lista de licencias.",
        corrupt_list: "Lista de licencias corrupta.",
        io_error: "Error de E/S en el servidor.",
        lock_error: "El servidor está ocupado, reintenta.",
      };
      return {
        state: "invalid",
        reason: map[data.reason || ""] || data.reason || "Licencia no válida.",
      };
    }

    return { state: "valid", activated: data.activated };
  } catch {
    return {
      state: "invalid",
      reason: "No se pudo contactar el servidor de licencias.",
    };
  }
}

export const VENDOR_INFO = {
  name: (import.meta.env.VITE_VENDOR_NAME as string) || "Soporte",
  email: (import.meta.env.VITE_VENDOR_EMAIL as string) || "",
  whatsapp: (import.meta.env.VITE_VENDOR_WHATSAPP as string) || "",
  telegram: (import.meta.env.VITE_VENDOR_TELEGRAM as string) || "",
};