export interface CaptureMeta {
  src: string;
  poster?: string;
}

// Maps a project slug to the video shown in its browser mockup.
// Source files live in /public/projects/ as transcoded mp4.
export const CAPTURES: Record<string, CaptureMeta> = {
  buchan: { src: "/projects/buchan.mp4" },
  "ending-loneliness": { src: "/projects/ending-loneliness.mp4" },
  "guilt-free": { src: "/projects/guilt-free.mp4" },
  "jcdecaux-careers": { src: "/projects/jcd-careers.mp4" },
  thinkerbell: { src: "/projects/thinkerbell.mp4" },
  "turner-studio": { src: "/projects/turner.mp4" },
};
