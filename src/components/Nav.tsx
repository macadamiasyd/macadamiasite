"use client";

import { useState, useEffect } from "react";
import styles from "./Nav.module.css";
import type { SectionId } from "@/app/page";
import { useLenis } from "./SmoothScroll";

const ITEMS: { id: SectionId; label: string }[] = [
  { id: "projects", label: "projects" },
  { id: "about", label: "about" },
];

type NavTheme = "light" | "dark";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<SectionId>("home");
  const [theme, setTheme] = useState<NavTheme>("dark");

  const { scrollTo } = useLenis();

  // Nav bar blur state + scroll-driven active section
  useEffect(() => {
    const handler = () => {
      setScrolled(window.scrollY > 30);

      // Determine which section owns the top third of the viewport
      const threshold = window.innerHeight * 0.35;
      const order: SectionId[] = ["home", "projects", "about"];
      let current: SectionId = "home";
      for (const id of order) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top - threshold <= 0) current = id;
      }
      setActive(current);
    };
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler);
      window.removeEventListener("resize", handler);
    };
  }, []);

  // Nav theme — pick up whichever `data-nav-theme` section is directly under
  // the nav bar (top sliver of the viewport).
  useEffect(() => {
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>("[data-nav-theme]")
    );
    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Of all currently-crossing-the-top entries, pick the one with the
        // greatest top above 0 (i.e. nearest the nav bar).
        let best: { el: HTMLElement; top: number } | null = null;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const top = entry.boundingClientRect.top;
          if (!best || top > best.top) {
            best = { el: entry.target as HTMLElement, top };
          }
        }
        if (best) {
          const t = (best.el.getAttribute("data-nav-theme") ||
            "dark") as NavTheme;
          setTheme(t);
        }
      },
      { rootMargin: "0px 0px -95% 0px", threshold: 0 }
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, []);

  const jumpTo = (id: SectionId) => {
    if (id === "home") {
      scrollTo(0);
      return;
    }
    scrollTo(`#${id}`);
  };

  return (
    <nav
      className={`${styles.nav} ${scrolled ? styles.scrolled : ""} ${
        theme === "light" ? styles.navLight : ""
      }`}
    >
      <button
        className={`${styles.logo} ${scrolled ? styles.logoCollapsed : ""}`}
        onClick={() => jumpTo("home")}
        aria-label="Macadamia — home"
      >
        <span className={styles.logoMask} role="img" aria-label="Macadamia" />
      </button>

      <div className={styles.links}>
        {ITEMS.map(({ id, label }) => (
          <button
            key={id}
            data-id={id}
            className={`${styles.link} ${active === id ? styles.linkActive : ""}`}
            onClick={() => jumpTo(id)}
          >
            <span className={styles.linkLabel}>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
