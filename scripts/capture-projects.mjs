// Capture multi-page video tours of every project site.
// Writes WebMs (and JPG posters) to public/captures/, plus a manifest at
// src/data/captures.ts.
//
// Usage: npm run capture
//        npm run capture -- --only=revolver,buchan
//
// Each capture is a single recording that:
//   1. Lands on the homepage, settles, smooth-scrolls top→bottom
//   2. Auto-discovers up to 2 internal nav links and visits each:
//        navigate, settle, scroll partway down
//   3. Returns to homepage and scrolls back to top so the loop is clean
// Recording: 1440x900 viewport, WebM via Playwright recordVideo.

import { chromium } from "playwright";
import { mkdir, writeFile, stat, readFile, rename, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CAPTURE_DIR = join(ROOT, "public", "captures");
const TMP_DIR = join(ROOT, ".capture-tmp");
const MANIFEST_PATH = join(ROOT, "src", "data", "captures.ts");
const PROJECTS_PATH = join(ROOT, "src", "data", "projects.ts");

const VIEWPORT = { width: 1440, height: 900 };

// Tour timings (ms). Tuned so the whole tour lands around 22-25s.
const T = {
  HOME_SETTLE: 900,
  HOME_SCROLL_DOWN: 6500,
  HOME_HOLD_BOTTOM: 500,
  STOP_NAV_SETTLE: 800,
  STOP_SCROLL: 4500,
  STOP_HOLD: 350,
  RETURN_NAV_SETTLE: 700,
  RETURN_TAIL: 600,
};

// ── Parse args ──────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);
const onlyList = typeof args.only === "string" ? args.only.split(",") : null;

// ── Load project list (regex parse — no transpile needed) ───────────────
async function loadProjects() {
  const src = await readFile(PROJECTS_PATH, "utf8");
  const entries = [];
  const re = /\{\s*name:\s*"([^"]+)",\s*slug:\s*"([^"]+)",\s*type:\s*"([^"]+)",\s*url:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(src))) {
    entries.push({ name: m[1], slug: m[2], type: m[3], url: m[4] });
  }
  return entries;
}

// ── Best-effort banner dismissal ────────────────────────────────────────
async function dismissBanners(page) {
  try {
    await page.evaluate(() => {
      const accept = [
        "accept all", "accept", "agree", "i agree", "got it",
        "allow all", "allow", "okay", "ok", "i understand",
        "continue", "close", "dismiss",
      ];
      const candidates = Array.from(
        document.querySelectorAll("button, a, [role=button]")
      );
      for (const el of candidates) {
        const t = (el.textContent || "").trim().toLowerCase();
        if (!t) continue;
        if (accept.some((s) => t === s || t.startsWith(s))) {
          try { el.click(); } catch {}
        }
      }
      const killSelectors = [
        "#onetrust-banner-sdk",
        "#onetrust-consent-sdk",
        ".cky-consent-container",
        ".cookie-banner",
        ".cookies",
        "[class*='cookie' i][class*='banner' i]",
        "[id*='cookie' i][id*='banner' i]",
      ];
      for (const sel of killSelectors) {
        document.querySelectorAll(sel).forEach((el) => el.remove());
      }
    });
  } catch {}
}

// ── Eager-load lazy images by warming the page first ────────────────────
async function warmLazyImages(page) {
  try {
    await page.evaluate(async () => {
      const max = document.documentElement.scrollHeight;
      const step = window.innerHeight * 0.8;
      for (let y = 0; y < max; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 200));
    });
  } catch {}
}

