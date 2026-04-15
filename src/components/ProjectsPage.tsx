"use client";

import { useEffect, useRef, useState } from "react";
import { PROJECTS } from "@/data/projects";
import ProjectSection from "./ProjectSection";
import styles from "./ProjectsPage.module.css";

export default function ProjectsPage() {
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Trigger header animations once the header itself is meaningfully in
  // view. Previously the observer watched the whole (very tall) section
  // and fired when the first pixel entered the viewport — on desktop that
  // ran the 2.5s animation sequence well before the user had scrolled far
  // enough to see the heading, so by the time they did it was already
  // static. Observing the header with threshold 0.3 makes it fire when the
  // heading is actually on screen, across all viewports.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && e.intersectionRatio >= 0.3) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: [0, 0.3, 0.6] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Counter tick-up: 00 → total, starts once header becomes visible
  useEffect(() => {
    if (!visible) return;
    const total = PROJECTS.length;
    const startDelay = 300;
    const duration = 900;
    let raf = 0;
    const start = performance.now() + startDelay;
    const tick = (now: number) => {
      const t = Math.max(0, Math.min(1, (now - start) / duration));
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(eased * total));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  // Two phrases animated as a whole unit: the first slides in from the
  // left, then after a short delay the italic emphasis phrase slides in
  // from the right. Kept as two plain strings — no per-char splitting —
  // because the animation is on the whole span now.
  const titleA = "Six briefs.";
  const titleB = "Six worlds.";

  return (
    <section
      id="projects"
      ref={sectionRef}
      className={`${styles.container} ${visible ? styles.visible : ""}`}
    >
      <div className={styles.header} ref={headerRef}>
        <span className={styles.kicker}>
          <span className={styles.kickerLine} />
          <span className={styles.kickerCount}>
            <span className={styles.kickerCountNum}>
              {String(count).padStart(2, "0")}
            </span>
            <span className={styles.kickerCountSlash}>/</span>
            <span className={styles.kickerCountTotal}>
              {String(PROJECTS.length).padStart(2, "0")}
            </span>
          </span>
          <span className={styles.kickerDivider} />
          Selected Work
        </span>

        <h1 className={styles.title}>
          <span className={styles.titleLine}>{titleA}</span>{" "}
          <em className={styles.titleEm}>{titleB}</em>
        </h1>

        <span className={styles.titleHair} aria-hidden />
      </div>

      {PROJECTS.map((p, i) => (
        <ProjectSection
          key={p.name}
          project={p}
          nextProject={PROJECTS[i + 1]}
          index={i}
          total={PROJECTS.length}
        />
      ))}
    </section>
  );
}
