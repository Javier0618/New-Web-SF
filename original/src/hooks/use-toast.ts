/**
 * Compat shim: legacy code expects a shadcn-style `useToast()` returning
 * `{ toast }` with `{ title, description, variant }` calls. We map this onto
 * the project's existing `sonner` toaster.
 */

import { toast as sonnerToast } from "sonner";

type ToastVariant = "default" | "destructive";

interface ToastArgs {
  title?: string;
  description?: string;
  variant?: ToastVariant;
}

function toast({ title, description, variant }: ToastArgs) {
  const message = title ?? description ?? "";
  const opts = title && description ? { description } : undefined;
  if (variant === "destructive") {
    return sonnerToast.error(message, opts);
  }
  return sonnerToast(message, opts);
}

export function useToast() {
  return { toast, dismiss: sonnerToast.dismiss };
}

export { toast };