// ── Discover up to N internal nav links (ranked by likely tour stops) ───
async function discoverTourStops(page, maxStops = 2) {
  return await page.evaluate((maxStops) => {
    const origin = location.origin;
    const here = location.pathname.replace(/\/$/, "") || "/";

    // Prefer links inside <nav>, <header>, [role=navigation], or visible top menus
    const inNav = Array.from(
      document.querySelectorAll(
        "nav a[href], header a[href], [role=navigation] a[href]"
      )
    );

    // Also catch top-area visible links if no nav found
    const fallback = Array.from(document.querySelectorAll("a[href]")).filter(
      (a) => {
        const r = a.getBoundingClientRect();
        return r.top < 200 && r.width > 10;
      }
    );

    const pool = inNav.length >= 2 ? inNav : [...inNav, ...fallback];

    const seen = new Set();
    const out = [];

    // Words we'd love to visit; rank these higher
    const preferred = [
      "work", "projects", "studio", "about", "contact", "people",
      "approach", "process", "services", "team", "stories",
    ];

    const rank = (text) => {
      const t = text.toLowerCase();
      for (let i = 0; i < preferred.length; i++) {
        if (t === preferred[i] || t.startsWith(preferred[i])) return i;
      }
      return preferred.length + 50;
    };

    const candidates = [];
    for (const a of pool) {
      const href = a.href;
      if (!href) continue;
      let u;
      try { u = new URL(href); } catch { continue; }
      if (u.origin !== origin) continue;
      const path = u.pathname.replace(/\/$/, "") || "/";
      if (path === here || path === "/") continue;
      if (/\.(jpg|jpeg|png|gif|pdf|zip|mp4)$/i.test(path)) continue;
      if (seen.has(path)) continue;
      seen.add(path);
      const text = (a.textContent || "").trim();
      candidates.push({ url: u.href, path, text, rank: rank(text) });
    }

    candidates.sort((a, b) => a.rank - b.rank);
    for (const c of candidates) {
      out.push(c.url);
      if (out.length >= maxStops) break;
    }
    return out;
  }, maxStops);
}

// ── Smooth scroll choreography (runs in the page) ───────────────────────
async function scrollChoreography(page, mode) {
  // mode: "home" → full top→bottom + hold
  //       "stop" → top→ partial-down + hold
  //       "return" → just settle + tiny tail at top
  await page.evaluate(
    async ({ mode, T }) => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const easeInOut = (t) =>
        t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const max = () =>
        Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

      const animate = (from, to, duration) =>
        new Promise((resolve) => {
          const start = performance.now();
          function tick(now) {
            const elapsed = now - start;
            const t = Math.min(1, elapsed / duration);
            window.scrollTo(0, from + (to - from) * easeInOut(t));
            if (t < 1) requestAnimationFrame(tick);
            else resolve();
          }
          requestAnimationFrame(tick);
        });

      if (mode === "home") {
        window.scrollTo(0, 0);
        await sleep(T.HOME_SETTLE);
        const m = max();
        if (m < 40) {
          await sleep(T.HOME_SCROLL_DOWN + T.HOME_HOLD_BOTTOM);
        } else {
          await animate(0, m, T.HOME_SCROLL_DOWN);
          await sleep(T.HOME_HOLD_BOTTOM);
        }
      } else if (mode === "stop") {
        window.scrollTo(0, 0);
        await sleep(T.STOP_NAV_SETTLE);
        const m = max();
        if (m < 40) {
          await sleep(T.STOP_SCROLL + T.STOP_HOLD);
        } else {
          // Scroll down up to ~2 viewports so we see the page open up
          const target = Math.min(m, window.innerHeight * 1.8);
          await animate(0, target, T.STOP_SCROLL);
          await sleep(T.STOP_HOLD);
        }
      } else if (mode === "return") {
        window.scrollTo(0, 0);
        await sleep(T.RETURN_NAV_SETTLE + T.RETURN_TAIL);
      }
    },
    { mode, T }
  );
}

