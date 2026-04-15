export interface Project {
  name: string;
  slug: string;
  type: string;
  url: string;
  display: string;
  bg: string;
  fg: string;
  accent: string;
}

export const PROJECTS: Project[] = [
  {
    name: "Buchan",
    slug: "buchan",
    type: "Architecture",
    url: "https://buchan.au",
    display: "buchan.au",
    bg: "#f3efe9",
    fg: "#1c1c1c",
    accent: "#8a7560",
  },
  {
    name: "Thinkerbell",
    slug: "thinkerbell",
    type: "Creative Agency",
    url: "https://thinkerbell.com",
    display: "thinkerbell.com",
    bg: "#0d1b2a",
    fg: "#deeef2",
    accent: "#ee6c4d",
  },
  {
    name: "Turner Studio",
    slug: "turner-studio",
    type: "Interior Design",
    url: "https://turnerstudio.com.au",
    display: "turnerstudio.com.au",
    bg: "#e5ddd1",
    fg: "#2b2926",
    accent: "#7a6c5d",
  },
  {
    name: "Ending Loneliness Together",
    slug: "ending-loneliness",
    type: "Not-for-profit",
    url: "https://endingloneliness.com.au",
    display: "endingloneliness.com.au",
    bg: "#1d2a44",
    fg: "#f2ece0",
    accent: "#e8a87c",
  },
  {
    name: "JCDecaux Careers",
    slug: "jcdecaux-careers",
    type: "Media & Outdoor",
    url: "https://jcd-careers.com",
    display: "jcd-careers.com",
    bg: "#003d2e",
    fg: "#edf8f2",
    accent: "#00d18b",
  },
  {
    name: "Guilt Free Post",
    slug: "guilt-free",
    type: "Audio & Music Post House",
    url: "https://guiltfreepost.com",
    display: "guiltfreepost.com",
    bg: "#1a1410",
    fg: "#f2e8d8",
    accent: "#d9a24a",
  },
];

/** The year Macadamia was founded. Ticks the "X years independent" tagline
 *  over on 1 January of each new calendar year. */
export const FOUNDED_YEAR = 2009;

/** Whole calendar years since founding. Rolls over on Jan 1 because it's
 *  based purely on `getFullYear()` — no month/day math required. */
export function yearsIndependent(now: Date = new Date()): number {
  return now.getFullYear() - FOUNDED_YEAR;
}

const ONES = [
  "",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
];
const TEENS = [
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];

function numberToWord(n: number): string {
  if (n < 0) return String(n);
  if (n < 10) return ONES[n] || "zero";
  if (n < 20) return TEENS[n - 10];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    return o === 0 ? TENS[t] : `${TENS[t]}-${ONES[o]}`;
  }
  return String(n);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Build the tagline list with the current year count baked in.
 *  Each tagline is a string[] of one or more lines — the HomePage renders
 *  them stacked so the display can scale much larger than a single-line
 *  variant would allow. The "Sydney studio" tagline is deliberately
 *  three lines so "independent." wraps to its own line on mobile. */
export function getTaglines(now: Date = new Date()): string[][] {
  const n = yearsIndependent(now);
  const word = capitalize(numberToWord(n));
  return [
    ["Nice to meet you.", "We make websites."],
    ["Sydney studio.", `${word} years`, "independent."],
    ["Still here.", "Still making things", "we're proud of."],
    ["The quiet ones", "behind the screen."],
  ];
}
