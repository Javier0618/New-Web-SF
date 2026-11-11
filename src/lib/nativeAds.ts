export const defaultNativeCode = `<script async="async" data-cfasync="false" src="https://pl25353030.profitableratecpmnetwork.com/fca89d36c252ab206fbbf1928736ea49/invoke.js"></script>
<div id="container-fca89d36c252ab206fbbf1928736ea49"></div>`;

export function isNativeAdCode(code: unknown): boolean {
  if (typeof code !== "string") return false;
  const key = code.match(/\bid\s*=\s*["']container-([a-f0-9]{32})["']/i)?.[1];
  return !!key && code.includes(`/${key}/invoke.js`);
}
