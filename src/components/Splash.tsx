"use client";

import { useEffect, useRef, useState } from "react";
import { getBgVideo } from "@/lib/bgVideo";
import styles from "./Splash.module.css";

/**
 * Splash intro screen.
 *
 * Holds the viewport while the homepage background video downloads, so the
 * homepage never reveals itself before its <video> has buffered. The splash
 * animates the Macadamia wordmark, then fades out only once BOTH of these
 * are true:
 *
 *   1. A minimum visible window has elapsed (so the logo animation always
 *      has time to play — no 120ms flash on fast connections).
 *   2. The chosen background video has fired `canplaythrough`, or a hard
 *      max timeout has elapsed (so a stalled network can never strand the
 *      user on the splash forever).
 *
 * The selected clip is shared with HomePage via `@/lib/bgVideo` so both
 * consumers agree on the same URL and the HomePage <video> reuses the
 * bytes that the hidden splash <video> already downloaded.
 */

// Minimum on-screen time in ms. Matches the logo wipe + hairline draw so
// the full intro animation always plays through even on a warm cache.
const MIN_VISIBLE_MS = 3200;
// Absolute ceiling — if the video hasn't reported ready by this point we
// reveal the homepage anyway rather than trap the user on the splash.
const MAX_WAIT_MS = 9000;
// Matches the CSS `transition: opacity 1.1s` on .root (plus a small buffer
// so the logo's slide-down transform finishes before the element unmounts).
const FADE_MS = 1150;

