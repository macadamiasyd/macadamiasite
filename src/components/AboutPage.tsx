"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./AboutPage.module.css";

const HEADING = "About Macadamia";

export default function AboutPage() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  // Broadcast default theme when about enters view, and fire entry animations
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.intersectionRatio >= 0.2) {
          const root = document.documentElement;
          root.style.setProperty("--mac-bg", "#faf9f7");
          root.style.setProperty("--mac-fg", "#1a1a1a");
          root.style.setProperty("--mac-accent", "#c39673");
          setVisible(true);
        }
      },
      { threshold: [0.2] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      id="about"
      ref={sectionRef}
      className={`${styles.container} ${visible ? styles.visible : ""}`}
      data-nav-theme="dark"
    >
      <div className={styles.kicker}>
        <span className={styles.kickerLine} />
        About
      </div>

      <h1 className={styles.heading} aria-label={HEADING}>
        {HEADING.split(" ").map((word, i) => (
          <span key={i} className={styles.word}>
            <span
              className={styles.wordInner}
              style={{ animationDelay: `${0.15 + i * 0.12}s` }}
            >
              {word}
            </span>
          </span>
        ))}
      </h1>

      <p className={styles.text}>
        Macadamia is a website and software development studio based in Sydney.
        For nearly two decades, we&apos;ve partnered with every type of
        enterprise — from architects, design studios and creative agencies, to
        property developers, engineering firms and not-for-profits — to build
        digital experiences that feel as considered as the work they showcase.
        We&apos;re small by design — one conversation, one relationship, one
        project done properly.
      </p>

      <p className={styles.text}>
        We don&apos;t pitch. Most of our work comes from people we&apos;ve
        worked with before, or people they&apos;ve sent our way. If you&apos;re
        looking for someone who&apos;ll pick up the phone, understand your
        world, and build something you&apos;re genuinely proud of — we&apos;d
        love to hear from you.
      </p>

      <div className={styles.contact}>
        <p className={styles.contactLabel}>
          <span className={styles.kickerLine} />
          Get in touch
        </p>
        <p className={styles.contactDetail}>
          <a href="mailto:hello@macadamia.mx" className={styles.contactLink}>
            <span>hello@macadamia.mx</span>
            <span className={styles.contactArrow} aria-hidden>
              →
            </span>
          </a>
        </p>
        <p className={styles.contactDetail}>
          <a href="tel:+61432574237" className={styles.contactLink}>
            <span>Joel · +61 432 574 237</span>
            <span className={styles.contactArrow} aria-hidden>
              →
            </span>
          </a>
        </p>
      </div>

      <footer className={styles.footer}>
        <span>© Macadamia {new Date().getFullYear()}</span>
        <span className={styles.footerSep} />
        <span>Sydney, Australia</span>
      </footer>
    </section>
  );
}
