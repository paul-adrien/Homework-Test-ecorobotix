import { useEffect, useState } from "react";

/**
 * Matches Tailwind's `sm` breakpoint (640px) — anything below is mobile.
 * Kept in sync with `tailwind.config` / `@theme` if the breakpoint ever moves.
 */
const MOBILE_QUERY = "(max-width: 639px)";

/**
 * `true` when the viewport is below the Tailwind `sm` breakpoint. Used to
 * switch between layouts whose differences can't be expressed by Tailwind
 * responsive classes alone — typically when a portalised element (e.g. a
 * non-modal vaul Drawer mounted at `<body>` level) would escape a
 * `sm:hidden` wrapper.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(MOBILE_QUERY).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const handler = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return isMobile;
}
