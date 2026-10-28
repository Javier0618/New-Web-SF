import { ShieldAlert, Mail, MessageCircle, Send, RefreshCw } from "lucide-react";
import { useLicense } from "@/contexts/LicenseContext";
import { VENDOR_INFO } from "@/lib/license";
import { Button } from "@/components/ui/button";

export default function LicenseBlock() {
  const { status, retry } = useLicense();

  if (status.state !== "invalid") return null;

  const whatsappLink = VENDOR_INFO.whatsapp
    ? `https://wa.me/${VENDOR_INFO.whatsapp.replace(/[^0-9]/g, "")}`
    : "";
  const telegramLink = VENDOR_INFO.telegram
    ? `https://t.me/${VENDOR_INFO.telegram.replace(/^@/, "")}`
    : "";
  const emailLink = VENDOR_INFO.email ? `mailto:${VENDOR_INFO.email}` : "";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg rounded-xl border border-destructive/30 bg-card p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Licencia no válida</h1>
          <p className="mt-2 text-sm text-muted-foreground">{status.reason}</p>

          <div className="mt-6 w-full rounded-lg bg-muted/50 p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Esta copia del software no está autorizada
            </p>
            <p className="mt-2 text-sm text-foreground">
              Para obtener una licencia o resolver este problema, contacta con{" "}
              <span className="font-semibold">{VENDOR_INFO.name}</span>:
            </p>
          </div>

          <div className="mt-4 flex w-full flex-col gap-2">
            {emailLink && (
              <a
                href={emailLink}
                className="flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <Mail className="h-4 w-4" />
                {VENDOR_INFO.email}
              </a>
            )}
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp: {VENDOR_INFO.whatsapp}
              </a>
            )}
            {telegramLink && (
              <a
                href={telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <Send className="h-4 w-4" />
                Telegram: {VENDOR_INFO.telegram}
              </a>
            )}
          </div>

          <Button onClick={retry} variant="ghost" size="sm" className="mt-6 gap-2">
            <RefreshCw className="h-4 w-4" />
            Reintentar verificación
          </Button>
        </div>
      </div>
    </div>
  );
}