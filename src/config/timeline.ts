/**
 * YOUGOLOUN — scroll timeline of the SPACE part (hero → Gulf → rings → dive into the clouds).
 * Every scroll timing of the 3D journey lives in this file.
 *
 * HOW IT WORKS
 * - Each section owns a "track" of `length` viewport-heights (vh) of scroll. Tracks follow each
 *   other with no gap, so the space part lasts Σ lengths. After the last track the page becomes a
 *   normal document (the light site, src/sections/light/*) — its length is its content.
 * - While its track is active, a section's stage (HTML + its moment of the 3D journey) holds the screen.
 * - Local progress `p` runs 0 → 1 across a track. Every key below is expressed in `p`.
 * - `content.enter` / `content.exit`: the `p` ranges where the section's HTML fades in / out.
 * - Phones (< mobileBreakpoint px wide) multiply each length by `mobileScale`.
 *
 * The light part starts right after the dive track. Its first block has a transparent top that
 * fades to paper, so it slides up over the white-out without an edge (see Arrival.tsx).
 */

export type Range = readonly [number, number];

export interface SectionConfig {
  id: SectionId;
  /** Scroll length in vh (desktop). */
  length: number;
  scaleOnMobile?: boolean;
  content: { enter: Range | null; exit: Range | null };
  keys?: Record<string, number | Range | readonly number[] | readonly Range[]>;
}

export type SectionId = 'home' | 'about' | 'cornerstones' | 'positioning';

const fade = { enter: [0, 0.12], exit: [0.86, 1] } as const;

export const timeline = {
  mobileScale: 0.7,
  mobileBreakpoint: 768,

  sections: [
    {
      id: 'home', // PDF §2 — Earth in space
      length: 100,
      content: { enter: null, exit: [0.3, 0.8] },
      keys: {
        /** Earth starts turning toward the Gulf as the hero text leaves. */
        earthTurn: [0.35, 1],
      },
    },
    {
      id: 'about', // PDF §3 — turning to the Gulf
      length: 120,
      content: fade,
      keys: { faceGulf: [0, 0.45], arcs: [0.2, 0.75], whispers: [0.35, 1] },
    },
    {
      id: 'cornerstones', // PDF §4 — four orbital rings
      length: 200,
      content: fade,
      keys: {
        rings: [[0.04, 0.2], [0.2, 0.36], [0.36, 0.52], [0.52, 0.68]],
        intersect: [0.72, 0.94],
      },
    },
    {
      id: 'positioning', // PDF §5 title — the dive into the clouds
      length: 200,
      // full length on phones too: the light document starts rising at p = 1 − 100/length,
      // so a shorter track would bring it up before the clouds are white
      scaleOnMobile: false,
      content: { enter: [0, 0.06], exit: [0.6, 0.76] },
      keys: {
        /** p at which the cloud cover is total (and stays total). */
        cover: 0.55,
        /** The fixed paper layer fades in over the white-out (hides postprocessing vignette/tone). */
        paper: [0.56, 0.78],
        /** Section text turns from light to dark as the clouds brighten. */
        textToDark: [0.26, 0.42],
        /** Altitude meter, km, counting down until the cover is total. */
        altitudeKm: [35786, 0],
      },
    },
  ] as const satisfies readonly SectionConfig[],
};

export type TimelineSection = (typeof timeline.sections)[number];

/** For reference only: global % of the space part each section occupies (desktop). */
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

/** Typed access to one section's config (and its keys). */
export function sectionConfig<I extends SectionId>(id: I) {
  return timeline.sections.find((s) => s.id === id) as Extract<TimelineSection, { id: I }>;
}