// ── Capture one project ─────────────────────────────────────────────────
async function captureOne(browser, project) {
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    colorScheme: "light",
    recordVideo: { dir: TMP_DIR, size: VIEWPORT },
  });
  const page = await ctx.newPage();

  console.log(`▸ ${project.name} — ${project.url}`);

  // Initial navigation
  let navOk = true;
  try {
    await page.goto(project.url, { waitUntil: "networkidle", timeout: 60000 });
  } catch (e) {
    console.warn(`  ! initial nav: ${e.message}`);
    if (/ERR_NAME_NOT_RESOLVED|ERR_CONNECTION/.test(e.message)) navOk = false;
  }
  if (!navOk) {
    await ctx.close();
    throw new Error("network/DNS failure");
  }

  try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch {}
  await dismissBanners(page);
  await page.waitForTimeout(400);
  await warmLazyImages(page);
  await dismissBanners(page);
  await page.waitForTimeout(300);

  // Discover tour stops BEFORE poster, while we're on the homepage
  const stops = await discoverTourStops(page, 2);
  if (stops.length) {
    console.log(`  · stops:`, stops.map((u) => new URL(u).pathname).join("  "));
  } else {
    console.log(`  · no internal stops discovered, scrolling home only`);
  }

  // First-frame poster JPEG
  const posterPath = join(CAPTURE_DIR, `${project.slug}.jpg`);
  try {
    await page.screenshot({
      path: posterPath,
      type: "jpeg",
      quality: 80,
      fullPage: false,
    });
  } catch (e) {
    console.warn(`  ! poster failed: ${e.message}`);
  }

  // ── Choreographed tour ─────────────────────────────────────────────────
  // 1) Home: settle + scroll down + hold
  await scrollChoreography(page, "home");

  // 2) Each stop: navigate, settle, scroll partway
  for (const stopUrl of stops) {
    try {
      await page.goto(stopUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForLoadState("networkidle", { timeout: 6000 }).catch(() => {});
    } catch (e) {
      console.warn(`  ! stop nav failed (${stopUrl}): ${e.message}`);
      continue;
    }
    await dismissBanners(page);
    await scrollChoreography(page, "stop");
  }

  // 3) Return home, scroll to top — clean loop point
  try {
    await page.goto(project.url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  } catch {}
  await dismissBanners(page);
  await scrollChoreography(page, "return");

  // Finalize video
  const video = page.video();
  await page.close();
  await ctx.close();

  let tmpVideoPath = null;
  try {
    tmpVideoPath = await video.path();
  } catch (e) {
    console.warn(`  ! video.path() failed: ${e.message}`);
  }

  let outVideoPath = null;
  if (tmpVideoPath && existsSync(tmpVideoPath)) {
    outVideoPath = join(CAPTURE_DIR, `${project.slug}.webm`);
    await rename(tmpVideoPath, outVideoPath);
    const { size } = await stat(outVideoPath);
    console.log(`  ✓ ${(size / 1024 / 1024).toFixed(2)} MB · ${project.slug}.webm`);
  } else {
    console.warn(`  ! no video file produced`);
  }

  return {
    slug: project.slug,
    src: outVideoPath ? `/captures/${project.slug}.webm` : null,
    poster: existsSync(posterPath) ? `/captures/${project.slug}.jpg` : null,
  };
}

// ── Manifest writer ─────────────────────────────────────────────────────
async function writeManifest(entries) {
  let existing = {};
  if (existsSync(MANIFEST_PATH)) {
    try {
      const txt = await readFile(MANIFEST_PATH, "utf8");
      const m = txt.match(/CAPTURES[^=]*=\s*(\{[\s\S]*?\});/);
      if (m) {
        try { existing = JSON.parse(m[1]); } catch {}
      }
    } catch {}
  }
  const merged = { ...existing };
  for (const e of entries) {
    if (!e.src) continue;
    merged[e.slug] = { src: e.src, ...(e.poster ? { poster: e.poster } : {}) };
  }

  const body = `// AUTO-GENERATED by scripts/capture-projects.mjs — do not edit by hand.
// Run \`npm run capture\` to regenerate.

export interface CaptureMeta {
  src: string;
  poster?: string;
}

export const CAPTURES: Record<string, CaptureMeta> = ${JSON.stringify(
    merged,
    null,
    2
  )};
`;
  await writeFile(MANIFEST_PATH, body, "utf8");
  console.log(`\n✓ wrote ${MANIFEST_PATH}`);
}

// ── Main ────────────────────────────────────────────────────────────────
async function main() {
  await mkdir(CAPTURE_DIR, { recursive: true });
  await mkdir(TMP_DIR, { recursive: true });
  const projects = await loadProjects();
  const targets = onlyList
    ? projects.filter((p) => onlyList.includes(p.slug))
    : projects;

  if (targets.length === 0) {
    console.error("No matching projects.");
    process.exit(1);
  }

  console.log(`Capturing ${targets.length} project(s) as video tours…\n`);

  const browser = await chromium.launch();
  const results = [];
  for (const project of targets) {
    try {
      const result = await captureOne(browser, project);
      if (result.src) results.push(result);
    } catch (e) {
      console.error(`  ✗ ${project.slug} failed: ${e.message}`);
    }
  }
  await browser.close();

  if (results.length) {
    await writeManifest(results);
  }

  try { await rm(TMP_DIR, { recursive: true, force: true }); } catch {}

  console.log(`\nDone. ${results.length}/${targets.length} captured.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
