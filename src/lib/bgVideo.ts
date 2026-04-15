/**
 * Shared "which background video should the homepage show?" picker.
 *
 * Both the Splash and the HomePage need to agree on the same clip:
 * - Splash uses it to drive a hidden <video> that we wait on `canplaythrough`
 *   before fading the splash out.
 * - HomePage uses it for the actual visible background <video>.
 *
 * The selection is lazy and memoised per page load on the client. On the
 * server it returns `null` so we don't produce hydration mismatches — both
 * consumers are client components and call this from a useEffect.
 */
export const BG_VIDEOS = [
  "/animations/greencords.mp4",
  "/animations/orange.mp4",
  "/animations/redtape.mp4",
];

let chosen: string | null = null;

export function getBgVideo(): string | null {
  if (typeof window === "undefined") return null;
  if (chosen === null) {
    chosen = BG_VIDEOS[Math.floor(Math.random() * BG_VIDEOS.length)];
  }
  return chosen;
}
