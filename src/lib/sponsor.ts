export interface SponsorConfig {
  enabled: boolean;
  provider: string;
  url: string;
}

// Initial values only. The administrator's saved configuration takes precedence,
// including an empty URL or an explicitly disabled placement.
export const defaultSponsorConfig: SponsorConfig = {
  enabled: true,
  provider: "Adsterra",
  url: "https://www.profitableratecpmnetwork.com/u6pfe1senn?key=fa602c56f5f0773430c51223574adc8d",
};

export function sponsorConfig(value?: Partial<SponsorConfig> | null): SponsorConfig {
  return {
    enabled: typeof value?.enabled === "boolean" ? value.enabled : defaultSponsorConfig.enabled,
    provider: typeof value?.provider === "string" ? value.provider : defaultSponsorConfig.provider,
    url: typeof value?.url === "string" ? value.url : defaultSponsorConfig.url,
  };
}

export function safeSponsorUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export function readAdDismissal(key: string) {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}
export function rememberAdDismissal(key: string) {
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    /* Closing still works without storage. */
  }
}
