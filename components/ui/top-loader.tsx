"use client";

/**
 * Global top progress bar.
 *
 * The App Router exposes no router events, and `useLinkStatus` only works
 * inside a `<Link>` subtree — so neither can drive a document-level bar.
 * Instead this listens for navigation *intent* (a same-origin anchor click, a
 * history push from router.push, or a back/forward) and completes when the
 * pathname settles.
 *
 * Progress is deliberately asymptotic: it eases toward 90% and only reaches
 * 100% on arrival, so a slow route never looks stalled at a fixed width.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function TopLoader() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Whether a navigation is currently in flight. */
  const activeRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (startTimerRef.current) {
      clearTimeout(startTimerRef.current);
      startTimerRef.current = null;
    }
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (hideRef.current) {
      clearTimeout(hideRef.current);
      hideRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clearTimers();
    activeRef.current = true;

    // Defer state updates to a macrotask so they don't fire synchronously inside
    // React's `useInsertionEffect` (which history pushState/replaceState hooks into).
    startTimerRef.current = setTimeout(() => {
      if (!activeRef.current) return;
      setVisible(true);
      setProgress(8);
      tickRef.current = setInterval(() => {
        setProgress((p) => (p >= 90 ? p : p + Math.max(0.4, (90 - p) * 0.06)));
      }, 120);
    }, 0);
  }, [clearTimers]);

  const finish = useCallback(() => {
    clearTimers();
    setProgress(100);
    hideRef.current = setTimeout(() => {
      setVisible(false);
      // Reset only after the fade, so the bar never visibly rewinds.
      hideRef.current = setTimeout(() => setProgress(0), 220);
    }, 180);
  }, [clearTimers]);

  // Arrival: the rendered pathname changed, so the navigation completed.
  // The completion is scheduled rather than called inline — a synchronous
  // setState in an effect body triggers cascading renders.
  useEffect(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    const t = setTimeout(() => finish(), 0);
    return () => clearTimeout(t);
  }, [pathname, finish]);

  useEffect(() => {
    // Intent 1 — a click on a same-origin link that actually navigates.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      // Same page, or hash-only change — no navigation to report.
      if (url.pathname === window.location.pathname && url.hash) return;
      if (url.href === window.location.href) return;

      start();
    };

    // Intent 2 — programmatic navigation (router.push / replace).
    const { pushState, replaceState } = window.history;
    const wrap =
      (fn: typeof pushState) =>
      (...args: Parameters<typeof pushState>) => {
        start();
        return fn.apply(window.history, args);
      };
    window.history.pushState = wrap(pushState);
    window.history.replaceState = wrap(replaceState);

    // Intent 3 — browser back/forward.
    const onPopState = () => start();

    document.addEventListener("click", onClick, { capture: true });
    window.addEventListener("popstate", onPopState);

    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("popstate", onPopState);
      window.history.pushState = pushState;
      window.history.replaceState = replaceState;
      clearTimers();
    };
  }, [start, clearTimers]);

  if (!visible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px]">
      <div
        className="h-full bg-primary shadow-[0_0_10px_var(--color-primary,#f0bb0d)] transition-[width,opacity] duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  );
}
