"use client";

import { useState, useEffect, useRef } from "react";
import { getTaglines } from "@/data/projects";
import { useLenis } from "./SmoothScroll";
import styles from "./HomePage.module.css";

// Computed once per mount. Ticks forward automatically on each new calendar
// year (see `yearsIndependent` in projects.ts).
const TAGLINES = getTaglines();

const BG_VIDEOS = [
  "/animations/greencords.mp4",
  "/animations/orange.mp4",
  "/animations/redtape.mp4",
];

export default function HomePage() {
  // Start deterministic for SSR; randomize after mount to avoid hydration mismatch
  const [idx, setIdx] = useState(0);
  const [outgoing, setOutgoing] = useState(false);
  const [bgSrc, setBgSrc] = useState<string | null>(null);

  // Pick a random tagline and a random background video on mount
  useEffect(() => {
    setIdx(Math.floor(Math.random() * TAGLINES.length));
    setBgSrc(BG_VIDEOS[Math.floor(Math.random() * BG_VIDEOS.length)]);
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
  const chars = tagline.split("");

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
        <span key={idx} className={styles.taglineInner}>
          {chars.map((c, i) => (
            <span
              key={i}
              className={styles.char}
              style={{ animationDelay: `${i * 0.022}s` }}
            >
              {c === " " ? "\u00A0" : c}
            </span>
          ))}
        </span>
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
