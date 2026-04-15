"use client";

import { useState, useEffect, useRef } from "react";
import { getTaglines } from "@/data/projects";
import { getBgVideo } from "@/lib/bgVideo";
import { useLenis } from "./SmoothScroll";
import styles from "./HomePage.module.css";

// Computed once per mount. Ticks forward automatically on each new calendar
// year (see `yearsIndependent` in projects.ts).
const TAGLINES = getTaglines();

export default function HomePage() {
  // Start deterministic for SSR; randomize after mount to avoid hydration mismatch
  const [idx, setIdx] = useState(0);
  const [outgoing, setOutgoing] = useState(false);
  const [bgSrc, setBgSrc] = useState<string | null>(null);

  // Pick a random tagline on mount. The bg video picker is shared with the
  // Splash via @/lib/bgVideo so both components agree on the same URL and
  // the bytes the splash already fetched are reused here.
  useEffect(() => {
    setIdx(Math.floor(Math.random() * TAGLINES.length));
    setBgSrc(getBgVideo());
  }, []);

  // Tagline rotation: fade out, swap, fade in
  useEffect(() => {
    const iv = window.setInterval(() => {
      setOutgoing(true);
      window.setTimeout(() => {
        setIdx((i) => (i + 1) % TAGLINES.length);
        setOutgoing(false);
      }, 480);
    }, 4800);
    return () => window.clearInterval(iv);
  }, []);

  // Broadcast the default home theme whenever the home section is in view
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.intersectionRatio >= 0.5) {
          const root = document.documentElement;
          root.style.setProperty("--mac-bg", "#faf9f7");
          root.style.setProperty("--mac-fg", "#1a1a1a");
          root.style.setProperty("--mac-accent", "#c39673");
        }
      },
      { threshold: [0.5] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const tagline = TAGLINES[idx];
  // Each tagline is a string[] of 1+ lines; we render them as stacked
  // blocks, with each line's chars starting their rise a little after the
  // line above finishes so the whole tagline reads as one entrance.
  let charOffset = 0;
  const renderedLines = tagline.map((line) => {
    const startAt = charOffset;
    const chars = line.split("");
    charOffset += chars.length;
    return { chars, startAt };
  });

  const { scrollTo } = useLenis();
  const scrollToProjects = () => scrollTo("#projects");

  return (
    <section
      id="home"
      ref={sectionRef}
      className={styles.container}
      data-nav-theme="dark"
    >
      {/* Rotating animation background */}
      {bgSrc && (
        <video
          key={bgSrc}
          className={styles.bgVideo}
          src={bgSrc}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
      )}
      <div className={styles.bgOverlay} />
      <div className={styles.grain} />

      <div className={styles.eyebrow}>
        <span className={styles.eyebrowDot} />
        Macadamia · Sydney
      </div>

      <p
        className={styles.tagline}
        data-state={outgoing ? "out" : "in"}
        aria-live="polite"
      >
        {renderedLines.map(({ chars, startAt }, lineIdx) => (
          <span
            key={`${idx}-${lineIdx}`}
            className={styles.taglineLine}
          >
            {chars.map((c, i) => (
              <span
                key={i}
                className={styles.char}
                style={{
                  animationDelay: `${(startAt + i) * 0.022 + lineIdx * 0.12}s`,
                }}
              >
                {c === " " ? "\u00A0" : c}
              </span>
            ))}
          </span>
        ))}
      </p>

      <button className={styles.enter} onClick={scrollToProjects}>
        <span className={styles.enterLabel}>View selected work</span>
        <span className={styles.enterArrow} aria-hidden>
          ↓
        </span>
      </button>

      <div className={styles.est}>
        <span>Est. 2009</span>
        <span className={styles.estSep} />
        <span>Independent studio</span>
      </div>
    </section>
  );
}
