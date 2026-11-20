/**
 * YOUGOLOUN — the scroll timeline. Every scroll timing lives in this file.
 *
 * HOW IT WORKS
 * - Each section owns a "track" of `length` viewport-heights (vh) of scroll.
 *   Tracks follow each other with no gap and no overlap, so:
 *       total scroll ≈ sum of all lengths + the footer (which scrolls in normally at the end).
 * - While its track is active, the section's stage (its HTML + its moment of the 3D journey)
 *   holds the full screen.
 * - Local progress `p` runs 0 → 1 across the track. Every key below is expressed in `p`.
 * - `content.enter` / `content.exit` are the `p` ranges in which the section's HTML fades in / out.
 *   Keep `exit` ending at or before 1 so a section's text is gone before the next one appears.
 * - Phones (< mobileBreakpoint px wide) multiply each length by `mobileScale`,
 *   unless the section sets `scaleOnMobile: false`.
 *
 * Keys marked (P2) / (P3) are consumed in Phase 2 / Phase 3.
 */

export type WorldId = 'space' | 'dive' | 'hail';
export type Range = readonly [number, number];

export interface SectionConfig {
  id: SectionId;
  /** Scroll length in vh (desktop). */
  length: number;
  /** Which 3D world the camera is in during this section. */
  world: WorldId;
  scaleOnMobile?: boolean;
  content: { enter: Range | null; exit: Range | null };
  keys?: Record<string, number | Range | readonly number[] | readonly Range[]>;
}

export type SectionId =
  | 'home'
  | 'about'
  | 'cornerstones'
  | 'positioning'
  | 'landing'
  | 'services'
  | 'portfolio'
  | 'process'
  | 'faq'
  | 'contact';

const fade = { enter: [0, 0.12], exit: [0.86, 1] } as const;

export const timeline = {
  mobileScale: 0.7,
  mobileBreakpoint: 768,

  sections: [
    {
      id: 'home', // PDF §2 — Earth in space
      length: 100,
      world: 'space',
      content: { enter: null, exit: [0.3, 0.8] },
      keys: {
        /** Earth starts turning toward the Gulf as the hero text leaves. (P2) */
        earthTurn: [0.35, 1],
      },
    },
    {
      id: 'about', // PDF §3 — turning to the Gulf
      length: 120,
      world: 'space',
      content: fade,
      keys: { faceGulf: [0, 0.45], arcs: [0.2, 0.75], whispers: [0.35, 1] }, // (P2/P3)
    },
    {
      id: 'cornerstones', // PDF §4 — four orbital rings
      length: 200,
      world: 'space',
      content: fade,
      keys: {
        rings: [[0.04, 0.2], [0.2, 0.36], [0.36, 0.52], [0.52, 0.68]],
        intersect: [0.72, 0.94],
      }, // (P2/P3)
    },
    {
      id: 'positioning', // PDF §5 — the dive
      length: 240,
      world: 'dive',
      content: { enter: [0, 0.06], exit: [0.9, 1] },
      keys: {
        /** p at which points 01 / 02 / 03 appear (attention up high → revenue on the ground). */
        stages: [0.1, 0.42, 0.74],
        /** Densest cloud cover — the globe→terrain swap happens here, hidden. */
        worldSwap: 0.6,
        /** Sky colour stops: space black → deep blue → golden hour. */
        sky: [0.2, 0.5, 0.85],
        /** Altitude meter, km, from start to end of the track. */
        altitudeKm: [35786, 0],
      }, // (P2)
    },
    {
      id: 'landing', // Hail — no PDF section; coordinates payoff
      length: 80,
      world: 'hail',
      content: { enter: [0.45, 0.6], exit: [0.88, 1] },
      keys: { terrainReveal: [0, 0.45], pinDrop: [0.25, 0.6], coords: [0.5, 0.8] }, // (P2)
    },
    {
      id: 'services', // PDF §6 — 12-position dial
      length: 240, // 12 × 20vh
      world: 'hail',
      content: { enter: [0, 0.06], exit: [0.94, 1] },
      keys: { dial: [0.04, 0.94] }, // the 12 services are spread evenly across this range (P3)
    },
    {
      id: 'portfolio', // PDF §7 — three projects
      length: 240, // 3 × 80vh
      world: 'hail',
      content: { enter: [0, 0.05], exit: [0.95, 1] },
      keys: { projects: [[0, 0.34], [0.33, 0.67], [0.66, 1]] }, // (P3)
    },
    {
      id: 'process', // PDF §8 — night route across the dunes
      length: 160,
      world: 'hail',
      content: fade,
      keys: { nightfall: [0, 0.3], route: [0.12, 0.88], milestones: [0.22, 0.42, 0.62, 0.82] }, // (P3)
    },
    {
      id: 'faq', // PDF §9 — calm night sky
      length: 100,
      world: 'hail',
      scaleOnMobile: false,
      content: { enter: [0, 0.15], exit: [0.9, 1] },
      keys: { tiltToSky: [0, 0.35] }, // (P3)
    },
    {
      id: 'contact', // PDF §10 — rise back to space; footer scrolls in after
      length: 100,
      world: 'space',
      scaleOnMobile: false,
      content: { enter: [0.35, 0.6], exit: null },
      keys: { rise: [0, 0.6], earthReveal: [0.4, 1] }, // (P2)
    },
  ] as const satisfies readonly SectionConfig[],
};

export type TimelineSection = (typeof timeline.sections)[number];

/** For reference only: global % of the scroll each section occupies (desktop, footer excluded). */
export function globalRanges() {
  const total = timeline.sections.reduce((a, s) => a + s.length, 0);
  let acc = 0;
  return timeline.sections.map((s) => {
    const from = (acc / total) * 100;
    acc += s.length;
    return { id: s.id, from: +from.toFixed(1), to: +((acc / total) * 100).toFixed(1) };
  });
}

/** Map p within [a, b] to 0..1, clamped. */
export const rangeProgress = (p: number, [a, b]: Range) => (b === a ? (p >= b ? 1 : 0) : Math.min(1, Math.max(0, (p - a) / (b - a))));