export default function Splash() {
  const [minElapsed, setMinElapsed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [bgSrc, setBgSrc] = useState<string | null>(null);
  const preloadRef = useRef<HTMLVideoElement | null>(null);

  // Pick the bg video on mount (client-only, shared with HomePage).
  useEffect(() => {
    setBgSrc(getBgVideo());
  }, []);

  // Minimum-visible timer + absolute max-wait safety net.
  useEffect(() => {
    const minTimer = window.setTimeout(
      () => setMinElapsed(true),
      MIN_VISIBLE_MS,
    );
    const maxTimer = window.setTimeout(
      () => setVideoReady(true),
      MAX_WAIT_MS,
    );

    // Lock body scroll while the splash is up so the user can't scroll
    // content they still can't see.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.clearTimeout(minTimer);
      window.clearTimeout(maxTimer);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Listen for the hidden preload video becoming playable. `canplaythrough`
  // is stronger than `loadeddata` — it means the browser estimates no
  // stalls during playback, which is exactly what we want for a loop.
  useEffect(() => {
    const el = preloadRef.current;
    if (!el) return;

    const markReady = () => setVideoReady(true);

    // If the browser already has enough of it (e.g. SWR hit from disk cache),
    // readyState >= HAVE_FUTURE_DATA (3) is good enough to reveal.
    if (el.readyState >= 3) {
      markReady();
      return;
    }

    el.addEventListener("canplaythrough", markReady);
    el.addEventListener("loadeddata", markReady);
    // If the fetch errors for any reason, don't block the splash forever.
    el.addEventListener("error", markReady);

    return () => {
      el.removeEventListener("canplaythrough", markReady);
      el.removeEventListener("loadeddata", markReady);
      el.removeEventListener("error", markReady);
    };
  }, [bgSrc]);

  // Start fading out when both gates have opened.
  useEffect(() => {
    if (!minElapsed || !videoReady) return;
    setExiting(true);
    // Release scroll lock the moment the fade starts so the homepage is
    // interactive immediately.
    document.body.style.overflow = "";
    const removeTimer = window.setTimeout(() => setRemoved(true), FADE_MS);
    return () => window.clearTimeout(removeTimer);
  }, [minElapsed, videoReady]);

  if (removed) return null;

  return (
    <div
      className={`${styles.root} ${exiting ? styles.exiting : ""}`}
      aria-hidden={exiting ? "true" : "false"}
      role="presentation"
    >
      <div className={styles.grain} />

      <div className={styles.logoWrap}>
        {/* Inline SVG so we can drive the wipe via CSS clip-path. */}
        <svg
          className={styles.logo}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 727.2 72.693336"
          preserveAspectRatio="xMidYMid meet"
          aria-label="Macadamia"
        >
          <g transform="matrix(0.13333333,0,0,-0.13333333,0,72.693333)">
            <path
              fill="currentColor"
              d="m 4298.7,545.152 c -79.53,0 -151.19,-34.336 -200.94,-88.949 -49.75,54.613 -121.4,88.949 -200.93,88.949 h -72.11 c -39.14,0 -70.89,-31.726 -70.89,-70.886 V 0 h 141.78 v 403.391 h 1.22 c 71.71,0 130.05,-58.348 130.05,-130.059 V 0 h 141.77 v 273.332 c 0,71.711 58.34,130.059 130.05,130.059 71.71,0 130.04,-58.348 130.04,-130.059 V 0 h 141.76 v 273.332 c 0,149.879 -121.92,271.82 -271.8,271.82 m -3161.74,0 c -149.89,0 -271.815,-121.941 -271.815,-271.82 0,-149.879 121.925,-271.80856 271.815,-271.80856 h 200.94 c 39.14,0 70.87,31.73046 70.87,70.89066 V 273.332 c 0,149.879 -121.93,271.82 -271.81,271.82 m 130.05,-401.867 h -130.05 c -71.71,0 -130.04,58.348 -130.04,130.047 0,71.711 58.33,130.059 130.04,130.059 71.72,0 130.05,-58.348 130.05,-130.059 z m 3915.13,401.867 c -149.88,0 -271.81,-121.941 -271.81,-271.82 0,-149.879 121.93,-271.80856 271.81,-271.80856 h 200.93 c 39.14,0 70.89,31.73046 70.89,70.89066 V 273.332 c 0,149.879 -121.95,271.82 -271.82,271.82 m 130.04,-401.867 h -130.04 c -71.7,0 -130.05,58.348 -130.05,130.047 0,71.711 58.35,130.059 130.05,130.059 71.71,0 130.04,-58.348 130.04,-130.059 z M 544.863,545.152 c -79.527,0 -151.183,-34.336 -200.945,-88.949 -49.75,54.613 -121.395,88.949 -200.922,88.949 H 70.8867 C 31.7266,545.152 0,513.426 0,474.266 V 0 h 141.762 v 403.391 h 1.234 c 71.699,0 130.047,-58.348 130.047,-130.059 V 0 h 141.762 v 273.332 c 0,71.711 58.347,130.059 130.058,130.059 71.7,0 130.047,-58.348 130.047,-130.059 V 0 h 141.762 v 273.332 c 0,149.879 -121.942,271.82 -271.809,271.82 m 1686.597,0 c -149.88,0 -271.81,-121.941 -271.81,-271.82 0,-149.879 121.93,-271.80856 271.81,-271.80856 h 200.93 c 39.15,0 70.89,31.73046 70.89,70.89066 V 273.332 c 0,149.879 -121.94,271.82 -271.82,271.82 M 2361.5,143.285 h -130.04 c -71.7,0 -130.05,58.348 -130.05,130.047 0,71.711 58.35,130.059 130.05,130.059 71.71,0 130.04,-58.348 130.04,-130.059 z m 1060.16,401.867 c -149.88,0 -271.82,-121.941 -271.82,-271.82 0,-149.879 121.94,-271.80856 271.82,-271.80856 h 200.93 c 39.15,0 70.88,31.73046 70.88,70.89066 V 273.332 c 0,149.879 -121.93,271.82 -271.81,271.82 m 130.05,-401.867 h -130.05 c -71.71,0 -130.05,58.348 -130.05,130.047 0,71.711 58.34,130.059 130.05,130.059 71.7,0 130.05,-58.348 130.05,-130.059 z M 4767.8,273.332 v 200.934 c 0,39.16 -31.73,70.886 -70.89,70.886 -39.15,0 -70.89,-31.726 -70.89,-70.886 V 273.332 c 0,-149.879 121.94,-271.80856 271.82,-271.80856 V 143.285 c -71.69,0 -130.04,58.348 -130.04,130.047 m -1740.32,271.82 h -200.91 c -149.88,0 -271.83,-121.941 -271.83,-271.804 0,-149.895 121.95,-271.82456 271.83,-271.82456 149.87,0 271.8,121.92956 271.8,271.82456 v 200.918 c 0,39.16 -31.73,70.886 -70.89,70.886 m -70.87,-271.804 c 0,-71.715 -58.35,-130.063 -130.04,-130.063 -71.72,0 -130.06,58.348 -130.06,130.063 0,71.695 58.34,130.043 130.06,130.043 h 130.04 z m -1034.68,91.613 c 27.6,27.594 27.67,72.246 0.28,99.949 l 0.62,0.633 c -105.98,105.98 -278.42,105.98 -384.4,0 -105.98,-105.98 -105.98,-278.426 0,-384.4063 52.99,-52.9922 122.59,-79.48826 192.2,-79.48826 69.61,0 139.22,26.49606 192.21,79.48826 L 1822.59,181.387 c -50.7,-50.707 -133.22,-50.707 -183.92,-0.012 -50.71,50.711 -50.71,133.219 0,183.914 50.62,50.613 132.9,50.699 183.63,0.274 l -0.61,-0.602 c 27.69,-27.676 72.57,-27.676 100.24,0"
            />
          </g>
        </svg>
      </div>

      <span className={styles.hair} />

      <div className={styles.footer}>
        <span>Est. 2009</span>
        <span className={styles.footerSep} />
        <span>Independent studio</span>
      </div>

      {/*
        Offscreen preloader for the chosen background clip. We hold the
        splash up until this element fires `canplaythrough`, then fade out.
        HomePage's visible <video> points at the same URL, so it reuses the
        bytes already in the HTTP cache and begins playback immediately.
      */}
      <div className={styles.preloaders} aria-hidden="true">
        {bgSrc && (
          <video
            ref={preloadRef}
            src={bgSrc}
            preload="auto"
            muted
            playsInline
            disableRemotePlayback
          />
        )}
      </div>
    </div>
  );
}
