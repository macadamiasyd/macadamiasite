"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Lenis from "lenis";

interface SmoothScrollCtx {
  lenis: Lenis | null;
  scrollTo: (target: string | number | HTMLElement, opts?: { offset?: number }) => void;
}

const Ctx = createContext<SmoothScrollCtx>({
  lenis: null,
  scrollTo: () => {},
});

export function useLenis() {
  return useContext(Ctx);
}

export default function SmoothScroll({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Respect reduced-motion: skip lerping entirely and fall back to native scroll.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
    });

    // Bridge Lenis's lerped scroll events back into native `window.scroll`
    // events so any component using standard `addEventListener('scroll', …)`
    // — including IntersectionObserver in browsers that need a nudge — stays
    // in sync. Dispatching from the onScroll hook runs once per animation
    // frame, so the cost is a single event per frame.
    lenis.on("scroll", () => {
      window.dispatchEvent(new Event("scroll"));
    });

    lenisRef.current = lenis;
    // Dev only: expose for preview tooling.
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
    }
    setReady(true);

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
      setReady(false);
    };
  }, []);

  const scrollTo: SmoothScrollCtx["scrollTo"] = (target, opts) => {
    const lenis = lenisRef.current;
    if (lenis) {
      lenis.scrollTo(target as any, { offset: opts?.offset ?? 0 });
      return;
    }
    // Fallback for reduced-motion or pre-mount.
    if (typeof target === "string") {
      const el = document.querySelector(target) as HTMLElement | null;
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (typeof target === "number") {
      window.scrollTo({ top: target, behavior: "smooth" });
    } else {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <Ctx.Provider value={{ lenis: ready ? lenisRef.current : null, scrollTo }}>
      {children}
    </Ctx.Provider>
  );
}
