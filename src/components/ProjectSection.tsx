"use client";

import { useState, useEffect, useRef } from "react";
import type { Project } from "@/data/projects";
import { CAPTURES } from "@/data/captures";
import styles from "./ProjectSection.module.css";

interface ProjectSectionProps {
  project: Project;
  nextProject?: Project;
  index: number;
  total: number;
}

export default function ProjectSection({
  project,
  nextProject,
  index,
  total,
}: ProjectSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const browserRef = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  const [visNow, setVisNow] = useState(false); // currently in viewport (video + tilt gating)
  const [loaded, setLoaded] = useState(false);

  // Scroll-driven values: parallax offset for the mockup + progress for the crossfade.
  const [parallax, setParallax] = useState(0);
  const [progress, setProgress] = useState(0);

  const capture = CAPTURES[project.slug];

  /* ── Entry visibility (fires once — used for reveal) ───────────────── */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVis(true);
      },
      { threshold: [0.15] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /* ── Theme broadcast when section is dominant ───────────────────────── */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.intersectionRatio >= 0.5) {
          const root = document.documentElement;
          root.style.setProperty("--mac-bg", project.bg);
          root.style.setProperty("--mac-fg", project.fg);
          root.style.setProperty("--mac-accent", project.accent);
          window.dispatchEvent(
            new CustomEvent<number>("mac-active-project", { detail: index })
          );
        }
      },
      { threshold: [0.5] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [project, index]);

  /* ── Currently-in-view flag for video play/pause + tilt gating ──────── */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => setVisNow(e.isIntersecting && e.intersectionRatio > 0.2),
      { threshold: [0, 0.2, 0.5] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /* ── Video: play when visible, pause + reset when off-screen ─────────── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    // Cached-video race: canplay may have fired before React attached.
    if (v.readyState >= 2) setLoaded(true);

    if (visNow) {
      v.play().catch(() => {});
    } else {
      v.pause();
      v.currentTime = 0;
    }
  }, [visNow, capture?.src]);

  /* ── Scroll-linked parallax + next-project crossfade progress ────────── */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    let raf = 0;
    const compute = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;

      // Parallax: section-center relative to viewport-center, normalised.
      const sectionCenter = rect.top + rect.height / 2;
      const delta = (sectionCenter - vh / 2) / vh;
      // Negative so mockup drifts up as the viewport descends — max ~36px.
      setParallax(Math.max(-1, Math.min(1, delta)) * -36);

      // Progress through the section (0 when bottom enters viewport bottom,
      // 1 when top crosses the viewport top).
      const totalTravel = rect.height + vh;
      const scrolled = vh - rect.top;
      const p = Math.max(0, Math.min(1, scrolled / totalTravel));
      setProgress(p);
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Next-project colour overlay: only the last 28% of the scroll eases 0→1.
  const crossfadeOpacity =
    nextProject && progress > 0.72 ? (progress - 0.72) / 0.28 : 0;

  const isDark = !isLightHex(project.bg);

  return (
    <section
      ref={sectionRef}
      id={`project-${index}`}
      className={`${styles.section} ${index === 0 ? styles.firstSection : ""}`}
      style={{ backgroundColor: project.bg, color: project.fg }}
      data-nav-theme={isDark ? "light" : "dark"}
    >
      {/* Next-project background crossfade layer */}
      {nextProject && (
        <div
          className={styles.nextFade}
          style={{
            backgroundColor: nextProject.bg,
            opacity: crossfadeOpacity,
          }}
          aria-hidden
        />
      )}

      {/* Massive background numeral */}
      <div
        className={`${styles.bigIndex} ${vis ? styles.bigIndexVisible : ""}`}
        style={{ color: project.fg }}
        aria-hidden
      >
        {String(index + 1).padStart(2, "0")}
      </div>

      <div className={styles.inner}>
        {/* Project info */}
        <div
          className={`${styles.info} ${vis ? styles.infoVisible : styles.infoHidden}`}
        >
          <div className={styles.idx}>
            <span
              className={styles.idxLine}
              style={{ background: project.accent }}
            />
            <span>
              {String(index + 1).padStart(2, "0")} —{" "}
              {String(total).padStart(2, "0")}
            </span>
          </div>

          <h2 className={styles.name} aria-label={project.name}>
            {project.name.split(" ").map((word, i) => (
              <span key={i} className={styles.nameWord}>
                <span
                  className={styles.nameWordInner}
                  style={{ ["--word-delay" as string]: `${i * 0.09}s` }}
                >
                  {word}
                </span>
              </span>
            ))}
          </h2>

          <p className={styles.type} style={{ color: project.accent }}>
            {project.type}
          </p>

          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.visit}
            style={{ borderColor: `${project.fg}30` }}
          >
            <span className={styles.visitLabel}>Visit site</span>
            <span
              className={styles.visitDomain}
              style={{ color: project.accent }}
            >
              {project.display}
            </span>
            <span className={styles.visitArrow} aria-hidden>
              ↗
            </span>
          </a>
        </div>

        {/* Browser mockup with looping tour video */}
        <div
          ref={browserRef}
          className={`${styles.browser} ${vis ? styles.browserVisible : styles.browserHidden}`}
          style={{
            background: project.bg,
            boxShadow: `0 50px 110px -20px ${shadowFor(project.bg)}, 0 18px 40px -10px ${shadowFor(project.bg, 0.18)}`,
            transform: `translateY(${parallax}px)`,
          }}
        >
          <div
            className={styles.browserBar}
            style={{
              background: barBgFor(project.fg),
              borderBottom: `1px solid ${project.fg}10`,
            }}
          >
            <span className={styles.dots}>
              <span className={`${styles.dot} ${styles.dotR}`} />
              <span className={`${styles.dot} ${styles.dotY}`} />
              <span className={`${styles.dot} ${styles.dotG}`} />
            </span>
            <span
              className={styles.browserUrl}
              style={{
                color: project.fg,
                background: `${project.fg}0c`,
              }}
            >
              <span className={styles.browserLock} aria-hidden>
                ⌁
              </span>
              {project.display}
            </span>
            <span className={styles.browserSpacer} />
          </div>

          <div className={styles.viewport}>
            {capture ? (
              <video
                ref={videoRef}
                src={capture.src}
                poster={capture.poster}
                className={styles.shot}
                muted
                loop
                playsInline
                preload="metadata"
                onLoadedData={() => setLoaded(true)}
                onCanPlay={() => setLoaded(true)}
                style={{ opacity: loaded ? 1 : 0 }}
              />
            ) : (
              <div className={styles.placeholder} style={{ color: project.fg }}>
                <span className={styles.placeholderDot} />
              </div>
            )}

            {capture && !loaded && (
              <div
                className={styles.loadingOverlay}
                style={{ background: project.bg, color: project.fg }}
              >
                <span
                  className={styles.loadingBar}
                  style={{ background: project.accent }}
                />
                <span className={styles.loadingText}>
                  Loading {project.display}
                </span>
              </div>
            )}
          </div>

          <div
            className={styles.bottomFade}
            style={{
              background: `linear-gradient(to top, ${project.bg}66, transparent)`,
            }}
          />
        </div>
      </div>
    </section>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

function isLightHex(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

function shadowFor(bg: string, alpha = 0.45): string {
  return isLightHex(bg)
    ? `rgba(40, 30, 20, ${alpha * 0.35})`
    : `rgba(0, 0, 0, ${alpha})`;
}

function barBgFor(fg: string): string {
  return `${fg}0d`;
}
