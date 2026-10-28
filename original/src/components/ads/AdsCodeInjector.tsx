import { useEffect } from "react";
import { useWebConfig } from "@/hooks/useWebConfig";

const HEAD_MARK = "data-admin-ads-head";
const BODY_MARK = "data-admin-ads-body";

/**
 * Injects raw HTML/JS snippets configured in admin (ads.headCode and ads.bodyCode)
 * into <head> and start of <body> respectively. Scripts are re-created so they
 * actually execute (innerHTML alone does not run scripts).
 */
const injectInto = (target: HTMLElement, html: string, mark: string) => {
  // Remove previously-injected nodes
  target.querySelectorAll(`[${mark}]`).forEach((n) => n.remove());
  if (!html.trim()) return;

  const temp = document.createElement("div");
  temp.innerHTML = html;

  Array.from(temp.childNodes).forEach((node) => {
    if (node.nodeName === "SCRIPT") {
      const orig = node as HTMLScriptElement;
      const script = document.createElement("script");
      Array.from(orig.attributes).forEach((a) => script.setAttribute(a.name, a.value));
      script.textContent = orig.textContent;
      script.setAttribute(mark, "1");
      target.appendChild(script);
    } else {
      const clone = node.cloneNode(true) as HTMLElement;
      if (clone.setAttribute) clone.setAttribute(mark, "1");
      target.appendChild(clone);
    }
  });
};

const AdsCodeInjector = () => {
  const { data: config } = useWebConfig();
  const ads = config?.ads;

  useEffect(() => {
    if (!ads?.enabled) {
      // Clean up any previously injected ads if disabled
      document.head.querySelectorAll(`[${HEAD_MARK}]`).forEach((n) => n.remove());
      document.body.querySelectorAll(`[${BODY_MARK}]`).forEach((n) => n.remove());
      return;
    }
    injectInto(document.head, ads.headCode || "", HEAD_MARK);
    injectInto(document.body, ads.bodyCode || "", BODY_MARK);
  }, [ads?.enabled, ads?.headCode, ads?.bodyCode]);

  return null;
};

export default AdsCodeInjector;
