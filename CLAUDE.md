# Macadamia — Portfolio Website

## Overview
Portfolio site for Macadamia, a Sydney-based website & software development studio (est. 2011). Three pages: Home, Projects, About/Contact.

## Architecture
- **Framework**: Next.js 14 (App Router)
- **Styling**: CSS Modules per component, plus `globals.css` for base/reset/fonts
- **Fonts**: DM Sans (body) and JetBrains Mono (mono/accents) via Google Fonts; Relative Book (display/headings) self-hosted from `/public/fonts/` under a Colophon Foundry webfont licence. Licence PDFs live in `/licenses/relative-book/`.
- **Deployment target**: Vercel (GitHub: macadamiasyd)

## Key Design Decisions
- **Live iframe embeds**: Each project showcases the actual live client website in a browser-chrome mockup frame. All 8 sites have been verified to NOT send `X-Frame-Options` or CSP `frame-ancestors` headers, so iframes work. Iframes lazy-load via IntersectionObserver.
- **Per-project colour theming**: Each project section has its own `bg`, `fg`, and `accent` colours drawn from the client's brand palette. The background transitions as you scroll between projects.
- **Rotating taglines on Home**: Cycles through 5 taglines every 5.5s with a fade transition. Random start index per visit.
- **Scroll-triggered animations**: Project info slides in from left, browser mockup from right, using IntersectionObserver with CSS keyframe animations.
- **Responsive**: Stacks to single column below 860px.

## Project Data
All project data is in `src/data/projects.ts`. To add/remove/reorder projects, edit that file. Each project has:
- `name`, `type` — display info
- `url` — full URL loaded in the iframe
- `display` — short domain shown in browser chrome bar
- `bg`, `fg`, `accent` — colour theme for that project's section

## File Structure
```
src/
  app/
    layout.tsx        — Root layout, font imports, metadata
    page.tsx          — Client component: routes between Home/Projects/About
    globals.css       — Reset, fonts, keyframes, base styles
  components/
    Nav.tsx           — Fixed nav with scroll-aware background blur
    HomePage.tsx      — Rotating tagline, CTA
    ProjectsPage.tsx  — Project list with lazy-loaded iframe sections
    ProjectSection.tsx — Individual project: info + browser mockup + iframe
    AboutPage.tsx     — Copy, contact details, footer
  data/
    projects.ts       — Project data array + taglines array
```

## Commands
```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # Production build
```

## Editing Guide
- **Copy**: About page text is in `AboutPage.tsx`. Taglines in `src/data/projects.ts`.
- **Contact details**: In `AboutPage.tsx` — update email and phone.
- **Add a project**: Add an entry to `PROJECTS` array in `src/data/projects.ts`.
- **Colours**: Each project's `bg`/`fg`/`accent` values. Nav adapts automatically.
- **Fonts**: Changed in `globals.css` @import and `layout.tsx` font variables.
