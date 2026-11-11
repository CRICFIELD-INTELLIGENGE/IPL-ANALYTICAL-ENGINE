// CRICFIELD Mobile — viewport gate. Below 1024px the mobile app shell renders; at 1024px and above the original
// desktop tree renders untouched. The site is a client-only SPA, so reading matchMedia on first render is
// hydration-safe. Layout selection follows the viewport automatically.
import { createContext, useEffect, useState } from "react";

export const MOBILE_QUERY = "(max-width: 1023px)";
const OPT_OUT = "cricfield-desktop-site";

/** True inside the mobile shell: desktop Layout renders its page without rails, header or footer. */
export const MobileChromeContext = createContext(false);

const optedOut = () => { try { return sessionStorage.getItem(OPT_OUT) === "1"; } catch { return false; } };
export function setDesktopSite(on: boolean) {
  try { if (on) sessionStorage.setItem(OPT_OUT, "1"); else sessionStorage.removeItem(OPT_OUT); } catch { /* storage blocked */ }
  window.dispatchEvent(new Event("cricfield-viewmode"));
}

export function useMobileGate(): boolean {
  const read = () => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches;
  const [mobile, setMobile] = useState(read);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const on = () => setMobile(read());
    mq.addEventListener("change", on);
    window.addEventListener("cricfield-viewmode", on);
    return () => { mq.removeEventListener("change", on); window.removeEventListener("cricfield-viewmode", on); };
  }, []);
  return mobile;
}
