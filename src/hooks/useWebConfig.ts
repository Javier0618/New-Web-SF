import { useQuery } from "@tanstack/react-query";
import { fetchWebConfig } from "@/lib/firestore";

export const useWebConfig = () => {
  return useQuery({
    queryKey: ["web-config"],
    queryFn: fetchWebConfig,
    staleTime: Infinity, // Mantener en caché permanentemente durante la sesión
    gcTime: Infinity,
  });
};
